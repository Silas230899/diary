import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonButton, IonContent, IonHeader, IonInput, IonNote, IonTitle, IonToolbar} from '@ionic/angular/standalone';
import {PasswordService} from "../services/password.service";
import {Router} from "@angular/router";
import {SynchronizationService} from "../services/synchronization.service";
import {ImageDb} from "../models/image-db";
import {DatabaseService} from "../services/database.service";
import {CryptoService} from "../services/crypto.service";

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonInput, IonButton, IonNote]
})
export class OnboardingPage implements OnInit {
  
  password = ""
  googleInitialized: boolean

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
    await this.sync.google()
    
    const allFiles = await this.sync.listDriveFiles()
    let done = 0
    for(let file of allFiles) {
      if(file.name.endsWith(".webp")) {
        const imageData = await this.sync.downloadImage(file.id)
        const image = new ImageDb(file.name, imageData)
        await this.dbService.addImage(image)
        done++
      } else if(file.name.startsWith("entry-")) {
        const entry = await this.sync.downloadEntry(file.id)
        entry.driveFileId = file.id
        await this.dbService.insertEntry(entry)
        done++
      }
      console.log(done + "/" + allFiles.length)
    }
    
    const masterPasswordSalt = await this.sync.getMasterPasswordSalt()
    if(masterPasswordSalt !== null) {
      const masterPasswordSaltBlob = await this.sync.downloadImage(masterPasswordSalt.id)
      await this.passwordService.writeSalt(await masterPasswordSaltBlob.bytes())
    } else if(await this.passwordService.saltExists()) {
      await this.sync.uploadBinary("masterPasswordSalt.bin", await this.passwordService.readSalt())
    }
    
    this.googleInitialized = this.sync.isGoogleInitialized()
  }
  
  async testupload() {
    await this.sync.uploadFile()
    await this.sync.listFiles()
  }
  
  async setPassword() {
    await this.passwordService.setPassword(this.password);
    if(this.googleInitialized) {
      await this.sync.uploadBinary("masterPasswordSalt.bin", await this.passwordService.readSalt())
    }
    await this.router.navigate(['/home'], { replaceUrl: true });
  }
}
