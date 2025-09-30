import {ImageView} from "./image-view";
import {SyncStatus} from "./syncStatusTypes";

export class EntryViewRecord {
  
  uuidv7: string
  date: string
  written: string
  entryIndex: number
  text: string
  images: ImageView[]
  syncStatus: SyncStatus
  driveFileId: string | null
  
  constructor(uuidv7: string,
              date: string,
              written: string,
              entryIndex: number,
              text: string,
              images: ImageView[],
              syncStatus: SyncStatus,
              driveFileId: string | null) {
    this.uuidv7 = uuidv7;
    this.date = date;
    this.written = written;
    this.entryIndex = entryIndex;
    this.text = text;
    this.images = images;
    this.syncStatus = syncStatus;
    this.driveFileId = driveFileId;
  }
  
}
