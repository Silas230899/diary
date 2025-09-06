import { Component, OnInit } from '@angular/core';
import {
    IonButton,
    IonButtons,
    IonContent, IonDatetime, IonDatetimeButton,
    IonHeader,
    IonModal, IonTextarea,
    IonTitle,
    IonToolbar, ModalController, NavController
} from "@ionic/angular/standalone";
import {FormsModule} from "@angular/forms";
import {addIcons} from "ionicons";
import {
  add,
  barChartOutline,
  calendarNumberOutline,
  createOutline, homeOutline,
  pencil,
  peopleOutline,
  todayOutline
} from "ionicons/icons";
import {DatabaseService} from "../../services/database.service";

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.component.html',
  styleUrls: ['./new-entry.component.css'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButton,
    IonButtons,
    IonTitle,
    IonContent,
    FormsModule,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonTextarea
  ],
  standalone: true
})
export class NewEntryComponent  implements OnInit {

  name!: string;
  text = ""
  date: string
  written: string

  constructor(private modalCtrl: ModalController, private navController: NavController, private dbService: DatabaseService) {
    addIcons({ add, pencil, createOutline, todayOutline, barChartOutline, peopleOutline, calendarNumberOutline, homeOutline })
    this.date = new Date().toISOString()
    this.written = new Date().toISOString()
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm() {
      await this.db()
    return this.modalCtrl.dismiss(this.name, 'confirm');
  }

  ngOnInit() {}

    async db() {
        const db = this.dbService.database
        const fromDate = new Date(this.date)
        const fromWritten = new Date(this.written)
        const data = await this.dbService.encryptData(this.text, "silas")

        const result1 = await db.execute(
            "INSERT into entry (date, written, text) VALUES (date($1), datetime($2), $3)",
            [this.date, this.written, data],
        );
        //await this.navController.navigateRoot(`/home`)
    }

}
