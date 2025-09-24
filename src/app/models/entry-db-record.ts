export class EntryDbRecord {
    id: number
    date: string
    written: string
    entryIndex: number
    text: string
    sync: boolean
    referencedImages: string[]
    syncStatus: "pending_create" | "synced" | "pending_delete" = "pending_create"
    driveFileId: string

    constructor(id: number,
                date: string,
                written: string,
                entryIndex: number,
                text: string,
                sync: boolean,
                referencedImages: string[],
                syncStatus: "pending_create" | "synced" | "pending_delete" = "pending_create",
                driveFileId: string) {
        this.id = id;
        this.date = date;
        this.written = written;
        this.entryIndex = entryIndex;
        this.text = text;
        this.sync = sync;
        this.referencedImages = referencedImages;
        this.syncStatus = syncStatus;
        this.driveFileId = driveFileId;
    }
}
