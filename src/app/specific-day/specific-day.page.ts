import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons,
  IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonPopover,
  IonTitle,
  IonToolbar, ModalController,
  NavController, PopoverController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, ellipsisVerticalOutline, chevronBackOutline, chevronForwardOutline } from "ionicons/icons";
import {SpecificDayPopoverComponent} from "../components/specific-day-popover/specific-day-popover.component";
import {Entry} from "../models/entry";
import {DatabaseService} from "../services/database.service";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {NewEntryComponent} from "../components/new-entry/new-entry.component";

@Component({
  selector: 'app-specific-day',
  templateUrl: './specific-day.page.html',
  styleUrls: ['./specific-day.page.scss'],
  standalone: true,
    imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonDatetimeButton, IonModal, IonDatetime, IonLabel, IonPopover, IonList, IonItem, IonButtons, NavBarComponent]
})
export class SpecificDayPage implements OnInit {

  date: string
  entries: Entry[] = []

  constructor(private navController: NavController,
              private popoverController: PopoverController,
              private dbService: DatabaseService,
              private modalCtrl: ModalController) {
    addIcons({ add, ellipsisVerticalOutline, chevronBackOutline, chevronForwardOutline })
    this.date = new Date().toISOString()

    //console.log(this.date)

    this.populateEntries(this.date)
  }

  async populateEntries(date: string) {
    let entries: Entry[] = []
    this.dbService.database.select("SELECT * FROM entry WHERE date = date($1)", [date]).then(async res => {
      // @ts-ignore
      for(const entry of res) {
        const text = await this.dbService.decryptData(entry["text"], "silas")
        const entryObject = new Entry(
            entry["id"],
            entry["date"],
            entry["written"],
            entry["entryId"],
            text)
        this.entries.push(entryObject)
      }
      entries.sort((a, b) => a.entryId-b.entryId)
    })
    this.entries = entries
  }

  ngOnInit() {
  }

  formatTime(date: string) {
    return new Date(date).toLocaleTimeString(undefined, {timeStyle: "short"});
  }

  async createPopover($event: MouseEvent) {
    const popover = await this.popoverController.create({
      component: SpecificDayPopoverComponent,
      event: $event,
      reference: "event",
      dismissOnSelect: true,
    })
    await popover.present()
  }

  // @ts-ignore
  async selectedDate($event) {
    this.date = $event.detail.value;
    await this.populateEntries(this.date)
  }

  async openNewEntryModal() {
    const modal = await this.modalCtrl.create({
      component: NewEntryComponent,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      console.log(`Hello, ${data}!`)
        await this.populateEntries(this.date)
    }
  }

  async gotoYesterday() {
    const yesterday = new Date(new Date(this.date).getTime() - 24*60*60*1000)
    yesterday.setUTCHours(0, 0, 0, 0)
    this.date = yesterday.toISOString()
    await this.populateEntries(this.date)
  }

  async gotoTomorrow() {
    const yesterday = new Date(new Date(this.date).getTime() + 24*60*60*1000)
    yesterday.setUTCHours(0, 0, 0, 0)
    this.date = yesterday.toISOString()
    await this.populateEntries(this.date)
  }

  getYesterdate() {
    return new Date(new Date(this.date).getTime() - 24*60*60*1000).getDate()
  }

  getTomorrowdate() {
    return new Date(new Date(this.date).getTime() + 24*60*60*1000).getDate()
  }

}
