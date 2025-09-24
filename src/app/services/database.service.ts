import { Injectable } from '@angular/core';
import Database from "@tauri-apps/plugin-sql";
import {CryptoService} from "./crypto.service";
import {NewEntry} from "../models/new-entry";
import {ImageView} from "../models/image-view";
import {BaseDirectory, create, exists, mkdir, readFile, remove} from "@tauri-apps/plugin-fs";
import {EntryViewRecord} from "../models/entry-view-record";
import {ImageDb} from "../models/image-db";
import {EntryDbRecord} from "../models/entry-db-record";

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
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "date DATE, " +
      "written DATETIME, " +
      "entryIndex INTEGER," +
      "text TEXT," +
      "sync BOOLEAN," +
      "referencedImages TEXT," +
      "syncStatus TEXT DEFAULT 'pending_create'," +
      "driveFileId TEXT DEFAULT NULL)")
    
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
  
  private async getImage(name: string) {
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
  
  async deleteImage(filename: string) {
    await remove("images/" + filename, { baseDir: BaseDirectory.AppData })
  }
  
  async addEntry(entry: NewEntry) {
    const referencedImagesString = entry.referencedImages.join(",")
    const encryptedText = await this.crypto.encryptStringToBase64String(entry.text)
    await this.database.execute(
      `INSERT into entry (date, written, entryIndex, text, sync, referencedImages)
      VALUES (date($1), datetime($2), $3, $4, $5, $6)`,
      [entry.date, entry.written, entry.entryIndex, encryptedText, entry.sync, referencedImagesString]
    );
    this.entries.delete(entry.date) // TODO verbessern
  }
  
  async insertEntry(entry: EntryDbRecord) {
    const encryptedText = await this.crypto.encryptStringToBase64String(entry.text)
    const referencedImagesString = entry.referencedImages.join(",")
    await this.database.execute(
      `INSERT into entry (id, date, written, entryIndex, text, sync, referencedImages, syncStatus, driveFileId)
      VALUES ($1, date($2), datetime($3), $4, $5, $6, $7, $8, $9)`,
      [entry.id, entry.date, entry.written, entry.entryIndex, encryptedText, entry.sync, referencedImagesString, entry.syncStatus, entry.driveFileId]
    );
  }
  
  async deleteEntry(id: number) {
    await this.database.execute("DELETE FROM entry WHERE id = $1", [id])
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
  
  async getEntriesByDate(date: string) {
    let entries: EntryViewRecord[] = []
    const res = await this.database.select("SELECT * FROM entry WHERE strftime('%m-%d', date) = strftime('%m-%d', '$1')", [date])
    for(const entry of res as any[]) {
      const decryptedText = await this.crypto.decryptBase64StringToString(entry["text"])
      const referencedImages = (entry["referencedImages"] as string).length === 0 ? [] : (entry["referencedImages"] as string).split(",")
      const imagePromises: Promise<ImageView>[] = referencedImages.map(async (imageName) => {
        const imageFile = await readFile("images/" + imageName, { baseDir: BaseDirectory.AppData })
        const base64ImageData = "data:image/png;base64," + this.byteArrayToBase64(imageFile)
        return new ImageView(imageName, base64ImageData)
      })
      
      const images: ImageView[] = await Promise.all(imagePromises)
      
      const entryObject = new EntryViewRecord(
        entry["id"],
        entry["date"],
        entry["written"],
        entry["entryIndex"],
        decryptedText,
        entry["sync"],
        images,
        entry["syncStatus"],
        entry["driveFileId"])
      
      entries.push(entryObject)
    }
    return entries
  }
  
  private getFileExtension(filename: string): string | null {
    const index = filename.lastIndexOf(".");
    return index !== -1 ? filename.slice(index + 1) : null;
  }
  
  async getAllUnsyncedSyncEntries() {
    const res = await this.database.select("SELECT * FROM entry WHERE (syncStatus = 'pending_create' OR syncStatus = 'pending_delete') AND sync = 'true'")
    const entryPromises: Promise<EntryDbRecord>[] = (res as any[]).map(async entry => {
      const decryptedText = await this.crypto.decryptBase64StringToString(entry["text"])
      const referencedImages = (entry["referencedImages"] as string).length === 0 ? [] : (entry["referencedImages"] as string).split(",")
      return new EntryDbRecord(
        entry["id"],
        entry["date"],
        entry["written"],
        entry["entryIndex"],
        decryptedText,
        entry["sync"],
        referencedImages,
        entry["syncStatus"],
        entry["driveFileId"])
    })
    return Promise.all(entryPromises)
  }
  
  async setDriveFileId(id: number, driveFileId: string) {
    await this.database.select("UPDATE entry SET driveFileId = $1 WHERE id = $2", [driveFileId, id])
  }
  
  async setSyncStatus(id: number, syncStatus: "pending_create" | "synced" | "pending_delete") {
    await this.database.select("UPDATE entry SET syncStatus = $1 WHERE id = $2", [syncStatus, id])
  }
  
  async entryExistsWithDriveFileId(driveFileId: string) {
    const res = (await this.database.select("SELECT * FROM entry WHERE driveFileId = $1", [driveFileId])) as any[]
    if(res.length > 1) throw new Error("Darf nur 0 oder 1 sein")
    return res.length === 1
  }
  
  async getEntryByDriveFileId(id: string) {
    const res = (await this.database.select("SELECT * FROM entry WHERE driveFileId = $1", [id])) as any[]
    if(res.length === 0) return null;
    
    const entry = res[0]
    const decryptedText = await this.crypto.decryptBase64StringToString(entry["text"])
    const referencedImages = (entry["referencedImages"] as string).length === 0 ? [] : (entry["referencedImages"] as string).split(",")
    return new EntryDbRecord(
      entry["id"],
      entry["date"],
      entry["written"],
      entry["entryIndex"],
      decryptedText,
      entry["sync"],
      referencedImages,
      entry["syncStatus"],
      entry["driveFileId"])
  }
  
  /**
   * does not return entries that are marked as pending_delete
   */
  async getEntriesBySpecificDate(date: string) {
    if(!this.entries.has(date)) {
      const res = await this.database.select("SELECT * FROM entry WHERE date = date($1) AND syncStatus != 'pending_delete'", [date])
      const entryPromises: Promise<EntryViewRecord>[] = (res as any[]).map(async entry => {
        const decryptedText = await this.crypto.decryptBase64StringToString(entry["text"])
        const referencedImages = (entry["referencedImages"] as string).length === 0 ? [] : (entry["referencedImages"] as string).split(",")
        const imagePromises: Promise<ImageView>[] = referencedImages.map(async (imageName) => {
          return new ImageView(imageName, await this.getImage(imageName))
        })
        const images: ImageView[] = await Promise.all(imagePromises)
        return new EntryViewRecord(
          entry["id"],
          entry["date"],
          entry["written"],
          entry["entryIndex"],
          decryptedText,
          entry["sync"],
          images,
          entry["syncStatus"],
          entry["driveFileId"])
      })
      const entries = await Promise.all(entryPromises)
      this.entries.set(date, entries)
    } else console.log("entry cash hit")
    return this.entries.get(date)!
  }
  
  byteArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary); // btoa() gibt Base64 zurück
  }
  
}

export async function initDbFactory(dbService: DatabaseService) {
  return await dbService.init();
}
