import { Component, OnInit } from '@angular/core';
import {IonContent, IonItem, IonList, ModalController, PopoverController} from "@ionic/angular/standalone";

@Component({
  selector: 'app-specific-day-popover',
  templateUrl: './specific-day-popover.component.html',
  styleUrls: ['./specific-day-popover.component.css'],
  imports: [
    IonContent,
    IonList,
    IonItem
  ],
  standalone: true
})
export class SpecificDayPopoverComponent  implements OnInit {

  constructor(private popoverCtrl: PopoverController) { }

  ngOnInit() {}
  
  delete() {
    return this.popoverCtrl.dismiss("", 'confirm');
  }
}
