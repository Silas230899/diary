import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons,
  IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonImg, IonItem, IonLabel, IonList, IonModal, IonPopover, IonProgressBar,
  IonTitle,
  IonToolbar, ModalController,
  NavController, PopoverController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, ellipsisVerticalOutline, chevronBackOutline, chevronForwardOutline } from "ionicons/icons";
import {SpecificDayPopoverComponent} from "../components/specific-day-popover/specific-day-popover.component";
import {EntryDbRecord} from "../models/entry-db-record";
import {DatabaseService} from "../services/database.service";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {NewEntryComponent} from "../components/new-entry/new-entry.component";
import {CryptoService} from "../services/crypto.service";
import {BaseDirectory, readFile} from "@tauri-apps/plugin-fs";
import {EntryViewRecord} from "../models/entry-view-record";
import {ImageView} from "../models/image-view";
import {NewEntry} from "../models/new-entry";
import {NewEntryWithoutEntryIndex} from "../models/new-entry-without-entry-index";
import {EntriesService} from "../services/entries.service";
import {SynchronizationService} from "../services/synchronization.service";
import {ImageDb} from "../models/image-db";

type EntryPart = { type: "text", value: string }
  | { type: "newline" }
  | { type: "image", value: string }
  | { type: "images", value: string[] }
  | { type: "chat", value: string }

@Component({
  selector: 'app-specific-day',
  templateUrl: './specific-day.page.html',
  styleUrls: ['./specific-day.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonDatetimeButton, IonModal, IonDatetime, IonLabel, IonPopover, IonList, IonItem, IonButtons, NavBarComponent, IonImg, IonProgressBar]
})
export class SpecificDayPage implements OnInit {

  date: string
  entries: EntryViewRecord[] = []
  entriesLoading = true
  
  splitEntryText(entry: EntryViewRecord) {
    let res: EntryPart[] = []
    for(let line of entry.text.split(/\n/)) {
      if(line.startsWith("![image](")) {
        const filename = line.substring(9, line.length-1)
        const img = entry.images.filter(value => value.filename == filename)[0]
        if(res.length > 0) {
          const last = res[res.length-1]
          if(last.type === "image") {
            res = res.slice(0, res.length-1)
            res.push({ type: "images", value: [last.value, img.localImageUrl] })
          } else if(last.type === "images") {
            last.value.push(img.localImageUrl)
          } else {
            res.push({ type: "image", value: img.localImageUrl })
          }
        } else {
          res.push({ type: "image", value: img.localImageUrl })
        }
      } else if(line.startsWith("![chat]")) {
        res.push({ type: "chat", value: line.substring(7) })
      } else {
        if(line.length === 0) {
          res.push({ type: "newline" })
        } else {
          res.push({ type: "text", value: line })
        }
      }
      //res.push({ type: "newline" })
    }
    let res2: EntryPart[] = []
    for(let r of res) {
      res2.push(r)
      res2.push({ type: "newline" })
    }
    res2 = res2.slice(0, res2.length-1)
    return res2
  }

  constructor(private navController: NavController,
              private popoverController: PopoverController,
              private dbService: DatabaseService,
              private modalCtrl: ModalController,
              private sync: SynchronizationService) {
    addIcons({ add, ellipsisVerticalOutline, chevronBackOutline, chevronForwardOutline })
    let currentDate = new Date();
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    currentDate.setUTCHours(0, 0, 0, 0)
    this.date = currentDate.toISOString()

    //console.log(this.date)

    this.populateEntries(this.date).then(() => this.entriesLoading = false)
    
    const size = 1024; // 1 KB
    const randomBytes = crypto.getRandomValues(new Uint8Array(size));
    //this.sync.uploadBinary(randomBytes)
    
    const jsonData = {
      timestamp: new Date().toISOString(),
      value: Math.floor(Math.random() * 1000),
      message: "Hallo von der Drive-API!",
    };
    //this.sync.uploadJsonFile(jsonData)
    
    //this.sync.listFiles()
    
    /*
    const allFiles = this.sync.listDriveFiles()
    allFiles.then(async value => {
      for(let res of value) {
        if(res.name.endsWith(".webp")) {
          const imageData = await this.sync.downloadImage(res.id)
          const image = new ImageDb(res.name, imageData)
          await this.dbService.addImage(image)
        } else if(res.name.startsWith("entry-")) {
          const entry = await this.sync.downloadEntry(res.id)
          await this.dbService.insertEntry(entry)
        }
      }
    })
    */
    
    
    //this.sync.getStartPageToken().then(res => console.log(res));
    
    //this.sync.listChanges("27841").then(changes => console.log(changes));
    
    /*
    this.dbService.getEntriesBySpecificDate(this.date).then(async (entries) => {
      const entryViewRecord = entries[0]
      const entryDbRecord = new EntryDbRecord(
        entryViewRecord.id,
        entryViewRecord.date,
        entryViewRecord.written,
        entryViewRecord.entryIndex,
        entryViewRecord.text,
        entryViewRecord.sync,
        entryViewRecord.images.map(image => image.filename),
        "synced",
        entryViewRecord.driveFileId
      )
      this.sync.uploadEntry(entryDbRecord).then(id => console.log(id))
      
      for(let filename of entryDbRecord.referencedImages) {
        await this.sync.uploadImage(await this.dbService.getDBImage(filename))
      }
    })
    */
    
    //this.sync.deleteAll()
    
    //this.sync.synchronize()
  }

  async populateEntries(date: string) {
    let entries: EntryViewRecord[] = await this.dbService.getEntriesBySpecificDate(date)
    entries.sort((a, b) => a.entryIndex-b.entryIndex)
    this.entries = entries
  }

  ngOnInit() {
  }

  formatTime(date: string) {
    return new Date(date).toLocaleTimeString(undefined, {timeStyle: "short"});
  }

  async createPopover($event: MouseEvent, entry: EntryViewRecord) {
    const popover = await this.popoverController.create({
      component: SpecificDayPopoverComponent,
      event: $event,
      reference: "event"
    })
    popover.onDidDismiss().then(async e => {
      const { data, role } = e
      if(role === "confirm") {
        await this.dbService.setSyncStatus(entry.id, "pending_delete")
        //const entryDeletionPromise = this.dbService.deleteEntry(entry.id)
        //const imageDeletionPromises = entry.images.map(image => this.dbService.deleteImage(image.filename))
        //await Promise.all([...imageDeletionPromises, entryDeletionPromise])
        await this.populateEntries(this.date)
      }
    })
    await popover.present()
  }

  // @ts-ignore
  async selectedDate($event) {
    this.date = $event.detail.value;
    await this.populateEntries(this.date)
  }

  async openNewEntryModal(beforeId: number | null, afterId: number | null) {
    let entryIndex = 0
    if(beforeId !== null && afterId !== null) {
      entryIndex = this.entries[afterId].entryIndex + (this.entries[beforeId].entryIndex - this.entries[afterId].entryIndex)/2
    } else if(beforeId === null && afterId === null) {
    
    } else if(afterId !== null) {
      entryIndex = this.entries[afterId].entryIndex + 1
    } else if(beforeId !== null) {
      entryIndex = this.entries[beforeId].entryIndex - 1
    }
    
    const modal = await this.modalCtrl.create({
      component: NewEntryComponent,
      componentProps: {
        date: this.date
      }
    });
    
    modal.onDidDismiss().then(async e => {
      const { data, role } = e
      if(role === "confirm") {
        const newEntryWithoutEntryIndex = data as NewEntryWithoutEntryIndex
        const newEntry = new NewEntry(
          newEntryWithoutEntryIndex.date,
          newEntryWithoutEntryIndex.written,
          entryIndex,
          newEntryWithoutEntryIndex.text,
          newEntryWithoutEntryIndex.sync,
          newEntryWithoutEntryIndex.images.map(image => image.filename)
        )
        let imagePromises = newEntryWithoutEntryIndex.images.map(image => this.dbService.addImage(image))
        const entryPromise = this.dbService.addEntry(newEntry)
        imagePromises = [...imagePromises, entryPromise]
        await Promise.all(imagePromises)
        await this.populateEntries(this.date)
        await this.sync.uploadLocalChanges()
      }
    })
    
    await modal.present();
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
