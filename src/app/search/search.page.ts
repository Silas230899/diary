import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonDatetime,
  IonHeader, IonItem, IonLabel,
  IonList, IonListHeader,
  IonSearchbar,
  IonTitle, IonToggle,
  IonToolbar
} from '@ionic/angular/standalone';
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {DatabaseService} from "../services/database.service";
import {EntryDbRecord} from "../models/entry-db-record";
import {Router} from "@angular/router";

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonSearchbar, NavBarComponent, IonDatetime, IonList, IonItem, IonLabel, IonListHeader, IonButton, IonToggle]
})
export class SearchPage implements OnInit {
  
  entries
  results: EntryDbRecord[] = []
  resultCount = 0

  constructor(private dbService: DatabaseService,
              private router: Router) {
    this.entries = this.dbService.getAllEntries()
  }
  
  async search($event: any) {
    const search = $event.detail.value.toLowerCase()
    const resultFrequencies = new Map<EntryDbRecord, number>()
    if(search.length > 0) {
      let count = 0
      for (const entry of await this.entries) {
        const s1 = entry.text.toLowerCase()
        const thisCount = (s1.match(new RegExp(search, "g")) || []).length;
        count += thisCount
        resultFrequencies.set(entry, thisCount)
      }
      const sortedEntries = Array.of(...resultFrequencies.entries())
        .filter(entry => entry[1] > 0)
        .sort((a, b) => a[1] - b[1])
        .map(entry => entry[0])
      this.results = sortedEntries
      //console.log(count)
      this.resultCount = count
    } else {
      this.resultCount = 0
      this.results = []
    }
  }

  ngOnInit() {
  }
  
  async openEntry(date: string) {
    await this.router.navigate(["/specific-day"], { queryParams: { date: date } })
  }
  
  formatDate(date: string) {
    const dateObject = new Date(date)
    return `${dateObject.toLocaleDateString(undefined, {day: "2-digit", month: "short", year: "numeric"})}`
  }
}
