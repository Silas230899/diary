import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  
  private masterKeyRaw: ArrayBuffer | null = null; // 32 Byte Master-Key aus Argon2
  
  private enc = new TextEncoder();
  private dec = new TextDecoder();
  
  async init() {
    const salt = this.hexToUint8Array("129d8891895ed1d58cb5f8c2c9a4fa51")
    
    await this.initMasterKey("silas", salt)
  }
  
  hexToUint8Array(hex: string): Uint8Array {
    // Optional: führendes "0x" entfernen
    if (hex.startsWith("0x")) {
      hex = hex.slice(2);
    }
    
    // Länge prüfen
    if (hex.length % 2 !== 0) {
      throw new Error("Hex-String muss gerade Anzahl von Zeichen haben");
    }
    
    const len = hex.length / 2;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    
    return bytes;
  }
  
  // === 1) Master-Key einmal aus Passwort ableiten ===
  private async initMasterKey(password: string, salt: Uint8Array): Promise<void> {
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      this.enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    
    const masterKeyBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 250_000,
        hash: "SHA-256"
      },
      passwordKey,
      256 // 256 bit = 32 Byte
    );
    
    this.masterKeyRaw = masterKeyBits;
  }
  
  // === 2) HKDF pro Datei ableiten ===
  private async deriveFileKey(fileId: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> {
    if (!this.masterKeyRaw) throw new Error("Master-Key nicht initialisiert!");
    
    const masterKeyImported = await crypto.subtle.importKey(
      "raw",
      this.masterKeyRaw,
      { name: "HKDF" },
      false,
      ["deriveKey"]
    );
    
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array([]),  // optional
        info: fileId,
      },
      masterKeyImported,
      { name: "AES-GCM", length: 256 },
      false,
      usage
    );
  }
  
  // === 3) Verschlüsseln ===
  async encryptData(secretData: string): Promise<string> {
    if (!this.masterKeyRaw) throw new Error("Master-Key nicht initialisiert!");
    
    const fileId = crypto.getRandomValues(new Uint8Array(16)); // eindeutige Datei-ID
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const fileKey = await this.deriveFileKey(fileId, ["encrypt"]);
    
    const encryptedContent = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      fileKey,
      this.enc.encode(secretData)
    );
    
    const encryptedContentArr = new Uint8Array(encryptedContent);
    const buff = new Uint8Array(fileId.length + iv.length + encryptedContentArr.length);
    buff.set(fileId, 0);
    buff.set(iv, fileId.length);
    buff.set(encryptedContentArr, fileId.length + iv.length);
    
    return this.buff_to_base64(buff);
  }
  
  // === 4) Entschlüsseln ===
  async decryptData(encryptedData: string): Promise<string> {
    if (!this.masterKeyRaw) throw new Error("Master-Key nicht initialisiert!");
    
    const encryptedDataBuff = this.base64_to_buf(encryptedData);
    const fileId = encryptedDataBuff.slice(0, 16);
    const iv = encryptedDataBuff.slice(16, 28);
    const ciphertext = encryptedDataBuff.slice(28);
    
    const fileKey = await this.deriveFileKey(fileId, ["decrypt"]);
    
    const decryptedContent = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      fileKey,
      ciphertext
    );
    
    return this.dec.decode(decryptedContent);
  }
  
  // === Hilfsfunktionen Base64 ===
  private buff_to_base64 = (buff: Uint8Array) =>
    btoa(String.fromCharCode(...buff));
  
  private base64_to_buf = (b64: string) =>
    Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  
}
