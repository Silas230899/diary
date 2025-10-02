import {ImageDb} from "./image-db";
import {SyncStatus} from "./syncStatusTypes";

export class NewEntryWithoutEntryIndex {
  
  date: string
  written: string | null
  writtenHasTime: boolean | null
  text: string
  images: ImageDb[]
  syncStatus: SyncStatus
  
  constructor(date: string,
              written: string | null,
              writtenHasTime: boolean | null,
              text: string,
              images: ImageDb[],
              syncStatus: SyncStatus,) {
    this.date = date;
    this.written = written;
    this.writtenHasTime = writtenHasTime;
    this.text = text;
    this.images = images;
    this.syncStatus = syncStatus;
  }
}
