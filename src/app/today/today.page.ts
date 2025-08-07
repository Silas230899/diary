import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent,
  IonHeader, IonIcon,
  IonTitle,
  IonToolbar,
  NavController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, createOutline, pencil} from "ionicons/icons";
import {Entry} from "../models/entry";
import {DatabaseService} from "../services/database.service";

@Component({
  selector: 'app-today',
  templateUrl: './today.page.html',
  styleUrls: ['./today.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon]
})
export class TodayPage implements OnInit {

  date: string
  entries: Entry[] = []

  constructor(private navController: NavController, private dbService: DatabaseService) {
    addIcons({ add, pencil, createOutline })

    this.date = new Date().toISOString()

    this.populateEntries(this.date)
  }

  async populateEntries(date: string) {
    this.entries = []
    this.dbService.database.select("SELECT * FROM entry WHERE strftime('%m-%d', date) = strftime('%m-%d', date($1))", [date]).then(async res => {
      // @ts-ignore
      for(const entry of res) {
        const text = await this.dbService.decryptData(entry["text"], "silas")
        const entryObject = new Entry(
            entry["id"],
            entry["date"],
            entry["written"],
            text)
        console.log(entryObject)
        this.entries.push(entryObject)
      }
    })
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  ngOnInit() {
  }

}
