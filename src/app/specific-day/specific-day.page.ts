import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton, IonButtons,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonModal, IonProgressBar,
  IonTitle,
  IonToolbar, ModalController,
  NavController, PopoverController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, ellipsisVerticalOutline, chevronBackOutline, chevronForwardOutline } from "ionicons/icons";
import {SpecificDayPopoverComponent} from "../components/specific-day-popover/specific-day-popover.component";
import {DatabaseService} from "../services/database.service";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {NewEntryComponent} from "../components/new-entry/new-entry.component";
import {EntryViewRecord} from "../models/entry-view-record";
import {NewEntryWithoutEntryIndex} from "../models/new-entry-without-entry-index";
import {SynchronizationService} from "../services/synchronization.service";
import {EntryTextComponent} from "../components/entry-text/entry-text.component";
import {ActivatedRoute} from "@angular/router";
import {EntryDbRecord} from "../models/entry-db-record";
import {v7} from "uuid";
import {PasswordService} from "../services/password.service";
import {formatDatetime} from "../utils/dateStuff";

@Component({
  selector: 'app-specific-day',
  templateUrl: './specific-day.page.html',
  styleUrls: ['./specific-day.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonDatetimeButton, IonModal, IonDatetime, IonButtons, NavBarComponent, IonProgressBar, EntryTextComponent, IonBackButton]
})
export class SpecificDayPage implements OnInit {

  date: string
  entries: EntryViewRecord[] = []
  entriesLoading = true

  constructor(private navController: NavController,
              private popoverController: PopoverController,
              private dbService: DatabaseService,
              private modalCtrl: ModalController,
              private sync: SynchronizationService,
              private route: ActivatedRoute,
              private passwordService: PasswordService,) {
    addIcons({ add, ellipsisVerticalOutline, chevronBackOutline, chevronForwardOutline })
    
    const date = this.route.snapshot.queryParamMap.get("date");
    if(date !== null) {
      this.date = date
    } else {
      let currentDate = new Date();
      currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
      this.date = currentDate.toISOString()
    }

    this.populateEntries(this.date)
    
    const size = 1024; // 1 KB
    const randomBytes = crypto.getRandomValues(new Uint8Array(size));
    //this.sync.uploadBinary(randomBytes)
    
    const jsonData = {
      timestamp: new Date().toISOString(),
      value: Math.floor(Math.random() * 1000),
      message: "Hallo von der Drive-API!",
    };
    //this.sync.uploadJsonFile(jsonData)
    
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
    //this.sync.listFiles()
    
    //this.passwordService.readSalt().then(async salt => await this.sync.uploadBinary("masterPasswordSalt.bin", salt))
    
    //this.sync.synchronize()
  }

  async populateEntries(date: string) {
    this.entriesLoading = true
    let entries: EntryViewRecord[] = await this.dbService.getEntriesBySpecificDate(date)
    entries.sort((a, b) => a.entryIndex-b.entryIndex)
    this.entries = entries
    this.entriesLoading = false
  }

  ngOnInit() { }
  
  formatToday() {
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
    return new Date(this.date).toLocaleDateString(undefined, options);
  }

  async createPopover($event: MouseEvent, entry: EntryViewRecord) {
    const popover = await this.popoverController.create({
      component: SpecificDayPopoverComponent,
      event: $event,
      reference: "event"
    })
    popover.onDidDismiss().then(async e => {
      const { data, role } = e
      if(role === "delete") {
        await this.dbService.setSyncStatus(entry.uuidv7, "pending_delete")
        //const entryDeletionPromise = this.dbService.deleteEntry(entry.id)
        //const imageDeletionPromises = entry.images.map(image => this.dbService.deleteImage(image.filename))
        //await Promise.all([...imageDeletionPromises, entryDeletionPromise])
        await this.populateEntries(this.date)
        //await this.sync.uploadLocalChanges()
      }
    })
    await popover.present()
  }

  async selectedDate($event: any) {
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
        const uuidv7 = v7()
        const newEntryWithoutEntryIndex = data as NewEntryWithoutEntryIndex
        const newEntry = new EntryDbRecord(
          uuidv7,
          newEntryWithoutEntryIndex.date,
          newEntryWithoutEntryIndex.written,
          newEntryWithoutEntryIndex.writtenHasTime,
          entryIndex,
          newEntryWithoutEntryIndex.text,
          newEntryWithoutEntryIndex.images.map(image => image.filename),
          newEntryWithoutEntryIndex.syncStatus,
          null
        )
        let imagePromises = newEntryWithoutEntryIndex.images.map(image => this.dbService.addImage(image))
        const entryPromise = this.dbService.addEntry(newEntry)
        const allPromises = [...imagePromises, entryPromise]
        await Promise.all(allPromises)
        await this.populateEntries(this.date)
        if(!this.sync.isProbablyOffline) this.sync.uploadLocalChanges() // dont wait for upload
      }
    })
    
    await modal.present();
  }

  async gotoYesterday() {
    const yesterday = new Date(new Date(this.date).getTime() - 24*60*60*1000)
    //yesterday.setUTCHours(0, 0, 0, 0)
    this.date = yesterday.toISOString()
    await this.populateEntries(this.date)
  }

  async gotoTomorrow() {
    const yesterday = new Date(new Date(this.date).getTime() + 24*60*60*1000)
    //yesterday.setUTCHours(0, 0, 0, 0)
    this.date = yesterday.toISOString()
    await this.populateEntries(this.date)
  }

  getYesterdate() {
    return new Date(new Date(this.date).getTime() - 24*60*60*1000).getUTCDate()
  }

  getTomorrowdate() {
    return new Date(new Date(this.date).getTime() + 24*60*60*1000).getUTCDate()
  }
  
  protected readonly formatDatetime = formatDatetime;
}
