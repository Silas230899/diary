export class NewEntry {
  
  date: string
  written: string
  entryIndex: number
  text: string
  sync: boolean
  referencedImages: string[]
  
  constructor(date: string,
              written: string,
              entryIndex: number,
              text: string,
              sync: boolean,
              referencedImages: string[]) {
    this.date = date;
    this.written = written;
    this.entryIndex = entryIndex;
    this.text = text;
    this.sync = sync;
    this.referencedImages = referencedImages;
  }
}
