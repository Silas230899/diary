import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonContent, IonHeader, IonInputOtp, IonTitle, IonToolbar} from '@ionic/angular/standalone';

@Component({
  selector: 'app-unlock',
  templateUrl: './unlock.page.html',
  styleUrls: ['./unlock.page.scss'],
  standalone: true,
    imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonInputOtp]
})
export class UnlockPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
