import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  NavController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, createOutline, pencil} from "ionicons/icons";

@Component({
  selector: 'app-today',
  templateUrl: './today.page.html',
  styleUrls: ['./today.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle]
})
export class TodayPage implements OnInit {

  constructor(private navController: NavController) {
    addIcons({ add, pencil, createOutline })
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  ngOnInit() {
  }

}
