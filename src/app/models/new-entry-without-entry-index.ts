import {ImageDb} from "./image-db";

export class NewEntryWithoutEntryIndex {
  
  date: string
  written: string
  text: string
  sync: boolean
  images: ImageDb[]
  
  constructor(date: string, written: string, text: string, sync: boolean, images: ImageDb[]) {
    this.date = date;
    this.written = written;
    this.text = text;
    this.sync = sync;
    this.images = images;
  }
}
