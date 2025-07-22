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
import {DatabaseService} from "../services/database.service";

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.page.html',
  styleUrls: ['./new-entry.page.scss'],
  standalone: true,
    imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonDatetime, IonDatetimeButton, IonModal, IonTextarea]
})
export class NewEntryPage implements OnInit {
    text = ""
    date: string;
    written: string;

    constructor(private navController: NavController, private dbService: DatabaseService) {
        addIcons({ add, pencil, createOutline })
        this.date = new Date().toISOString()
        this.written = new Date().toISOString()
    }

    async navigate(dst: string) {
        await this.navController.navigateRoot(`/${dst}`)
    }

  ngOnInit() {
  }


    async db() {
        const db = this.dbService.database
        const fromDate = new Date(this.date)
        const fromWritten = new Date(this.written)
        const data = await this.dbService.encryptData(this.text, "silas")

        console.log("Enter " + this.date + ", " + this.written)

        const result1 = await db.execute(
            "INSERT into entry (date, written, text) VALUES (date($1), datetime($2), $3)",
            [this.date, this.written, data],
        );
        await this.navController.navigateRoot(`/home`)
    }
}
