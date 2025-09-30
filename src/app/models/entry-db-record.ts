import {SyncStatus} from "./syncStatusTypes";

export class EntryDbRecord {
    
    uuidv7: string
    date: string
    written: string
    entryIndex: number
    text: string
    referencedImages: string[]
    syncStatus: SyncStatus
    driveFileId: string | null

    constructor(uuidv7: string,
                date: string,
                written: string,
                entryIndex: number,
                text: string,
                referencedImages: string[],
                syncStatus: SyncStatus,
                driveFileId: string | null) {
        this.uuidv7 = uuidv7;
        this.date = date;
        this.written = written;
        this.entryIndex = entryIndex;
        this.text = text;
        this.referencedImages = referencedImages;
        this.syncStatus = syncStatus;
        this.driveFileId = driveFileId;
    }
}
