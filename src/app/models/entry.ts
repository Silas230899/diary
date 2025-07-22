export class Entry {
    id: number
    date: string
    written: string
    text: string

    constructor(id: number, date: string, written: string, text: string) {
        this.id = id;
        this.date = date;
        this.written = written;
        this.text = text;
    }
}
