import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  private masterKeyRaw: ArrayBuffer | null = null;

  private enc = new TextEncoder();
  private dec = new TextDecoder();
  
  constructor() {}
  
  isMasterKeyInitialized() {
    return this.masterKeyRaw !== null
  }

  async initMasterKey(password: string, salt: Uint8Array): Promise<void> {
    console.log("start initializing master key")
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
        hash: "SHA-256",
        iterations: 2_500_000,
        salt: salt
      } as Pbkdf2Params,
      passwordKey,
      256 // 256 bit = 32 Byte
    );

    this.masterKeyRaw = masterKeyBits;
    
    console.log("Initialized master key")
  }

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
      } as HkdfParams,
      masterKeyImported,
      { name: "AES-GCM", length: 256 },
      false,
      usage
    );
  }
  
  async encryptStringToBase64String(secretData: string) {
    return this.buff_to_base64(await this.encryptArrayBufferToArrayBuffer(this.enc.encode(secretData).buffer))
  }

  async encryptArrayBufferToArrayBuffer(secretData: ArrayBuffer) {
    if (!this.masterKeyRaw) throw new Error("Master-Key nicht initialisiert!");

    const fileId = crypto.getRandomValues(new Uint8Array(16)); // eindeutige Datei-ID
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const fileKey = await this.deriveFileKey(fileId, ["encrypt"]);

    const encryptedContent = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      fileKey,
      secretData
    );

    const encryptedContentArr = new Uint8Array(encryptedContent);
    const buff = new Uint8Array(fileId.length + iv.length + encryptedContentArr.length);
    buff.set(fileId, 0);
    buff.set(iv, fileId.length);
    buff.set(encryptedContentArr, fileId.length + iv.length);

    return buff
  }
  
  async decryptBase64StringToString(encryptedData: string) {
    return this.dec.decode(await this.decryptUint8ArrayToArrayBuffer(this.base64_to_buf(encryptedData)))
  }

  async decryptUint8ArrayToArrayBuffer(encryptedData: Uint8Array) {
    if (!this.masterKeyRaw) throw new Error("Master-Key nicht initialisiert!");

    const fileId = encryptedData.slice(0, 16);
    const iv = encryptedData.slice(16, 28);
    const ciphertext = encryptedData.slice(28);

    const fileKey = await this.deriveFileKey(fileId, ["decrypt"]);

    const decryptedContent = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      fileKey,
      ciphertext
    );

    return decryptedContent
  }

  // === Hilfsfunktionen Base64 ===
  private buff_to_base64 = (buff: Uint8Array) =>
    btoa(String.fromCharCode(...buff));

  private base64_to_buf = (b64: string) =>
    Uint8Array.from(atob(b64), c => c.charCodeAt(0));

}
