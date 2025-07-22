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
  IonIcon, IonLabel,
  IonTitle,
  IonToolbar, NavController
} from '@ionic/angular/standalone';
import {add, createOutline, pencil, trashOutline} from 'ionicons/icons';
import {addIcons} from "ionicons";
import {FormsModule} from "@angular/forms";
import {DatabaseService} from "../services/database.service";
import {Entry} from "../models/entry";

type Day = Entry[]

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, FormsModule, IonCardSubtitle, IonLabel],
})
export class HomePage {

  entries: Day[] = []

  constructor(private navController: NavController, private dbService: DatabaseService) {
    addIcons({ add, pencil, createOutline, trashOutline })

    const db = dbService.database
    const res2: Promise<Entry[]> = db.select("SELECT * FROM entry")
    res2.then(async (res) => {
      const entriesByDay: Map<string, Entry[]> = new Map()

      for(const entry of res) {
        const text = await dbService.decryptData(entry["text"], "silas")
        const entryObject = new Entry(
            entry["id"],
            entry["date"],
            entry["written"],
            text)
        console.log(entryObject.date)
        const day = entriesByDay.get(entryObject.date)
        if(day) day.push(entryObject)
        else entriesByDay.set(entryObject.date, [entryObject])
      }

      this.entries = Array.from(entriesByDay)
          .sort((a, b) => new Date(b[0]).getTime()-new Date(a[0]).getTime())
          .map(value => value[1])
      this.entries.forEach(entry => {entry.sort((a, b) => new Date(a.written).getTime()-new Date(b.written).getTime())})
    })
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  async delete(entry: Entry) {
    const db = this.dbService.database
    await db.execute("DELETE FROM entry WHERE id = $1", [entry.id])
    //this.entries.splice(this.entries.indexOf(entry), 1)
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {day: "numeric", month: "short", year: "2-digit", weekday: "long"});
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
}
