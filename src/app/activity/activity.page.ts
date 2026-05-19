import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonCardHeader, IonCardSubtitle, IonContent, IonHeader, IonTitle, IonToolbar} from '@ionic/angular/standalone';
import {DatabaseService} from "../services/database.service";
import {Router} from "@angular/router";
import {ActivityHeatmapComponent} from "../components/activity-heatmap/activity-heatmap.component";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";

@Component({
  selector: 'app-activity',
  templateUrl: './activity.page.html',
  styleUrls: ['./activity.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, ActivityHeatmapComponent, NavBarComponent, IonCardHeader, IonCardSubtitle]
})
export class ActivityPage implements OnInit {
  
  commitData: {date: string, count: number}[] = [];
  years: number[] = []
  
  distinctDaysCount: number | null = null;
  entryCount: number | null = null;
  
  constructor(private dbService: DatabaseService,
              private router: Router) {
    const t = Date.now();
    this.dbService.getHeatmapData().then(entries => {
      const years: Set<number> = new Set();
      let entryCount: number = 0
      for(const entry of entries) {
        years.add(new Date(entry.date).getUTCFullYear())
        entryCount += entry.count
      }
      this.commitData = entries
      this.years = Array.from(years).sort((a, b) => b - a)
      this.distinctDaysCount = entries.length
      this.entryCount = entryCount
      console.log(Date.now() - t)
    })
    /*
    this.dbService.getAllEntries().then(entries => {
      const years: Set<number> = new Set();
      const m: Map<string, number> = new Map()
      let distinctDays: Set<string> = new Set()
      for(const entry of entries) {
        years.add(new Date(entry.date).getUTCFullYear())
        const date = entry.date.split("T")[0]
        const current = m.get(date)
        if(current !== undefined) {
          m.set(date, current + 1)
        } else {
          m.set(date, 1)
        }
        
        // calc distinctDaysCount
        distinctDays.add(entry.date)
      }
      this.commitData = Array.of(...m.entries()).map(([date, count]) => ({date, count}))
      this.years = Array.from(years).sort((a, b) => b - a)
      this.distinctDaysCount = distinctDays.size
      this.entryCount = entries.length
    })
    */
  }

  ngOnInit() {
  }
  
  async openEntry(date: string) {
    await this.router.navigate(["/specific-day"], { queryParams: { date: date } })
  }

}
