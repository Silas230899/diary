import {ImageDb} from "./image-db";
import {SyncStatus} from "./syncStatusTypes";

export class NewEntryWithoutEntryIndex {
  
  date: string
  written: string
  text: string
  images: ImageDb[]
  syncStatus: SyncStatus
  
  constructor(date: string,
              written: string,
              text: string,
              images: ImageDb[],
              syncStatus: SyncStatus,) {
    this.date = date;
    this.written = written;
    this.text = text;
    this.images = images;
    this.syncStatus = syncStatus;
  }
}
