import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonLabel, IonModal,
  IonTitle,
  IonToolbar,
  NavController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add} from "ionicons/icons";

@Component({
  selector: 'app-specific-day',
  templateUrl: './specific-day.page.html',
  styleUrls: ['./specific-day.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonDatetimeButton, IonModal, IonDatetime, IonLabel]
})
export class SpecificDayPage implements OnInit {

  constructor(private navController: NavController) {
    addIcons({ add })
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  ngOnInit() {
  }

}
