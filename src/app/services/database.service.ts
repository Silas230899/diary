import { Injectable } from '@angular/core';
import Database from "@tauri-apps/plugin-sql";
import {CryptoService} from "./crypto.service";

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private db: Database | null = null;
  
  constructor(private crypto: CryptoService) {}

  async init(): Promise<void> {
    const cryptoInitialization = this.crypto.init()
    
    this.db = await this.connectToDatabase()
    
    const entryTableCreation = this.db.execute("CREATE TABLE IF NOT EXISTS entry(" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "date DATE, " +
      "written DATETIME, " +
      "entryIndex INTEGER," +
      "text TEXT," +
      "sync BOOLEAN)")
    
    /*
    const imageTableCreation = this.db.execute("CREATE TABLE IF NOT EXISTS image(" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "imageData TEXT," +
      "sync BOOLEAN)")
    */
    
    await Promise.all([cryptoInitialization, entryTableCreation])
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
  
}

export function initDbFactory(dbService: DatabaseService): () => Promise<void> {
  return () => dbService.init();
}
