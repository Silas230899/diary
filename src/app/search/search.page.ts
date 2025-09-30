import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonContent, IonDatetime, IonHeader, IonSearchbar, IonTitle, IonToolbar} from '@ionic/angular/standalone';
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonSearchbar, NavBarComponent, IonDatetime]
})
export class SearchPage implements OnInit {

  constructor() {
  
  }
  
  async search() {

  }

  ngOnInit() {
  }

}
