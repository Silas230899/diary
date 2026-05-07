import { Injectable } from '@angular/core';
import Database from "@tauri-apps/plugin-sql";
import {CryptoService} from "./crypto.service";
import {ImageView} from "../models/image-view";
import {BaseDirectory, create, exists, mkdir, readFile, remove} from "@tauri-apps/plugin-fs";
import {EntryViewRecord} from "../models/entry-view-record";
import {ImageDb} from "../models/image-db";
import {EntryDbRecord} from "../models/entry-db-record";
import {SyncStatus} from "../models/syncStatusTypes";

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private db: Database | null = null;
  
  private entries = new Map<string, EntryViewRecord[]>
  private images = new Map<string, string>
  
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
  
  async imageFileExists(filename: string) {
    return await exists("images/" + filename, { baseDir: BaseDirectory.AppData })
  }
  
  async addImage(image: ImageDb) {
    const file = await create("images/" + image.filename, { baseDir: BaseDirectory.AppData })
    const fileArrayBuffer = await image.imageData.arrayBuffer()
    const encryptedFile = await this.crypto.encryptArrayBufferToArrayBuffer(fileArrayBuffer)
    const localImageUrl = URL.createObjectURL(image.imageData)
    this.images.set(image.filename, localImageUrl)
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
    if(!this.images.has(name)) {
      const encryptedImageFile = await readFile("images/" + name, { baseDir: BaseDirectory.AppData })
      const decryptedImageFile = await this.crypto.decryptUint8ArrayToArrayBuffer(encryptedImageFile)
      const localImageUrl = URL.createObjectURL(new Blob([decryptedImageFile]))
      this.images.set(name, localImageUrl)
    }
    return this.images.get(name)!
  }
  
  async getDBImage(name: string) {
    const encryptedImageFile = await readFile("images/" + name, { baseDir: BaseDirectory.AppData })
    const decryptedImageFile = await this.crypto.decryptUint8ArrayToArrayBuffer(encryptedImageFile)
    return new ImageDb(name, new Blob([decryptedImageFile]))
  }
  
  async getRawDBImage(name: string) {
    const encryptedImageFile = await readFile("images/" + name, { baseDir: BaseDirectory.AppData })
    //const decryptedImageFile = await this.crypto.decryptUint8ArrayToArrayBuffer(encryptedImageFile)
    return new ImageDb(name, new Blob([encryptedImageFile]))
  }
  
  async deleteImage(filename: string) {
    await remove("images/" + filename, { baseDir: BaseDirectory.AppData })
  }
  
  async addEntry(entry: EntryDbRecord) {
    const referencedImagesString = entry.referencedImages.join(",")
    const encryptedText = await this.crypto.encryptStringToBase64String(entry.text)
    await this.database.execute(
      `INSERT into entry (uuidv7, date, written, writtenHasTime, entryIndex, text, referencedImages, syncStatus, driveFileId)
      VALUES ($1, date($2), datetime($3), $4, $5, $6, $7, $8, $9)`,
      [entry.uuidv7, entry.date, entry.written, entry.writtenHasTime, entry.entryIndex, encryptedText, referencedImagesString, entry.syncStatus, entry.driveFileId]
    );
    this.entries.delete(entry.date) // TODO verbessern
  }
  
  async insertRawEntry(entry: EntryDbRecord) {
    const referencedImagesString = entry.referencedImages.join(",")
    try {
      await this.database.execute(
        `INSERT into entry (uuidv7, date, written, writtenHasTime, entryIndex, text, referencedImages, syncStatus, driveFileId)
      VALUES ($1, date($2), datetime($3), $4, $5, $6, $7, $8, $9)`,
        [entry.uuidv7, entry.date, entry.written, entry.writtenHasTime, entry.entryIndex, entry.text, referencedImagesString, entry.syncStatus, entry.driveFileId]
      );
    } catch (e) {
      console.log("uuid: " + entry.uuidv7)
      console.error(e)
      throw e
    }
  }
  
  async deleteEntry(uuidv7: string) {
    await this.database.execute("DELETE FROM entry WHERE uuidv7 = $1", [uuidv7])
    this.entries.clear() // muss verbessert werden
  }
  
  async deleteEntryByDriveFileId(driveFileId: string) {
    const res = await this.database.execute("DELETE FROM entry WHERE driveFileId = $1", [driveFileId])
    const affectedRows = res.rowsAffected
    if(affectedRows > 0) this.entries.clear() // muss verbessert werden
    return affectedRows
  }
  
  async getMaxEntryIndexForDate(date: string) {
    const res = await this.database.select("SELECT MAX(entryIndex) AS entryIndex FROM entry WHERE date = date($1)", [date])
    // @ts-ignore
    const currentMax = res[0].entryIndex
    return currentMax + 1
  }
  
  /**
   * does not return entries that are marked as pending_delete
   */
  async getEntriesByDate(date: string) {
    const res: any[] = await this.database.select("SELECT * FROM entry WHERE strftime('%m-%d', date) = strftime('%m-%d', $1) AND syncStatus != 'pending_delete'", [date])
    return await this.transformEntryDatabaseResultsToEntryViewRecords(res)
  }
  
  private getFileExtension(filename: string): string | null {
    const index = filename.lastIndexOf(".");
    return index !== -1 ? filename.slice(index + 1) : null;
  }
  
  async getAllUnsyncedSyncEntriesRaw() {
    const res = await this.database.select("SELECT * FROM entry WHERE (syncStatus = 'pending_upload' OR syncStatus = 'pending_delete')")
    const entryPromises: Promise<EntryDbRecord>[] = (res as any[]).map(async entry => {
      const referencedImages = (entry["referencedImages"] as string).length === 0 ? [] : (entry["referencedImages"] as string).split(",")
      return new EntryDbRecord(
        entry["uuidv7"],
        new Date(entry["date"]).toISOString(),
        this.writtenDateToIsoString(entry["written"]),
        entry["writtenHasTime"],
        entry["entryIndex"],
        entry["text"],
        referencedImages,
        entry["syncStatus"],
        entry["driveFileId"])
    })
    return Promise.all(entryPromises)
  }
  
  async setDriveFileId(uuidv7: string, driveFileId: string) {
    await this.database.select("UPDATE entry SET driveFileId = $1 WHERE uuidv7 = $2", [driveFileId, uuidv7])
  }
  
  async setSyncStatus(uuidv7: string, syncStatus: SyncStatus) {
    await this.database.select("UPDATE entry SET syncStatus = $1 WHERE uuidv7 = $2", [syncStatus, uuidv7])
  }
  
  async entryExistsWithDriveFileId(driveFileId: string) {
    const res = (await this.database.select("SELECT * FROM entry WHERE driveFileId = $1", [driveFileId])) as any[]
    if(res.length > 1) throw new Error("Darf nur 0 oder 1 sein")
    return res.length === 1
  }
  
  async getRawEntryByDriveFileId(id: string) {
    const res = (await this.database.select("SELECT * FROM entry WHERE driveFileId = $1", [id])) as any[]
    if(res.length === 0) return null;
    
    const entry = res[0]
    const rawText = entry["text"]
    const referencedImages = (entry["referencedImages"] as string).length === 0 ? [] : (entry["referencedImages"] as string).split(",")
    return new EntryDbRecord(
      entry["uuidv7"],
      new Date(entry["date"]).toISOString(),
      this.writtenDateToIsoString(entry["written"]),
      entry["writtenHasTime"],
      entry["entryIndex"],
      rawText,
      referencedImages,
      entry["syncStatus"],
      entry["driveFileId"])
  }
  
  private transformReferencedImageStringToArray(referencedImages: string) {
    return referencedImages.length === 0 ? [] : referencedImages.split(",")
  }
  
  private writtenDateToIsoString(source: string | null) {
    if(source === null) return null
    else {
      let written = new Date(source)
      written = new Date(written.getTime() - written.getTimezoneOffset()*60*1000)
      return written.toISOString()
    }
  }
  
  /**
   * doesnt return pending_delete entries
   */
  async getAllEntries() {
    const res: any[] = await this.database.select("SELECT * FROM entry WHERE syncStatus != 'pending_delete'")
    const entriesPromises = res.map(async entry => {
      const decryptedText = await this.crypto.decryptBase64StringToString(entry["text"])
      const referencedImages = this.transformReferencedImageStringToArray(entry["referencedImages"])
      return new EntryDbRecord(
        entry["uuidv7"],
        new Date(entry["date"]).toISOString(),
        this.writtenDateToIsoString(entry["written"]),
        entry["writtenHasTime"],
        entry["entryIndex"],
        decryptedText,
        referencedImages,
        entry["syncStatus"],
        entry["driveFileId"])
    })
    const entries = Promise.all(entriesPromises)
    return entries
  }
  
  /**
   * does not return entries that are marked as pending_delete
   */
  async getEntriesBySpecificDate(date: string) {
    /*
    if(!this.entries.has(date)) {
      
      this.entries.set(date, entries)
    } else console.log("entry cash hit")
    return this.entries.get(date)!
    */
    const res: any[] = await this.database.select("SELECT * FROM entry WHERE date = date($1) AND syncStatus != 'pending_delete'", [date])
    return await this.transformEntryDatabaseResultsToEntryViewRecords(res)
  }
  
  async getEntryByUuid(uuid: string) {
    const res: any[] = await this.database.select("SELECT * FROM entry WHERE uuidv7 = $1", [uuid])
    return await this.transformEntryDatabaseResultsToEntryViewRecords(res)
  }
  
  /**
   * does not return entries that are marked as pending_delete
   */
  private async transformEntryDatabaseResultsToEntryViewRecords(databaseRecords: any[]) {
    const entries = databaseRecords.map(async entry => {
      const decryptedText = await this.crypto.decryptBase64StringToString(entry["text"])
      const referencedImages = this.transformReferencedImageStringToArray(entry["referencedImages"])
      const imagePromises = referencedImages.map(async (imageName) => {
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
        entry["uuidv7"],
        new Date(entry["date"]).toISOString(),
        this.writtenDateToIsoString(entry["written"]),
        entry["writtenHasTime"],
        entry["entryIndex"],
        decryptedText,
        images,
        entry["syncStatus"],
        entry["driveFileId"])
    })
    return await Promise.all(entries)
  }
  
  async clearDb() {
    await this.database.select("DELETE FROM entry")
  }
}

export async function initDbFactory(dbService: DatabaseService) {
  return await dbService.init();
}
