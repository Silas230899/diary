import {Injectable} from '@angular/core';
import {BaseDirectory, create, exists, readFile} from "@tauri-apps/plugin-fs";
import {CryptoService} from "./crypto.service";

@Injectable({
  providedIn: 'root'
})
export class PasswordService {
  
  private saltFilename = "masterPasswordSalt.bin"
  
  constructor(private crypto: CryptoService) {}
  
  async initMasterKeyIfPossible() {
    const saltExists = await this.saltExists()
    if(saltExists) {
      const password = "?0@5Ue2YbCx)BP:i)Pu#KzxyK)WE)h)nN0K7+k*)!627_QCzLLxM9Mj!%5)-~fHMevjawB#P,t%qDBRR"
      const salt = await this.readSalt()
      await this.crypto.initMasterKey(password, salt)
      return true
    } else return false
  }
  
  async saltExists() {
    return await exists(this.saltFilename, {baseDir: BaseDirectory.AppData})
  }
  
  private async createSalt() {
    const masterPasswordSaltFile = await create(this.saltFilename, { baseDir: BaseDirectory.AppData })
    const salt = crypto.getRandomValues(new Uint8Array(16))
    await masterPasswordSaltFile.write(salt)
    await masterPasswordSaltFile.close()
    return salt
  }
  
  async readSalt() {
    return await readFile(this.saltFilename, {baseDir: BaseDirectory.AppData})
  }
  
  async setPassword(password: string) {
    const salt = await this.createSalt()
    await this.crypto.initMasterKey(password, salt)
  }
  
}
