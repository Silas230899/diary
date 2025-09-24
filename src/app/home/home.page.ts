import {Component} from '@angular/core';
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader, IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon, IonInput, IonItem, IonLabel, IonList, IonTextarea,
    IonTitle,
    IonToolbar, ModalController, NavController
} from '@ionic/angular/standalone';
import {add, createOutline, pencil, trashOutline} from 'ionicons/icons';
import {addIcons} from "ionicons";
import {FormsModule} from "@angular/forms";
import {DatabaseService} from "../services/database.service";
import {EntryDbRecord} from "../models/entry-db-record";
import {NewEntryComponent} from "../components/new-entry/new-entry.component";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {OAuth2Client} from "google-auth-library";
import {getCurrent} from "@tauri-apps/plugin-deep-link";
import {openUrl} from "@tauri-apps/plugin-opener";
import {listen} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";
import {CryptoService} from "../services/crypto.service";
import {NewEntryWithoutEntryIndex} from "../models/new-entry-without-entry-index";
import {NewEntry} from "../models/new-entry";
import {SynchronizationService} from "../services/synchronization.service";

type Day = EntryDbRecord[]

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
    imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, FormsModule, IonCardSubtitle, IonLabel, IonInput, NavBarComponent, IonList, IonItem, IonTextarea],
})
export class HomePage {

  entries: Day[] = []

  constructor(private navController: NavController,
              private dbService: DatabaseService,
              private modalCtrl: ModalController,
              private crypto: CryptoService,
              private sync: SynchronizationService) {
    addIcons({ add, pencil, createOutline, trashOutline })
    
    //this.sync.google()
    //this.sync.listFiles()
    /*
    this.sync.getNewToken(this.sync.refreshToken).then(value => {
      console.log(value)
      this.sync.accessToken = value.access_token
    })
    */

    const entries = this.dbService.getEntriesByDate(new Date().toISOString())

    const db = dbService.database

    const res2 = db.select("SELECT * FROM entry")
    
    res2.then(async (res) => {

      const entriesByDay: Map<string, EntryDbRecord[]> = new Map()

      for(const entry of res as any[]) {
        
        const text = await crypto.decryptBase64StringToString(entry["text"])
        
        const referencedImages = (entry["referencedImages"] as string).split(",")

        const entryObject = new EntryDbRecord(
          entry["id"],
          entry["date"],
          entry["written"],
          entry["entryIndex"],
          text,
          entry["sync"],
          referencedImages,
          entry["syncStatus"],
          entry["driveFileId"])
        const day = entriesByDay.get(entryObject.date)
        if(day) day.push(entryObject)
        else entriesByDay.set(entryObject.date, [entryObject])
      }

      this.entries = Array.from(entriesByDay)
          .sort((a, b) => new Date(b[0]).getTime()-new Date(a[0]).getTime())
          .map(value => value[1])

      this.entries.forEach(entry => {entry.sort((a, b) => a.entryIndex-b.entryIndex)})
    })
  }
  
  async populateEntries() {
  
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  async delete(entry: EntryDbRecord) {
    const db = this.dbService.database
    await db.execute("DELETE FROM entry WHERE id = $1", [entry.id])
    //this.entries.splice(this.entries.indexOf(entry), 1)
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric", weekday: "long"});
  }

  formatDatetime(date: string, written: string) {
    let options = {}
    if(this.isSameDay(new Date(date), new Date(written))) {
      options = {
        hour: "2-digit",
        minute: "2-digit"}
      return "Heute, " + new Date(written).toLocaleTimeString(undefined, options);
    } else {
      options = {
        day: "numeric",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"}
      return new Date(written).toLocaleDateString(undefined, options);
    }
  }

  private isSameDay(date1: Date, date2: Date) {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
  }

  async openNewEntryModal() {
    const modal = await this.modalCtrl.create({
      component: NewEntryComponent
    });
    
    modal.onDidDismiss().then(async e => {
      const { data, role } = e
      if(role === "confirm") {
        const newEntryWithoutEntryIndex = data as NewEntryWithoutEntryIndex
        
        const entryIndex = await this.dbService.getMaxEntryIndexForDate(newEntryWithoutEntryIndex.date)
        
        const newEntry = new NewEntry(
          newEntryWithoutEntryIndex.date,
          newEntryWithoutEntryIndex.written,
          entryIndex,
          newEntryWithoutEntryIndex.text,
          newEntryWithoutEntryIndex.sync,
          newEntryWithoutEntryIndex.images.map(image => image.filename)
        )
        await this.dbService.addEntry(newEntry)
      }
    })
    
    await modal.present();
  }
  
}
