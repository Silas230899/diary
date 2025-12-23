import {Component, OnInit, ViewChild} from '@angular/core';
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
import {Chart, ChartConfiguration, ChartType, registerables} from "chart.js";

Chart.register(...registerables);

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
  
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [5,2,3],
      label: "labeeel",
      steppedLine: true,
      backgroundColor: "#556677",
      borderColor: "#550099",
      fill: false,
      pointStyle: false,
      type: 'line',
      cubicInterpolationMode: 'monotone',
    } as any],
    labels: ["test", "hi", "mollo"],
  };
  
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

  constructor(private dbService: DatabaseService,
              private router: Router) {
    this.entries = this.dbService.getAllEntries()
    this.entries.then(entries => {
      console.log(entries.length)
    })
  }
  
  ngAfterViewInit() {
    const ctx = this.chart.nativeElement
    
    this.graph = new Chart(ctx, {
      type: this.lineChartType,
      data: this.lineChartData,
      options: this.lineChartOptions
    });
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
      let count = 0
      for (const entry of await this.entries) {
        let s1 = ""
        if(this.caseSensitive) {
          s1 = entry.text
        } else {
          s1 = entry.text.toLowerCase()
        }
        let thisCount = 0
        if(this.fullWords) {
          const allWords = s1.split(" ")
          thisCount = allWords.filter(word => word === search).length
        } else {
          thisCount = (s1.match(new RegExp(search, "g")) || []).length;
        }
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
      
      const entriesSortedByDate = Array.of(...resultFrequencies.entries())
        .sort((a, b) => new Date(a[0].date).getTime() - new Date(b[0].date).getTime())
        .map(entry => entry[0])
      
      const ctx = this.chart.nativeElement
      this.graph.destroy()
      this.graph = new Chart(ctx, {
        type: this.lineChartType,
        data: {
          datasets: [{
            data: entriesSortedByDate.map(entry => resultFrequencies.get(entry)),
            label: "labeeel",
            steppedLine: true,
            backgroundColor: "#556677",
            borderColor: "#550099",
            fill: false,
            pointStyle: false,
            type: 'line',
            cubicInterpolationMode: 'monotone',
          } as any],
          labels: entriesSortedByDate.map(entry => new Date(entry.date).toLocaleDateString()),
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
