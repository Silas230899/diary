import {Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonDatetime, IonDatetimeButton,
  IonHeader, IonImg, IonItem, IonLabel,
  IonList, IonListHeader, IonModal,
  IonSearchbar, IonThumbnail,
  IonTitle, IonToggle,
  IonToolbar
} from '@ionic/angular/standalone';
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {DatabaseService} from "../services/database.service";
import {EntryDbRecord} from "../models/entry-db-record";
import {Router} from "@angular/router";
import {Chart, ChartConfiguration, ChartType, registerables} from "chart.js";
import {ImageNameToObjectURLPipe} from "../pipes/image-name-to-object-url-pipe";

Chart.register(...registerables);

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonSearchbar, NavBarComponent, IonDatetime, IonList, IonItem, IonLabel, IonListHeader, IonButton, IonToggle, IonDatetimeButton, IonModal, IonImg, ImageNameToObjectURLPipe, IonThumbnail, IonBadge, NgOptimizedImage]
})
export class SearchPage implements OnInit {
  
  entries
  results: EntryDbRecord[] = []
  resultCount = 0
  
  public lineChartOptions: ChartConfiguration['options'] = {
    //indexAxis: "y",
    // @ts-ignore
    barPercentage: 1,
    categoryPercentage: 0.95,
    maintainAspectRatio: true,
    elements: {
      line: {
        tension: 0.5,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        position: 'left',
      },
      x: {
        ticks: {
          //color: '#ff3884',
          //stepSize: 1,
          font: {
            //size: 5,
          },
          //autoSkip: false,
          maxRotation: 90,
        },
        /*
        type: 'time',
        time: {
          unit: 'day'
        }
        */
      }
    },
    plugins: {
      legend: { display: true },
      /*
      decimation: {
        enabled: true,
        algorithm: 'lttb',
        samples: 30
      }
      */
    },
    animation: {
      //duration: 500,
    }
  };
  
  public lineChartType: ChartType = 'bar';
  
  @ViewChild("baseChart") chart!: any;
  
  graph!: Chart
  
  fullWords = true
  searchString = ""
  protected caseSensitive = false;
  protected startDate: string;

  constructor(private dbService: DatabaseService,
              private router: Router) {
    this.startDate = new Date(new Date().getTime() - 100*24*60*60*1000).toISOString()
    this.entries = this.dbService.getAllEntries()
  }
  
  async search() {
    //const search = $event.detail.value.toLowerCase()
    let search = ""
    if(this.caseSensitive) {
      search = this.searchString
    } else {
      search = this.searchString.toLowerCase()
    }
    const resultFrequencies = new Map<EntryDbRecord, number>()
    if(search.length > 0) {
      let earliest = new Date(this.startDate)
      earliest.setUTCHours(0, 0, 0, 0)
      const entries = await this.entries
      const entriesInRange = entries.filter(entry => new Date(entry.date).getTime() >= earliest.getTime())
      
      const satzzeichen = [",", ";", ".", ":", "-", "_", "#", "'", "*", "\"", "%", "@", "€", "(", ")", "/", "\\", "{", "}", "[", "]"]
        .filter(satzzeichen => !search.includes(satzzeichen))
        .map(satzzeichen => `\\${satzzeichen}`)
      const satzzeichenjoined = satzzeichen.join("")
      let count = 0
      for (const entry of entriesInRange) {
        let s1 = ""
        if(this.caseSensitive) {
          s1 = entry.text
        } else {
          s1 = entry.text.toLowerCase()
        }
        s1 = s1.replaceAll(new RegExp(`[${satzzeichenjoined}]`, "g"), " ")
        let thisCount = 0
        if(this.fullWords) {
          const allWords = s1.split(" ")
          thisCount = allWords.filter(word => word === search).length
        } else {
          thisCount = (s1.match(new RegExp(search)) || []).length;
        }
        count += thisCount
        resultFrequencies.set(entry, thisCount)
      }
      const entriesSortedByFrequency = Array.of(...resultFrequencies.entries())
        .filter(entry => entry[1] > 0)
        .sort((a, b) => a[1] - b[1])
        .map(entry => entry[0])
      this.results = entriesSortedByFrequency
      //console.log(count)
      this.resultCount = count
      
      const sameDaysCombined = new Map<string, number>
      const latest = new Date()
      latest.setUTCHours(0, 0, 0, 0)
      while(earliest.getTime() <= latest.getTime()) {
        sameDaysCombined.set(earliest.toISOString(), 0)
        earliest = new Date(earliest.getTime() + 24*60*60*1000)
      }
      sameDaysCombined.set(latest.toISOString(), 0)
      for(const entry of resultFrequencies.entries()) {
        const current = sameDaysCombined.get(entry[0].date)
        if(current !== undefined) {
          sameDaysCombined.set(entry[0].date, current + entry[1])
        } else {
          sameDaysCombined.set(entry[0].date, entry[1])
        }
      }
      
      const entriesSortedByDate = Array.of(...sameDaysCombined.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(entry => entry[0])
      
      const ctx = this.chart.nativeElement
      if(this.graph) this.graph.destroy()
      this.graph = new Chart(ctx, {
        type: this.lineChartType,
        data: {
          datasets: [{
            data: entriesSortedByDate.map(entry => sameDaysCombined.get(entry)),
            label: "Anzahl",
            steppedLine: true,
            backgroundColor: "#e129c6",
            //borderColor: "#550099",
            fill: false,
            pointStyle: false,
            type: 'bar',
            cubicInterpolationMode: 'monotone',
          } as any],
          labels: entriesSortedByDate.map(entry => new Date(entry).toLocaleDateString()),
        },
        options: this.lineChartOptions
      });
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
