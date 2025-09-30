import {Component} from '@angular/core';
import {
  IonButton, IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader, IonCardSubtitle,
  IonCardTitle,
  IonContent, IonDatetime, IonDatetimeButton,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonProgressBar, IonRefresher,
  IonRefresherContent, IonTextarea,
  IonTitle,
  IonToolbar, ModalController, NavController, PopoverController, RefresherCustomEvent
} from '@ionic/angular/standalone';
import {
  add,
  chevronBackOutline,
  chevronForwardOutline,
  createOutline,
  ellipsisVerticalOutline,
  pencil,
  trashOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  cloudUploadOutline,
} from 'ionicons/icons';
import {addIcons} from "ionicons";
import {FormsModule} from "@angular/forms";
import {DatabaseService} from "../services/database.service";
import {EntryDbRecord} from "../models/entry-db-record";
import {NewEntryComponent} from "../components/new-entry/new-entry.component";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {CryptoService} from "../services/crypto.service";
import {NewEntryWithoutEntryIndex} from "../models/new-entry-without-entry-index";
import {SynchronizationService} from "../services/synchronization.service";
import {EntryViewRecord} from "../models/entry-view-record";
import {EntryTextComponent} from "../components/entry-text/entry-text.component";
import {v7} from "uuid";
import {SpecificDayPopoverComponent} from "../components/specific-day-popover/specific-day-popover.component";
import {ToastController} from "@ionic/angular";
import {Router} from "@angular/router";
import {BiometryType, checkStatus, Status} from "@tauri-apps/plugin-biometric";
import {platform} from "@tauri-apps/plugin-os";
import {retrieve, store} from "@impierce/tauri-plugin-keystore";
//import {retrieve, store, remove} from "@impierce/tauri-plugin-keystore";

type Day = EntryViewRecord[]

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, FormsModule, IonCardSubtitle, IonLabel, IonInput, NavBarComponent, IonList, IonItem, IonTextarea, EntryTextComponent, IonButtons, IonDatetime, IonDatetimeButton, IonModal, IonProgressBar, IonRefresher, IonRefresherContent],
})
export class HomePage {
  
  date: string
  entries: Day[] = []
  entriesLoading = true
  hasEntriesForThisYear = false

  constructor(private navController: NavController,
              private popoverController: PopoverController,
              private dbService: DatabaseService,
              private modalCtrl: ModalController,
              private crypto: CryptoService,
              protected sync: SynchronizationService,
              private toastController: ToastController,
              private router: Router) {
    addIcons({ cloudDoneOutline, cloudOfflineOutline, cloudUploadOutline, add, pencil, createOutline, trashOutline, chevronBackOutline, chevronForwardOutline, ellipsisVerticalOutline })
    
    let currentDate = new Date();
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    this.date = currentDate.toISOString()
    
    this.populateEntries(this.date)
    
    //console.log("gude")
    /*
    const test = async () => {
      store("hallo", { keyAlias: "test", promptTitle: "MollO", promptSubtitle: "gollo", promptNegativeButtonText: "hollo" }).then(() => {
        alert("stored")
        try {
          retrieve("test").then(pw => {
            alert(pw)
            console.log(pw)
          })
        } catch (e) {
          alert(JSON.stringify(e));
        }
      })
    }
    test()
    */
    /*
    alert("Mollo")
    const currentPlatform = platform()
    if(currentPlatform === "windows") {
      alert("cant check biometry")
      console.log("query for password")
    } else if(currentPlatform === "android") {
      alert("is on android")
      checkStatus().then(biometryStatus => {
        if(biometryStatus.biometryType !== BiometryType.None) {
          alert("has biometry")
          try {
            store("hallo", { keyAlias: "test" }).then(() => {
              alert("stored")
              try {
                retrieve("test").then(pw => {
                  alert(pw)
                  console.log(pw)
                })
              } catch (e) {
                alert(JSON.stringify(e));
              }
            })
          } catch (e) {
            alert(JSON.stringify(e));
          }
        } else alert("has no biometry")
      })
    }
    */
    
    //this.sync.google()
    //this.sync.listFiles()
    /*
    this.sync.getNewToken(this.sync.refreshToken).then(value => {
      console.log(value)
      this.sync.accessToken = value.access_token
    })
    */

    //const entries = this.dbService.getEntriesByDate(new Date().toISOString())

    /*
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
    */
  }
  
  async populateEntries(date: string) {
    this.entriesLoading = true
    this.hasEntriesForThisYear = false
    let entries: EntryViewRecord[] = await this.dbService.getEntriesByDate(date)
    const entriesByDay: Map<string, EntryViewRecord[]> = new Map()
    for(const entry of entries as any[]) {
      let otherEntriesFromThatDay = entriesByDay.get(entry.date)
      if (otherEntriesFromThatDay !== undefined) {
        otherEntriesFromThatDay.push(entry)
      } else entriesByDay.set(entry.date, [entry])
    }
    
    // sort days
    const entries2 = Array.from(entriesByDay)
      .sort((a, b) => new Date(b[0]).getTime()-new Date(a[0]).getTime())
      .map(value => value[1])
    
    
    // sort entries within days
    entries2.forEach(day => {
      day.sort((a, b) => a.entryIndex-b.entryIndex)
    })
    
    const thisYear = new Date().getFullYear()
    outer: for(const day of entries2){
      for(const entry of day){
        if(new Date(entry.date).getFullYear() === thisYear) {
          this.hasEntriesForThisYear = true
          break outer;
        }
      }
    }
    
    this.entries = entries2
    this.entriesLoading = false
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  async delete(entry: EntryDbRecord) {
    const db = this.dbService.database
    await db.execute("DELETE FROM entry WHERE id = $1", [entry.uuidv7])
    //this.entries.splice(this.entries.indexOf(entry), 1)
  }

  formatDate(date: string) {
    const dateObject = new Date(date)
    return `${dateObject.getFullYear()}
           (${dateObject.toLocaleDateString(undefined, {weekday: "long"})})`
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
        date1.getUTCDate() === date2.getUTCDate() &&
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
        
        const uuidv7 = v7()
        const entryIndex = await this.dbService.getMaxEntryIndexForDate(newEntryWithoutEntryIndex.date)
        
        const newEntry = new EntryDbRecord(
          uuidv7,
          newEntryWithoutEntryIndex.date,
          newEntryWithoutEntryIndex.written,
          entryIndex,
          newEntryWithoutEntryIndex.text,
          newEntryWithoutEntryIndex.images.map(image => image.filename),
          newEntryWithoutEntryIndex.syncStatus,
          null
        )
        await this.dbService.addEntry(newEntry)
        await this.populateEntries(this.date)
        if(!this.sync.isProbablyOffline) this.sync.uploadLocalChanges() // dont wait for upload
      }
    })
    
    await modal.present();
  }
  
  async selectedDate($event: any) {
    this.date = $event.detail.value;
    await this.populateEntries(this.date)
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
  
  thisYear() {
    return new Date().getFullYear()
  }
  
  async openEntry(date: string) {
    await this.router.navigate(["/specific-day"], { queryParams: { date: date } })
    //await this.navController.navigateRoot(["/specific-day"], { queryParams: { date: date } })
  }
  
  async handleRefresh($event: RefresherCustomEvent) {
    if(this.sync.isProbablyOffline) {
      await this.sync.checkInternetAccess()
      if(this.sync.isProbablyOffline) {
        const toast = await this.toastController.create({
          message: 'Du hast keinen Internetzugriff!',
          duration: 2000,
          position: "bottom",
        });
        
        await toast.present();
        await $event.target.complete()
        return
      }
    }
    await this.sync.downloadRemoteChanges()
    const localChanges = await this.sync.getLocalChanges()
    if(localChanges.length > 0) {
      setTimeout(async () => {
        console.log("also uploading local changes")
        await this.sync.upload(localChanges)
        await this.populateEntries(this.date)
        await $event.target.complete()
      }, 750)
    } else {
      await this.populateEntries(this.date)
      await $event.target.complete()
      console.log("downloaded remote changes without uploading local changes")
    }
  }
  
  async createPopover($event: MouseEvent, date: string) {
    const popover = await this.popoverController.create({
      component: SpecificDayPopoverComponent,
      event: $event,
      reference: "event"
    })
    popover.onDidDismiss().then(async e => {
      const { data, role } = e
      if(role === "delete") {
        // TODO delete all entries of day
        //await this.dbService.setSyncStatus(entry.uuidv7, "pending_delete")
        //await this.populateEntries(this.date)
      } else if(role === "edit") {
        await this.openEntry(date)
      } else if(role === "info") {
        console.log(JSON.stringify(data))
      }
      /*
      if(role === "confirm") {
        await this.dbService.setSyncStatus(entry.uuidv7, "pending_delete")
        await this.sync.uploadLocalChanges()
        //const entryDeletionPromise = this.dbService.deleteEntry(entry.id)
        //const imageDeletionPromises = entry.images.map(image => this.dbService.deleteImage(image.filename))
        //await Promise.all([...imageDeletionPromises, entryDeletionPromise])
        await this.populateEntries(this.date)
      }
      */
    })
    await popover.present()
  }
}
