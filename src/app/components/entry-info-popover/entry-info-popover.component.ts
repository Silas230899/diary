import {Component, Input, OnInit} from '@angular/core';
import {IonContent, IonIcon, IonItem, IonItemDivider, IonLabel, IonList} from "@ionic/angular/standalone";
import {EntryViewRecord} from "../../models/entry-view-record";
import {SyncStatus} from "../../models/syncStatusTypes";
import {addIcons} from "ionicons";
import {cloudDoneOutline, cloudOfflineOutline, cloudUploadOutline, trashOutline} from "ionicons/icons";

@Component({
  selector: 'app-entry-info-popover',
  templateUrl: './entry-info-popover.component.html',
  styleUrls: ['./entry-info-popover.component.css'],
  imports: [
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonItemDivider
  ]
})
export class EntryInfoPopoverComponent  implements OnInit {
  
  @Input() entry!: EntryViewRecord
  protected words!: number;
  protected images!: number;
  protected syncStatus!: SyncStatus
  protected uuidv7!: string;
  protected entryIndex!: number;
  
  constructor() {
    addIcons({cloudDoneOutline, cloudOfflineOutline, cloudUploadOutline, trashOutline});
  }

  ngOnInit() {
    this.words = this.entry.text.split(" ").length
    this.images = this.entry.images.length
    this.syncStatus = this.entry.syncStatus
    this.uuidv7 = this.entry.uuidv7
    this.entryIndex = this.entry.entryIndex
  }

}
