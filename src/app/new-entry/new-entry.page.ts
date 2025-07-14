import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonButton,
    IonCard,
    IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
    IonContent, IonDatetime, IonDatetimeButton,
    IonHeader, IonModal, IonTextarea,
    IonTitle,
    IonToolbar, NavController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, createOutline, pencil} from "ionicons/icons";
import Database from "@tauri-apps/plugin-sql";

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.page.html',
  styleUrls: ['./new-entry.page.scss'],
  standalone: true,
    imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonDatetime, IonDatetimeButton, IonModal, IonTextarea]
})
export class NewEntryPage implements OnInit {

    constructor(private navController: NavController) {
        addIcons({ add, pencil, createOutline })
    }

    async navigate(dst: string) {
        await this.navController.navigateRoot(`/${dst}`)
    }

  ngOnInit() {
  }


    async db() {
        const db = await Database.load("sqlite:test.db")
        const result0 = await db.execute("CREATE TABLE IF NOT EXISTS todos(id NUMBER, title TEXT, status TEXT)")
        const result1 = await db.execute(
            "INSERT into todos (id, title, status) VALUES ($1, $2, $3)",
            [5, "hello", "online"],
        );
        const result2 = await db.select("SELECT * FROM todos")
        console.log(result2)
    }
}
