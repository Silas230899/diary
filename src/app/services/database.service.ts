import {Injectable} from '@angular/core';
import Database from "@tauri-apps/plugin-sql";
import {CryptoService} from "./crypto.service";
import {ImageView} from "../models/image-view";
import {BaseDirectory, create, exists, mkdir, readFile, remove} from "@tauri-apps/plugin-fs";
import {EntryViewRecord} from "../models/entry-view-record";
import {ImageDb} from "../models/image-db";
import {EntryDbRecord} from "../models/entry-db-record";
import {SyncStatus} from "../models/syncStatusTypes";
import {CustomDatetimeValue} from "../components/custom-datetime/custom-datetime-value";

type EntryRow = {
  uuidv7: string,
  date: string,
  written: string | null,
  writtenHasTime: string, // technical debt - is string in db
  entryIndex: number,
  text: string,
  referencedImages: string,
  syncStatus: SyncStatus,
  driveFileId: string
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private db: Database | null = null;
  
  specificDateCache: Map<string, EntryRow[]> = new Map()
  dateCache: Map<string, EntryRow[]> = new Map()
  
  constructor(private crypto: CryptoService) {}
  
  async init(): Promise<void> {
    this.db = await this.connectToDatabase()
    
    const entryTableCreation = this.db.execute("CREATE TABLE IF NOT EXISTS entry(" +
      "uuidv7 TEXT PRIMARY KEY NOT NULL, " +
      "date TEXT NOT NULL, " +
      "written TEXT, " +
      "writtenHasTime BOOLEAN, " +
      "entryIndex INTEGER NOT NULL," +
      "text TEXT NOT NULL," +
      "referencedImages TEXT NOT NULL," +
      "syncStatus TEXT NOT NULL," +
      "driveFileId TEXT)")
    
    const dirExists = await exists("images", { baseDir: BaseDirectory.AppData })
    if(!dirExists) await mkdir("images", { baseDir: BaseDirectory.AppData })
    
    await entryTableCreation
  }
  
  private async connectToDatabase(): Promise<Database> {
    return Database.load("sqlite:diary.db")
  }
  
  get database(): Database {
    if (!this.db) {
      throw new Error('DatabaseService not initialized');
    }
    return this.db;
  }
  
  private invalidateCaches() {
    this.specificDateCache = new Map()
    this.dateCache = new Map()
  }
  
  async imageFileExists(filename: string) {
    return await exists("images/" + filename, { baseDir: BaseDirectory.AppData })
  }
  
  async addImage(image: ImageDb) {
    const file = await create("images/" + image.filename, { baseDir: BaseDirectory.AppData })
    const fileArrayBuffer = await image.imageData.arrayBuffer()
    const encryptedFile = await this.crypto.encryptArrayBufferToArrayBuffer(fileArrayBuffer)
    await file.write(encryptedFile)
    await file.close()
  }
  
  async insertRawImage(image: ImageDb) {
    const file = await create("images/" + image.filename, { baseDir: BaseDirectory.AppData })
    const fileArrayBuffer = await image.imageData.arrayBuffer()
    await file.write(new Uint8Array(fileArrayBuffer))
    await file.close()
  }
  
  async getImageObjectURL(name: string) {
    const decryptedImageFile = await this.getDBImage(name)
    return URL.createObjectURL(decryptedImageFile.imageData)
  }
  
  async getDBImage(name: string) {
    const encryptedImageFile = await readFile("images/" + name, { baseDir: BaseDirectory.AppData })
    const decryptedImageFile = await this.crypto.decryptUint8ArrayToArrayBuffer(encryptedImageFile)
    return new ImageDb(name, new Blob([decryptedImageFile]))
  }
  
  async getRawDBImage(name: string) {
    const encryptedImageFile = await readFile("images/" + name, { baseDir: BaseDirectory.AppData })
    return new ImageDb(name, new Blob([encryptedImageFile]))
  }
  
  async deleteImage(filename: string) {
    await remove("images/" + filename, { baseDir: BaseDirectory.AppData })
  }
  
  async addEntry(entry: EntryDbRecord) {
    const referencedImagesString = entry.referencedImages.join(",")
    const encryptedText = await this.crypto.encryptStringToBase64String(entry.text)
    await this.database.execute(`
        INSERT into entry (uuidv7, date, written, writtenHasTime, entryIndex, text, referencedImages, syncStatus, driveFileId)
        VALUES ($1, date($2), datetime($3), $4, $5, $6, $7, $8, $9)`,
        [entry.uuidv7, entry.date, entry.written, entry.writtenHasTime, entry.entryIndex, encryptedText, referencedImagesString, entry.syncStatus, entry.driveFileId]
    );
    this.invalidateCaches()
  }
  
  async insertRawEntry(entry: EntryDbRecord) {
    const referencedImagesString = entry.referencedImages.join(",")
    try {
      await this.database.execute(`
        INSERT into entry (uuidv7, date, written, writtenHasTime, entryIndex, text, referencedImages, syncStatus, driveFileId)
        VALUES ($1, date($2), datetime($3), $4, $5, $6, $7, $8, $9)`,
        [entry.uuidv7, entry.date, entry.written, entry.writtenHasTime, entry.entryIndex, entry.text, referencedImagesString, entry.syncStatus, entry.driveFileId]
      );
    } catch (e) {
      console.log("uuid: " + entry.uuidv7)
      console.error(e)
      throw e
    }
    this.invalidateCaches()
  }
  
  async deleteEntry(uuidv7: string) {
    await this.database.execute(`
        DELETE FROM entry WHERE uuidv7 = $1`,
        [uuidv7]
    )
    this.invalidateCaches()
  }
  
  async deleteEntryByDriveFileId(driveFileId: string) {
    const res = await this.database.execute("DELETE FROM entry WHERE driveFileId = $1", [driveFileId])
    this.invalidateCaches()
    return res.rowsAffected
  }
  
  async getMaxEntryIndexForDate(date: string) {
    const res = await this.database.select(`
        SELECT MAX(entryIndex) AS entryIndex
        FROM entry
        WHERE date = date($1)`,
        [date]
    )
    // @ts-ignore
    const currentMax = res[0].entryIndex
    return currentMax + 1
  }
  
  /**
   * does not return entries that are marked as pending_delete
   */
  async getEntriesByDate(date: CustomDatetimeValue) {
    const dateAsString = date.month.toString().padStart(2, "0") + "-" + date.day.toString().padStart(2, "0")
    let res: EntryRow[]
    const cacheResult = this.dateCache.get(dateAsString)
    if(cacheResult !== undefined) {
      res = cacheResult
    } else {
      res = await this.queryDate(dateAsString)
      this.dateCache.set(dateAsString, res)
    }
    //const res: any[] = await this.database.select("SELECT * FROM entry WHERE strftime('%m-%d', date) = $1 AND syncStatus != 'pending_delete'", [dateAsString])
    return await this.transformEntryDatabaseResultsToEntryViewRecords(res)
  }
  
  async preloadDate(date: CustomDatetimeValue) {
    const dateAsString = date.month.toString().padStart(2, "0") + "-" + date.day.toString().padStart(2, "0")
    if(!this.dateCache.has(dateAsString)) {
      const res: any[] = await this.queryDate(dateAsString)
      this.dateCache.set(dateAsString, res)
    }
  }
  
  private queryDate(date: string) {
    return this.database.select<EntryRow[]>(`
      SELECT *
      FROM entry
      WHERE strftime('%m-%d', date) = $1 AND syncStatus != 'pending_delete'`,
      [date])
  }
  
  async getAllUnsyncedSyncEntriesRaw() {
    const res = await this.database.select<EntryRow[]>(`
      SELECT *
      FROM entry
      WHERE (syncStatus = 'pending_upload' OR syncStatus = 'pending_delete')`
    )
    return res.map(entry => this.entryRowToRawEntryDbRecord(entry))
  }
  
  private entryRowToRawEntryDbRecord(row: EntryRow): EntryDbRecord {
    const referencedImages = row["referencedImages"]
    const referencedImagesArray = this.transformReferencedImageStringToArray(referencedImages)
    
    return new EntryDbRecord(
      row["uuidv7"],
      new Date(row["date"]).toISOString(),
      this.writtenDateToIsoString(row["written"]),
      this.dbBooleanStringToBoolean(row["writtenHasTime"]),
      row["entryIndex"],
      row["text"],
      referencedImagesArray,
      row["syncStatus"],
      row["driveFileId"]
    )
  }
  
  private transformReferencedImageStringToArray(referencedImages: string) {
    return referencedImages.length === 0 ? [] : referencedImages.split(",")
  }
  
  async setDriveFileId(uuidv7: string, driveFileId: string) {
    await this.database.select("UPDATE entry SET driveFileId = $1 WHERE uuidv7 = $2", [driveFileId, uuidv7])
    this.invalidateCaches()
  }
  
  async setSyncStatus(uuidv7: string, syncStatus: SyncStatus) {
    await this.database.select("UPDATE entry SET syncStatus = $1 WHERE uuidv7 = $2", [syncStatus, uuidv7])
    this.invalidateCaches()
  }
  
  async entryExistsWithDriveFileId(driveFileId: string) {
    const res = (await this.database.select("SELECT * FROM entry WHERE driveFileId = $1", [driveFileId])) as any[]
    if(res.length > 1) throw new Error("Darf nur 0 oder 1 sein")
    return res.length === 1
  }
  
  async getRawEntryByDriveFileId(id: string) {
    const res = await this.database.select<EntryRow[]>(`
        SELECT *
        FROM entry
        WHERE driveFileId = $1`,
        [id])
    if(res.length === 0) return null;
    else return this.entryRowToRawEntryDbRecord(res[0])
  }
  
  private writtenDateToIsoString(source: string | null) {
    if(source === null) return null
    else {
      let written = new Date(source)
      written = new Date(written.getTime() - written.getTimezoneOffset()*60*1000)
      return written.toISOString()
    }
  }
  
  async getHeatmapData() {
    const res: any[] = await this.database.select("SELECT date, COUNT(*) AS count FROM entry WHERE syncStatus != 'pending_delete' GROUP BY date")
    return res
  }
  
  async getAllEntriesRaw() {
    const res: any[] = await this.database.select<EntryRow[]>("SELECT * FROM entry")
    return res.map(entry => this.entryRowToRawEntryDbRecord(entry))
  }
  
  /**
   * doesnt return pending_delete entries
   */
  async getAllEntries() {
    const res = await this.database.select<EntryRow[]>(`
        SELECT *
        FROM entry
        WHERE syncStatus != 'pending_delete'`
    )
    const rawEntries = res.map(entry => this.entryRowToRawEntryDbRecord(entry))
    const decryptedEntryPromises = rawEntries.map(async entry => {
      entry.text = await this.crypto.decryptBase64StringToString(entry.text) // text decryption
      return entry
    })
    return Promise.all(decryptedEntryPromises)
  }
  
  private dbBooleanStringToBoolean(dbBooleanString: string) {
    if(dbBooleanString === "true") return true
    else if(dbBooleanString === "false") return false
    else return null
  }
  
  /**
   * does not return entries that are marked as pending_delete
   */
  async getEntriesBySpecificDate(date: string) {
    let res: EntryRow[]
    if(this.specificDateCache.has(date)) {
      res = this.specificDateCache.get(date)!
    } else {
      res = await this.querySpecificDay(date)
      this.specificDateCache.set(date, res)
    }
    return await this.transformEntryDatabaseResultsToEntryViewRecords(res)
  }
  
  async preloadSpecificDate(date: string) {
    if(!this.specificDateCache.has(date)) {
      const res = await this.querySpecificDay(date)
      this.specificDateCache.set(date, res)
    }
  }
  
  private querySpecificDay(date: string) {
    return this.database.select<EntryRow[]>(`
        SELECT *
        FROM entry
        WHERE date = date($1) AND syncStatus != 'pending_delete'`,
        [date])
  }
  
  async getEntryByUuid(uuid: string) {
    const res = await this.database.select<EntryRow[]>(`
        SELECT *
        FROM entry
        WHERE uuidv7 = $1`,
        [uuid])
    return await this.transformEntryDatabaseResultsToEntryViewRecords(res)
  }
  
  /**
   * does not return entries that are marked as pending_delete
   */
  private async transformEntryDatabaseResultsToEntryViewRecords(databaseRecords: EntryRow[]) {
    const entryDbRecords = databaseRecords.map(entry => this.entryRowToRawEntryDbRecord(entry))
    const entryViewRecordPromises = entryDbRecords.map(async entry => {
      const decryptedText = await this.crypto.decryptBase64StringToString(entry.text)
      const imagePromises = entry.referencedImages.map(async imageName => {
        try {
          const img = await this.getImageObjectURL(imageName);
          return new ImageView(imageName, img);
        } catch {
          return null; // Fehler → später rausfiltern
        }
      });
      const results = await Promise.all(imagePromises);
      const images: ImageView[] = results.filter((imageResult): imageResult is ImageView => imageResult !== null);
      return new EntryViewRecord(
        entry.uuidv7,
        entry.date,
        entry.written,
        entry.writtenHasTime,
        entry.entryIndex,
        decryptedText,
        images,
        entry.syncStatus,
        entry.driveFileId)
    })
    return await Promise.all(entryViewRecordPromises)
  }
  
  async clearDb() {
    await this.database.select("DELETE FROM entry")
  }
}

export async function initDbFactory(dbService: DatabaseService) {
  return await dbService.init();
}
