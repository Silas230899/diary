import {Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonDatetime, IonDatetimeButton,
  IonHeader, IonItem, IonLabel,
  IonList, IonListHeader, IonModal,
  IonSearchbar, IonSegment, IonSegmentButton, IonThumbnail,
  IonToggle,
  IonToolbar
} from '@ionic/angular/standalone';
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {DatabaseService} from "../services/database.service";
import {EntryDbRecord} from "../models/entry-db-record";
import {Router} from "@angular/router";
import {Chart, ChartConfiguration, ChartType, registerables} from "chart.js";
import {ImageNameToObjectURLPipe} from "../pipes/image-name-to-object-url-pipe";
import {DeltaToTextPipe} from "../pipes/delta-to-text-pipe";

Chart.register(...registerables);

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, CommonModule, FormsModule, IonSearchbar, NavBarComponent, IonDatetime, IonList, IonItem, IonLabel, IonListHeader, IonToggle, IonDatetimeButton, IonModal, ImageNameToObjectURLPipe, IonThumbnail, NgOptimizedImage, DeltaToTextPipe, IonSegment, IonSegmentButton]
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
  
  @ViewChild("searchbar") searchbar!: IonSearchbar
  
  graph!: Chart
  
  fullWords = true
  searchString = ""
  protected caseSensitive = false;
  
  protected selectedTimePeriodSegment: 'all' | 'year' | 'ytd' | 'month' | 'custom' = 'ytd'
  protected fromDateValue!: string;
  protected toDateValue!: string;
  
  private earliestDate: Promise<string>

  constructor(private dbService: DatabaseService,
              private router: Router) {
    
    //const t = Date.now()
    this.entries = this.dbService.getAllEntries()
    
    this.earliestDate = new Promise<string>(async (resolve, reject) => {
      const entries = await this.entries
      let earliest = entries[0]
      for(const entry of entries) {
        if(new Date(entry.date).getTime() < new Date(earliest.date).getTime()) earliest = entry
      }
      resolve(earliest.date)
    })
    
    void this.evalSelectedTimePeriodSegment()
    /**
    this.entries.then(entries => {
      console.log("time load ms: ", Date.now() - t)
      let earliest = entries[0]
      for(const entry of entries) {
        if(new Date(entry.date).getTime() < new Date(earliest.date).getTime()) earliest = entry
      }
      this.startDate = earliest.date
    })**/
  }
  
  async search() {
    //const search = $event.detail.value.toLowerCase()
    let search = ""
    if(this.caseSensitive) {
      search = this.searchString
    } else {
      search = this.searchString.toLowerCase()
    }
    if(search.length > 0) {
      
      const resultFrequencies = new Map<EntryDbRecord, number>()
      const earliest = new Date(this.fromDateValue)
      earliest.setUTCHours(0, 0, 0, 0)
      const latest = new Date(this.toDateValue)
      latest.setUTCHours(23, 59, 59, 999)
      const entries = await this.entries
      const entriesInRange = entries.filter(entry => new Date(entry.date).getTime() >= earliest.getTime() && new Date(entry.date).getTime() <= latest.getTime())
      
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
      const entriesSortedByDate2 = Array.of(...resultFrequencies.entries())
        .filter(entry => entry[1] > 0)
        .sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime())
        .map(entry => entry[0])
      this.results = entriesSortedByDate2
      //console.log(count)
      this.resultCount = count
      
      const sameDaysCombined = new Map<string, number>
      //const latest = new Date()
      //latest.setUTCHours(0, 0, 0, 0)
      let current = earliest
      while(current.getTime() <= latest.getTime()) {
        sameDaysCombined.set(current.toISOString(), 0)
        current = new Date(current.getTime() + 24*60*60*1000)
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
      
      const data = entriesSortedByDate.map(entry => sameDaysCombined.get(entry))
      const labels = entriesSortedByDate.map(entry => new Date(entry).toLocaleDateString())
      const ctx = this.chart.nativeElement
      if(this.graph) this.graph.destroy()
      this.graph = new Chart(ctx, {
        type: this.lineChartType,
        data: {
          datasets: [{
            data: data,
            label: "Anzahl",
            steppedLine: true,
            backgroundColor: "#e129c6",
            //borderColor: "#550099",
            fill: false,
            pointStyle: false,
            type: 'bar',
            cubicInterpolationMode: 'monotone',
          } as any],
          labels: labels,
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
  
  ionViewDidEnter() {
    this.searchbar.setFocus()
  }
  
  async openEntry(date: string) {
    await this.router.navigate(["/specific-day"], { queryParams: { date: date } })
  }
  
  formatDate(date: string) {
    const dateObject = new Date(date)
    return `${dateObject.toLocaleDateString(undefined, {day: "2-digit", month: "short", year: "numeric"})}`
  }
  
  private async evalSelectedTimePeriodSegment() {
    const timezoneOffsetMilliseconds = new Date().getTimezoneOffset() * 60 * 1000
    const today = new Date(Date.now() - timezoneOffsetMilliseconds).toISOString()
    switch (this.selectedTimePeriodSegment) {
      case "month": {
        const from = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000 - timezoneOffsetMilliseconds)
        this.fromDateValue = from.toISOString()
        
        this.toDateValue = today
        break
      }
      case "year": {
        const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 - timezoneOffsetMilliseconds)
        this.fromDateValue = from.toISOString()
        
        this.toDateValue = today
        break;
      }
      case "all": {
        this.fromDateValue = await this.earliestDate
        
        this.toDateValue = today
        break;
      }
      case "ytd": {
        const from = new Date(Date.now() - timezoneOffsetMilliseconds)
        from.setUTCMonth(0, 1)
        this.fromDateValue = from.toISOString()
        
        this.toDateValue = today
        break;
      }
      case "custom":
        break;
    }
  }
  
  protected async timePeriodSegmentChanged($event: any) {
    this.selectedTimePeriodSegment = $event.detail.value
    await this.evalSelectedTimePeriodSegment()
    await this.search()
  }
  
  protected async dateChanged($event: any) {
    const fromDate = new Date(this.fromDateValue)
    fromDate.setUTCHours(0, 0, 0, 0)
    const toDate = new Date(this.toDateValue)
    toDate.setUTCHours(23, 59, 59, 999)
    await this.search()
  }
}
