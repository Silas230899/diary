import {Injectable} from '@angular/core';
import {BaseDirectory, create, exists, readFile} from "@tauri-apps/plugin-fs";
import {CryptoService} from "./crypto.service";
import {platform} from "@tauri-apps/plugin-os";
import {BiometryType, checkStatus} from "@tauri-apps/plugin-biometric";
import {retrieve, store, remove} from "@impierce/tauri-plugin-keystore";

@Injectable({
  providedIn: 'root'
})
export class PasswordService {
  
  private saltFilename = "masterPasswordSalt.bin"
  
  constructor(private crypto: CryptoService) {}
  
  async saltExists() {
    return await exists(this.saltFilename, {baseDir: BaseDirectory.AppData})
  }
  
  async createSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    await this.writeSalt(salt)
    return salt
  }
  
  async writeSalt(salt: Uint8Array<ArrayBuffer>) {
    const masterPasswordSaltFile = await create(this.saltFilename, { baseDir: BaseDirectory.AppData })
    await masterPasswordSaltFile.write(salt)
    await masterPasswordSaltFile.close()
  }
  
  async readSalt() {
    return await readFile(this.saltFilename, {baseDir: BaseDirectory.AppData})
  }
  
  async setPassword(password: string) {
    const salt = await this.createSalt()
    await this.crypto.initMasterKey(password, salt)
  }
  
}
