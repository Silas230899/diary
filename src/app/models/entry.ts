export class Entry {
    id: number
    date: string
    written: string
    entryId: number
    text: string

    constructor(id: number, date: string, written: string, entryId: number, text: string) {
        this.id = id;
        this.date = date;
        this.written = written;
        this.entryId = entryId;
        this.text = text;
    }
}
