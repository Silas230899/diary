import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar} from '@ionic/angular/standalone';
import {platform} from "@tauri-apps/plugin-os";
import {retrieve} from "@impierce/tauri-plugin-keystore";
import {PasswordService} from "../services/password.service";
import {CryptoService} from "../services/crypto.service";

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
              private crypto: CryptoService) {
    if(platform() === "android") {
      retrieve("password").then(async (result) => {
        if(result !== null) this.password = result;
        await this.login()
      })
    }
  }

  ngOnInit() {
  }
  
  async login() {
    const salt = await this.passwordService.readSalt()
    await this.crypto.initMasterKey(this.password, salt)
  }
}
