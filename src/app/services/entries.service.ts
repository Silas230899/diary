import { Injectable } from '@angular/core';
import {EntryViewRecord} from "../models/entry-view-record";
import {DatabaseService} from "./database.service";

@Injectable({
  providedIn: 'root'
})
export class EntriesService {
  
  private map = new Map<string, EntryViewRecord[]>
  
  constructor(private dbService: DatabaseService,) {
    let currentDate = new Date();
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    currentDate.setUTCHours(0, 0, 0, 0)
    this.preload(currentDate.toISOString())
  }
  
  async preload(date: string) {
    let entries: EntryViewRecord[] = await this.dbService.getEntriesBySpecificDate(date)
    this.map.set(date, entries);
  }
  
  async getEntryByDate(date: string) {
    if(!this.map.has(date)) await this.preload(date)
    return this.map.get(date)!
  }
  
}
