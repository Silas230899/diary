export class Entry {
    id: number
    date: string
    written: string
    entryIndex: number
    text: string
    sync: boolean

    constructor(id: number, date: string, written: string, entryIndex: number, text: string, sync: boolean) {
        this.id = id;
        this.date = date;
        this.written = written;
        this.entryIndex = entryIndex;
        this.text = text;
        this.sync = sync;
    }
}
