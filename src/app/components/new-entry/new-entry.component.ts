import { Component, OnInit } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader,
  IonInput,
  IonItem, IonModal, IonTextarea,
  IonTitle,
  IonToolbar, ModalController
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
    IonItem,
    IonInput,
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

  constructor(private modalCtrl: ModalController) {
    addIcons({ add, pencil, createOutline, todayOutline, barChartOutline, peopleOutline, calendarNumberOutline, homeOutline })
    this.date = new Date().toISOString()
    this.written = new Date().toISOString()
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm() {
    return this.modalCtrl.dismiss(this.name, 'confirm');
  }

  ngOnInit() {}

}
