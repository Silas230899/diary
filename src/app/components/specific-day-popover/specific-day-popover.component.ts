import { Component, OnInit } from '@angular/core';
import {IonContent, IonIcon, IonItem, IonList, ModalController, PopoverController} from "@ionic/angular/standalone";
import {addIcons} from "ionicons";
import { informationCircleOutline, trashOutline, pencilOutline } from "ionicons/icons"

@Component({
  selector: 'app-specific-day-popover',
  templateUrl: './specific-day-popover.component.html',
  styleUrls: ['./specific-day-popover.component.css'],
  imports: [
    IonContent,
    IonList,
    IonItem,
    IonIcon
  ],
  standalone: true
})
export class SpecificDayPopoverComponent  implements OnInit {

  constructor(private popoverCtrl: PopoverController) {
    addIcons({ informationCircleOutline, trashOutline, pencilOutline });
  }

  ngOnInit() {}
  
  delete() {
    return this.popoverCtrl.dismiss("", 'confirm');
  }
}
