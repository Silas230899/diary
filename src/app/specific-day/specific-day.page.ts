import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonPopover,
  IonTitle,
  IonToolbar,
  NavController, PopoverController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, ellipsisVerticalOutline } from "ionicons/icons";
import {SpecificDayPopoverComponent} from "../components/specific-day-popover/specific-day-popover.component";
import {Entry} from "../models/entry";
import {DatabaseService} from "../services/database.service";

@Component({
  selector: 'app-specific-day',
  templateUrl: './specific-day.page.html',
  styleUrls: ['./specific-day.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonDatetimeButton, IonModal, IonDatetime, IonLabel, IonPopover, IonList, IonItem]
})
export class SpecificDayPage implements OnInit {

  date: string
  entries: Entry[] = []

  constructor(private navController: NavController,
              private popoverController: PopoverController,
              private dbService: DatabaseService) {
    addIcons({ add, ellipsisVerticalOutline })
    this.date = new Date().toISOString()

    //console.log(this.date)

    this.populateEntries(this.date)
  }

  async populateEntries(date: string) {
    this.entries = []
    this.dbService.database.select("SELECT * FROM entry WHERE date = date($1)", [date]).then(async res => {
      // @ts-ignore
      for(const entry of res) {
        const text = await this.dbService.decryptData(entry["text"], "silas")
        const entryObject = new Entry(
            entry["id"],
            entry["date"],
            entry["written"],
            text)
        this.entries.push(entryObject)
      }
    })
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  ngOnInit() {
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
}
