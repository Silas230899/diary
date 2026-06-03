import {Component, Input, OnInit} from '@angular/core';
import {NgClass} from "@angular/common";
import {IonCardHeader, IonCardSubtitle, IonCardTitle} from "@ionic/angular/standalone";
import {Router} from "@angular/router";

export interface CommitDay {
  date: string;
  count: number;
}

interface HeatmapCell {
  date: Date;
  count: number;
  currentMonth: boolean;
}

interface MonthMatrix {
  label: string;
  weeks: HeatmapCell[][];
  daysWithEntriesCount: number;
  entryCount: number;
}

@Component({
  selector: 'app-activity-heatmap',
  templateUrl: './activity-heatmap.component.html',
  styleUrls: ['./activity-heatmap.component.scss'],
  imports: [
    NgClass,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle
  ]
})
export class ActivityHeatmapComponent  implements OnInit {
  
  @Input({ required: true }) year!: number;
  @Input({ required: true }) data!: CommitDay[];
  
  readonly weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  
  months: MonthMatrix[] = [];
  
  daysWithEntriesCount: number = 0
  entryCount: number = 0
  
  constructor(private router: Router) {}
  
  ngOnInit() {
    this.generateMonths()
  }
  
  private generateMonths(): void {
    const commitMap = new Map<string, number>();
    
    this.data.forEach((d) => {
      commitMap.set(d.date, d.count);
    });
    
    this.months = [];
    
    for (let month = 11; month >= 0; month--) {
      if(new Date().getUTCFullYear() == this.year && month > new Date().getUTCMonth()) continue
      
      const firstDay = new Date(this.year, month, 1);
      const lastDay = new Date(this.year, month + 1, 0);
      
      const startDate = new Date(firstDay);
      
      // Zurück bis Montag
      while (this.getMondayIndex(startDate.getDay()) !== 0) {
        startDate.setDate(startDate.getDate() - 1);
      }
      
      const endDate = new Date(lastDay);
      
      // Vor bis Sonntag
      while (this.getMondayIndex(endDate.getDay()) !== 6) {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      const allDays: HeatmapCell[] = [];
      
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dateString = this.formatDate(current);
        
        allDays.push({
          date: new Date(current),
          count: commitMap.get(dateString) ?? 0,
          currentMonth:
            current.getMonth() === month &&
            current.getFullYear() === this.year,
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      let daysWithEntriesCount = 0
      let entryCount = 0
      for(const day of allDays) {
        if(day.currentMonth) {
          if(day.count > 0) {
            daysWithEntriesCount++
            entryCount += day.count
          }
        }
      }
      this.daysWithEntriesCount += daysWithEntriesCount;
      this.entryCount += entryCount;
      
      const weeks: HeatmapCell[][] = [];
      
      for (let i = 0; i < allDays.length; i += 7) {
        weeks.push(allDays.slice(i, i + 7));
      }
      
      this.months.push({
        label: firstDay.toLocaleString('de-DE', {
          month: 'long',
        }),
        weeks,
        daysWithEntriesCount,
        entryCount
      });
    }
  }
  
  getIntensity(count: number): string {
    if (count === 0) return 'level-0';
    if (count <= 1) return 'level-1';
    if (count <= 3) return 'level-2';
    if (count <= 5) return 'level-3';
    
    return 'level-4';
  }
  
  tooltip(cell: HeatmapCell): string {
    return `${cell.count} Einträge am ${this.formatDate(cell.date)}`;
  }
  
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Sonntag = 0
   * Montag = 0
   */
  private getMondayIndex(day: number): number {
    return (day + 6) % 7;
  }
  
  protected async clickedCell(date: Date) {
    const d = new Date(date.getTime() - date.getTimezoneOffset()*60*1000)
    await this.router.navigate(["/specific-day"], { queryParams: { date: d.toISOString() } })
  }
}
