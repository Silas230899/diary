import {Component, OnInit, ViewChild} from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar,
  NavController
} from '@ionic/angular/standalone';
import {platform} from "@tauri-apps/plugin-os";
import {retrieve} from "@impierce/tauri-plugin-keystore";
import {PasswordService} from "../services/password.service";
import {CryptoService} from "../services/crypto.service";
import {checkStatus} from "@tauri-apps/plugin-biometric";

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, FormsModule, IonInput, IonButton]
})
export class LoginPage implements OnInit {
  
  @ViewChild("passwordField") passwordField!: IonInput
  
  password = ""
  biometryAvailable = false

  constructor(private passwordService: PasswordService,
              private crypto: CryptoService,
              private navCtrl: NavController,) {
    this.openBiometry()
  }
  
  async openBiometry() {
    if(platform() === "android" || platform() === "ios") {
      // only mobile has biometry plugin
      const status = await checkStatus()
      if(status.isAvailable) {
        this.biometryAvailable = true;
        // biometry must be available
        const result = await retrieve(
          { keyAlias: "password",
            promptTitle: "Tagebuch entsperren",
            promptSubtitle: "",
            promptNegativeButtonText: "Abbrechen"
          })
        if(result !== null) {
          await this.login(result)
        }
      }
    }
  }
  
  async ionViewDidEnter() {
    if(platform() === "android" || platform() === "ios") {
      // only mobile has biometry plugin
      const status = await checkStatus()
      if(!status.isAvailable) {
        await this.passwordField.setFocus()
      }
    } else {
      await this.passwordField.setFocus()
    }
  }

  ngOnInit() {
  }
  
  async login(password: string) {
    const salt = await this.passwordService.readSalt()
    localStorage.setItem("password", password)
    localStorage.setItem("passwordExpirationDate", new Date(new Date().getTime() + 10 * 60 * 1000).toISOString())
    await this.crypto.initMasterKey(password, salt)
    await this.navCtrl.navigateRoot("home")
  }
  
  async submit() {
    if(this.password.length !== 0) await this.login(this.password)
  }
}
