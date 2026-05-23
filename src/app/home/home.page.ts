import {Component, ViewChild} from '@angular/core';
import {
  IonButton, IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent, IonDatetime, IonDatetimeButton,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon, IonItem, IonLabel, IonList, IonModal, IonPopover, IonProgressBar, IonRefresher,
  IonRefresherContent,
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
  informationCircleOutline,
  settingsOutline,
  enterOutline
} from 'ionicons/icons';
import {addIcons} from "ionicons";
import {FormsModule} from "@angular/forms";
import {DatabaseService} from "../services/database.service";
import {EntryDbRecord} from "../models/entry-db-record";
import {NewEntryComponent} from "../components/new-entry/new-entry.component";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {NewEntryWithoutEntryIndex} from "../models/new-entry-without-entry-index";
import {SynchronizationService} from "../services/synchronization.service";
import {EntryViewRecord} from "../models/entry-view-record";
import {EntryTextComponent} from "../components/entry-text/entry-text.component";
import {v7} from "uuid";
import {SpecificDayPopoverComponent} from "../components/specific-day-popover/specific-day-popover.component";
import {ToastController} from "@ionic/angular/standalone";
import {Router} from "@angular/router";
import {ImageDb} from "../models/image-db";
import {formatWrittenDate} from "../utils/dateStuff";
import {FormatWrittenDatePipe} from "../pipes/format-written-date-pipe";
import {CustomDatetimeComponent} from "../components/custom-datetime/custom-datetime.component";
import {CustomDatetimeValue} from "../components/custom-datetime/custom-datetime-value";

type Day = EntryViewRecord[]

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, FormsModule, NavBarComponent, EntryTextComponent, IonButtons, IonDatetime, IonDatetimeButton, IonModal, IonProgressBar, IonRefresher, IonRefresherContent, FormatWrittenDatePipe, CustomDatetimeComponent, IonPopover, IonList, IonItem, IonLabel],
})
export class HomePage {
  
  @ViewChild(IonContent) content!: IonContent;
  date: CustomDatetimeValue
  entries: { year: number, day: Day }[] = []
  entriesLoading = true
  hasEntriesForThisYear = false
  protected loadingModalOpen = false

  constructor(private navController: NavController,
              private popoverController: PopoverController,
              private dbService: DatabaseService,
              private modalCtrl: ModalController,
              protected sync: SynchronizationService,
              private toastController: ToastController,
              private router: Router) {
    addIcons({ enterOutline, settingsOutline, informationCircleOutline, cloudDoneOutline, cloudOfflineOutline, cloudUploadOutline, add, pencil, createOutline, trashOutline, chevronBackOutline, chevronForwardOutline, ellipsisVerticalOutline })
    
    let currentDate = new Date();
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    this.date = { month: currentDate.getUTCMonth() + 1, day: currentDate.getUTCDate() }
    
    this.populateEntries()
    
    /**
     * normally it takes < 150ms for the initialDownloadSync promise to fulfill,
     * so no modal is shown if there are no updates
     */
    if(!this.sync.downloadingProcessDone) {
      setTimeout(async () => {
        await this.showLoading()
      }, 150)
    } else {
      this.showLoading()
    }
    
  }
  
  /*
  async ionViewWillEnter() {
    await this.content.scrollByPoint(0, 50, 0)
  }
  */
  
  async showLoading() {
    if(this.sync.downloadingProcessDone) return
    
    this.loadingModalOpen = true
    
    this.sync.downloadingProcess.finally(async () => {
      await this.populateEntries()
      this.loadingModalOpen = false
    })
  }
  
  async populateEntries() {
    this.entriesLoading = true
    this.hasEntriesForThisYear = false
    const t = Date.now();
    let entries: EntryViewRecord[] = await this.dbService.getEntriesByDate(this.date)
    console.log(Date.now()-t)
    
    const thisYear = new Date().getUTCFullYear()
    
    const entriesByDay: Map<number, EntryViewRecord[]> = new Map()
    if(entries.length > 0) {
      const entriesMappedToYears = entries.map(entry => new Date(entry.date).getUTCFullYear())
      const lowestYear = Math.min(...entriesMappedToYears)
      for(let year = lowestYear; year <= thisYear; year++) {
        entriesByDay.set(year, [])
      }
    }
    for(const entry of entries as any[]) {
      const entryYear = new Date(entry.date).getUTCFullYear()
      let otherEntriesFromThatDay = entriesByDay.get(entryYear)
      if (otherEntriesFromThatDay !== undefined) {
        otherEntriesFromThatDay.push(entry)
      } else {
        console.error("sollte nie vorkommen")
        entriesByDay.set(new Date(entry.date).getUTCFullYear(), [entry])
      }
    }
    
    // sort days
    const yearWithDay = Array.from(entriesByDay)
      .sort((a, b) => b[0]-a[0])
      .map(([year, day]) => ({ year: year, day: day }))
    
    
    // sort entries within days
    yearWithDay.forEach(({ year, day }) => {
      day.sort((a, b) => a.entryIndex-b.entryIndex)
    })
    
    const entriesForThisYear = entriesByDay.get(thisYear)
    this.hasEntriesForThisYear = entriesForThisYear === undefined ? false : entriesForThisYear.length > 0
    
    this.entries = yearWithDay
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
    return `${dateObject.getUTCFullYear()}
           (${dateObject.toLocaleDateString(undefined, {weekday: "long"})})`
  }
  
  formatDate2(year: number) {
    const dateObject = new Date(Date.UTC(year, this.date.month - 1, this.date.day))
    return `${year}
           (${dateObject.toLocaleDateString(undefined, {weekday: "long"})})`
  }

  async openNewEntryModal() {
    const modal = await this.modalCtrl.create({
      component: NewEntryComponent,
      componentProps: {
        date: this.date
      }
    });
    
    modal.onWillDismiss().then(async e => {
      const { data, role } = e
      if(role === "confirm") {
        const newEntryWithoutEntryIndex = data as NewEntryWithoutEntryIndex
        
        const uuidv7 = v7()
        const entryIndex = await this.dbService.getMaxEntryIndexForDate(newEntryWithoutEntryIndex.date)
        
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
        await Promise.all([...imagePromises, entryPromise])
        await this.populateEntries()
        if(this.sync.hasInternetAccess) this.sync.uploadLocalChanges() // dont wait for upload
      }
    })
    
    await modal.present();
  }
  
  async selectedDate($event: { value: CustomDatetimeValue | null }) {
    if($event.value !== null) {
      this.date = $event.value
      await this.populateEntries()
    }
  }
  
  // Helper function to navigate yearless dates
  private navigateYearlessDate(offset: 1 | -1): CustomDatetimeValue {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Always 29 days in Feb
    
    let newMonth = this.date.month;
    let newDay = this.date.day + offset;
    
    // Handle day overflow/underflow
    if (newDay > daysInMonth[newMonth - 1]) {
      newDay = 1;
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
      }
    } else if (newDay < 1) {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
      }
      newDay = daysInMonth[newMonth - 1];
    }
    
    return {month: newMonth, day: newDay};
  }
  
  async gotoYesterday() {
    this.date = this.navigateYearlessDate(-1);
    await this.populateEntries();
  }
  
  async gotoTomorrow() {
    this.date = this.navigateYearlessDate(1);
    await this.populateEntries();
  }
  
  getYesterdate() {
    return this.navigateYearlessDate(-1).day;
  }
  
  getTomorrowdate() {
    return this.navigateYearlessDate(1).day;
  }
  
  thisYear() {
    return new Date().getUTCFullYear()
  }
  
  async openEntry(date: string) {
    await this.router.navigate(["/specific-day"], { queryParams: { date: date } })
    //await this.navController.navigateRoot(["/specific-day"], { queryParams: { date: date } })
  }
  
  async handleRefresh($event: RefresherCustomEvent) {
    if(!this.sync.hasInternetAccess) {
      const toast = await this.toastController.create({
        message: 'Du hast keinen Internetzugriff!',
        duration: 1500,
        position: "bottom",
      });
      await toast.present();
      await $event.target.complete()
    } else {
      await $event.target.complete()
      this.loadingModalOpen = true
      await this.sync.downloadRemoteChanges()
      await this.populateEntries() // für uploading changes eig nicht nötig
      this.loadingModalOpen = false
      const localChanges = await this.sync.getLocalChanges()
      if(localChanges.length > 0) {
        setTimeout(async () => {
          console.log("also uploading local changes")
          await this.sync.upload(localChanges)
          await $event.target.complete()
        }, 750)
      } else {
        await $event.target.complete()
        console.log("downloaded remote changes without uploading local changes")
      }
    }
  }
  
  async createPopover($event: MouseEvent, entry: EntryViewRecord) {
    const popover = await this.popoverController.create({
      component: SpecificDayPopoverComponent,
      event: $event,
      reference: "event"
    })
    popover.onWillDismiss().then(async e => {
      const { data, role } = e
      if(role === "delete") {
        const toast = await this.toastController.create({
          message: 'Ganzen Tag löschen ist noch nicht möglich',
          duration: 2000,
          position: "bottom",
        });
        await toast.present()
        // TODO delete all entries of day
        //await this.dbService.setSyncStatus(entry.uuidv7, "pending_delete")
        //await this.populateEntries(this.date)
      } else if(role === "edit") {
        await this.openEntry(entry.date)
      } else if(role === "info") {
        const toast = await this.toastController.create({
          message: 'Informationen können noch nicht angezeigt werden',
          duration: 2000,
          position: "bottom",
        });
        await toast.present()
        console.log(entry.text.length)
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
  
  protected async clickedEntry(entry: EntryViewRecord) {
    // loads all images from db by filename
    const imagesDb: ImageDb[] = await Promise.all(entry.images.map((image) => this.dbService.getDBImage(image.filename)))
    if(imagesDb.length > 0) console.log("done loading images")
    
    const modal = await this.modalCtrl.create({
      component: NewEntryComponent,
      componentProps: {
        text: entry.text,
        date: entry.date,
        written: entry.written,
        customWrittenDate: true,
        sync: entry.syncStatus !== "keep_local",
        imagesViews: entry.images,
        imagesDb: imagesDb
      }
    });
    await modal.present()
  }
  
  protected async entryClicked(date: string) {
    await this.openEntry(date)
  }
  
  protected readonly formatDatetime = formatWrittenDate;
  
  protected openSettings() {
  
  }
  
  protected async openOnboarding() {
    await this.navController.navigateRoot(`/onboarding`)
  }
}
