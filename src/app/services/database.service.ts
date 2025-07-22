import { Injectable } from '@angular/core';
import Database from "@tauri-apps/plugin-sql";

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private db: Database | null = null;

  async init(): Promise<void> {
    this.db = await this.connectToDatabase();
    await this.db.execute("CREATE TABLE IF NOT EXISTS entry(" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "date DATE, " +
        "written DATETIME, " +
        "text TEXT)")
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

  private buff_to_base64 = (buff: Uint8Array) => btoa(
      new Uint8Array(buff).reduce(
          (data, byte) => data + String.fromCharCode(byte), ''
      )
  );

  private base64_to_buf = (b64: string) =>
      // @ts-ignore
      Uint8Array.from(atob(b64), (c) => c.charCodeAt(null));

  private enc = new TextEncoder();
  private dec = new TextDecoder();

  private getPasswordKey = (password: string) =>
      window.crypto.subtle.importKey("raw", this.enc.encode(password), "PBKDF2", false, [
        "deriveKey",
      ]);

  private deriveKey = (passwordKey: CryptoKey, salt: Uint8Array, keyUsage: [KeyUsage]) =>
      window.crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: salt,
            iterations: 250000,
            hash: "SHA-256",
          },
          passwordKey,
          { name: "AES-GCM", length: 256 },
          false,
          keyUsage
      );

  async encryptData(secretData: string, password: string) {
    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const passwordKey = await this.getPasswordKey(password);
      const aesKey = await this.deriveKey(passwordKey, salt, ["encrypt"]);
      const encryptedContent = await window.crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv: iv,
          },
          aesKey,
          this.enc.encode(secretData)
      );

      const encryptedContentArr = new Uint8Array(encryptedContent);
      let buff = new Uint8Array(
          salt.byteLength + iv.byteLength + encryptedContentArr.byteLength
      );
      buff.set(salt, 0);
      buff.set(iv, salt.byteLength);
      buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
      const base64Buff = this.buff_to_base64(buff);
      return base64Buff;
    } catch (e) {
      console.log(`Error - ${e}`);
      return "";
    }
  }

  async decryptData(encryptedData: string, password: string) {
    try {
      const encryptedDataBuff = this.base64_to_buf(encryptedData);
      const salt = encryptedDataBuff.slice(0, 16);
      const iv = encryptedDataBuff.slice(16, 16 + 12);
      const data = encryptedDataBuff.slice(16 + 12);
      const passwordKey = await this.getPasswordKey(password);
      const aesKey = await this.deriveKey(passwordKey, salt, ["decrypt"]);
      const decryptedContent = await window.crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: iv,
          },
          aesKey,
          data
      );
      return this.dec.decode(decryptedContent);
    } catch (e) {
      console.log(`Error - ${e}`);
      return "";
    }
  }

}

export function initDbFactory(dbService: DatabaseService): () => Promise<void> {
  return () => dbService.init();
}
