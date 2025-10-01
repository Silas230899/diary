import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonInput, IonButton]
})
export class LoginPage implements OnInit {
  password = ""

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
        // biometry must be available
        const result = await retrieve("password")
        if(result !== null) {
          await this.login(result)
        }
      }
    }
  }

  ngOnInit() {
  }
  
  async login(password: string) {
    const salt = await this.passwordService.readSalt()
    await this.crypto.initMasterKey(password, salt)
    await this.navCtrl.navigateRoot("home")
  }
}
