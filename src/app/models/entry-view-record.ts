import {ImageView} from "./image-view";

export class EntryViewRecord {
  
  id: number
  date: string
  written: string
  entryIndex: number
  text: string
  sync: boolean
  images: ImageView[]
  syncStatus: "pending_create" | "synced" | "pending_delete" = "pending_create"
  driveFileId: string
  
  constructor(id: number,
              date: string,
              written: string,
              entryIndex: number,
              text: string,
              sync: boolean,
              images: ImageView[],
              syncStatus: "pending_create" | "synced" | "pending_delete" = "pending_create",
              driveFileId: string) {
    this.id = id;
    this.date = date;
    this.written = written;
    this.entryIndex = entryIndex;
    this.text = text;
    this.sync = sync;
    this.images = images;
    this.syncStatus = syncStatus;
    this.driveFileId = driveFileId;
  }
  
}
