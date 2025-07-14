import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonButton,
    IonCard,
    IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
    IonContent, IonDatetime, IonDatetimeButton,
    IonHeader, IonModal, IonTextarea,
    IonTitle,
    IonToolbar, NavController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, createOutline, pencil} from "ionicons/icons";

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.page.html',
  styleUrls: ['./new-entry.page.scss'],
  standalone: true,
    imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonDatetime, IonDatetimeButton, IonModal, IonTextarea]
})
export class NewEntryPage implements OnInit {

    constructor(private navController: NavController) {
        addIcons({ add, pencil, createOutline })
    }

    async navigate(dst: string) {
        await this.navController.navigateRoot(`/${dst}`)
    }

  ngOnInit() {
  }


}
