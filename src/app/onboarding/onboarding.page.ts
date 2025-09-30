import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonNote, IonProgressBar,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {PasswordService} from "../services/password.service";
import {Router} from "@angular/router";
import {SynchronizationService} from "../services/synchronization.service";
import {ImageDb} from "../models/image-db";
import {DatabaseService} from "../services/database.service";
import {CryptoService} from "../services/crypto.service";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonInput, IonButton, IonNote, IonBackButton, NavBarComponent, IonProgressBar]
})
export class OnboardingPage implements OnInit {
  
  password = ""
  googleInitialized: boolean
  googleInitializing = false
  done = 0
  all = 0

  constructor(private passwordService: PasswordService,
              private router: Router,
              private sync: SynchronizationService,
              private dbService: DatabaseService,
              private crypto: CryptoService,) {
    this.googleInitialized = this.sync.isGoogleInitialized()
  }

  ngOnInit() {
  }
  
  async initializeGoogle() {
    this.googleInitializing = true
    
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
    
    await this.passwordService.initMasterKeyIfPossible()
    
    this.googleInitialized = this.sync.isGoogleInitialized()
  }
  
  async clearDb() {
    await this.dbService.clearDb()
  }
  
  async setPassword() {
    await this.passwordService.setPassword(this.password);
    if(this.googleInitialized) {
      await this.sync.uploadBinary("masterPasswordSalt.bin", await this.passwordService.readSalt())
    }
    await this.router.navigate(['/home'], { replaceUrl: true });
  }
  
  async downloadEverything() {
    const allFiles = await this.sync.listDriveFiles()
    this.all = allFiles.length
    let done = 0
    for(let file of allFiles) {
      if(file.name.endsWith(".webp")) {
        const imageData = await this.sync.downloadImage(file.id)
        const image = new ImageDb(file.name, imageData)
        await this.dbService.insertRawImage(image)
        done++
        console.log("downloaded image " + file.name)
      } else if(file.name.startsWith("entry-")) {
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
      this.done = done
    }
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
}
