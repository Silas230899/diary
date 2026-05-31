import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonNote, IonProgressBar,
  IonTitle,
  IonToolbar, NavController
} from '@ionic/angular/standalone';
import {PasswordService} from "../services/password.service";
import {Router} from "@angular/router";
import {SynchronizationService} from "../services/synchronization.service";
import {ImageDb} from "../models/image-db";
import {DatabaseService} from "../services/database.service";
import {CryptoService} from "../services/crypto.service";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {store} from "@impierce/tauri-plugin-keystore";
import {platform} from "@tauri-apps/plugin-os";
import {ToastController} from "@ionic/angular";

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, FormsModule, IonInput, IonButton, IonNote, IonBackButton, NavBarComponent, IonProgressBar]
})
export class OnboardingPage implements OnInit {
  
  password = ""
  googleInitialized: boolean
  googleInitializing = false
  downloadingEntries = false
  done = 0
  all = 0

  constructor(private passwordService: PasswordService,
              private router: Router,
              private sync: SynchronizationService,
              private dbService: DatabaseService,
              private crypto: CryptoService,
              private navCtrl: NavController,
              private toastController: ToastController,) {
    this.googleInitialized = this.sync.isGoogleInitialized()
  }

  ngOnInit() {
  }
  
  async initializeGoogle() {
    this.googleInitializing = true
    
    this.deleteStorage()
    
    await this.sync.google()
    
    await this.downloadEverything()
    
    /*
    const masterPasswordSalt = await this.sync.getMasterPasswordSalt()
    if(masterPasswordSalt !== null) {
      const masterPasswordSaltBlob = await this.sync.downloadImage(masterPasswordSalt.id)
      //fehlerawait this.passwordService.writeSalt(await this.crypto.encryptArrayBufferToArrayBuffer(await masterPasswordSaltBlob.arrayBuffer()))
    } else if(await this.passwordService.saltExists()) {
      await this.sync.uploadBinary("masterPasswordSalt.bin", await this.passwordService.readSalt())
    } else {
      alert("weder salt aus der cloud gefunden noch auf dem gerät. fehler")
    }
    */
    
    this.googleInitialized = this.sync.isGoogleInitialized()
    console.log("googleInitialized: " + this.googleInitialized)
    this.googleInitializing = false
  }
  
  async createAccount() {
    let salt
    if(await this.passwordService.saltExists()) {
      salt = await this.passwordService.readSalt()
      console.log("worked with existing salt")
    } else {
      alert("no salt exists")
      /*
      salt = await this.passwordService.createSalt()
      await this.sync.uploadBinary("masterPasswordSalt.bin", salt)
      console.log("created and uploaded new salt")
      */
    }
    if(platform() === "android" || platform() === "ios") {
      await this.storePw(this.password)
    }
    await this.crypto.initMasterKey(this.password, salt!)
  }
  
  async clearDb() {
    await this.dbService.clearDb()
    alert("cleared db")
  }
  
  async setPassword() {
    await this.passwordService.setPassword(this.password);
    await this.storePw(this.password)
    if(this.googleInitialized) {
      await this.sync.uploadBinary("masterPasswordSalt.bin", await this.passwordService.readSalt())
    }
    //await this.router.navigate(['/home'], { replaceUrl: true });
  }
  
  async downloadEverything() {
    this.downloadingEntries = true
    const allEntries = await this.dbService.getAllEntriesRaw()
    let res = await this.sync.listDriveFiles()
    while(true) {
      const allFiles = res.files
      this.all += allFiles.length
      let done = 0
      for(let file of allFiles) {
        if(file.name.endsWith(".webp")) {
          const imageData = await this.sync.downloadImage(file.id)
          const image = new ImageDb(file.name, imageData)
          await this.dbService.insertRawImage(image)
          done++
          console.log("downloaded image " + file.name)
        } else if(file.name.startsWith("entry-")) {
          /////
          if(allEntries.find(entry => `entry-${entry.uuidv7}` === file.name) !== undefined) continue
          const entry = await this.sync.downloadEntry(file.id)
          entry.driveFileId = file.id
          console.log(entry)
          await this.dbService.insertRawEntry(entry)
          done++
        } else if(file.name === "masterPasswordSalt.bin"){
          const masterPasswordSaltBlob = await this.sync.downloadImage(file.id)
          await this.passwordService.writeSalt(new Uint8Array(await masterPasswordSaltBlob.arrayBuffer()))
          done++
        } else console.log("skip " + file.name)
        console.log(done + "/" + allFiles.length)
      }
      this.done += done
      if(res.nextPageToken !== undefined) res = await this.sync.listDriveFiles(res.nextPageToken)
      else break
    }
    this.downloadingEntries = false
  }
  
  async download() {
    await this.sync.downloadRemoteChanges()
  }
  
  deleteStorage() {
    localStorage.clear()
  }
  
  async upload() {
    await this.sync.uploadLocalChanges()
  }
  
  async storePw(password: string) {
    await store(password, {
      keyAlias: "password",
      promptTitle: "Passwort autorisieren",
      promptSubtitle: "",
      promptNegativeButtonText: "Abbrechen"
    })
  }
  
  async uploadSalt() {
    const salt = await this.passwordService.readSalt()
    await this.sync.uploadBinary("masterPasswordSalt.bin", salt)
  }
  
  async deleteCloud() {
    alert("disabled for sec. reasons")
    //await this.sync.deleteAll()
  }
  
  async dump() {
    const entries = await this.dbService.getAllEntries()
    const jsonStr = JSON.stringify(entries, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const filename = `dump-${new Date().toISOString()}.json`
    
    // Virtuellen Download-Link erzeugen
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    
    // Klick auslösen
    a.click();
    
    // Speicher freigeben
    URL.revokeObjectURL(url);
    
    const toast = await this.toastController.create({
      message: `Datei gespeichert in Downloads als ${filename}!`,
      duration: 2000,
      position: "bottom",
    });
    
    await toast.present();
  }
}
