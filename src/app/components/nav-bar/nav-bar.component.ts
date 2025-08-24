import {Component, Input, OnInit} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonFooter,
  IonIcon,
  IonLabel,
  IonToolbar,
  NavController
} from "@ionic/angular/standalone";
import {addIcons} from "ionicons";
import {
  barChartOutline,
  homeOutline,
  todayOutline
} from "ionicons/icons";

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css'],
  imports: [
    IonButton,
    IonButtons,
    IonFooter,
    IonIcon,
    IonLabel,
    IonToolbar
  ],
  standalone: true
})
export class NavBarComponent  implements OnInit {

  @Input() host!: string

  constructor(private navController: NavController) {
    addIcons({ todayOutline, barChartOutline, homeOutline })
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  ngOnInit() {}

}
