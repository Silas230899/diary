import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
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
  homeOutline,
  todayOutline,
  searchOutline,
  flameOutline
} from "ionicons/icons";
import {ActivatedRoute} from "@angular/router";

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
export class NavBarComponent implements OnInit {

  @Input() host!: string
  
  @Output() onNavigateToSelf = new EventEmitter()

  constructor(private navController: NavController, private route: ActivatedRoute) {
    addIcons({ flameOutline, todayOutline, homeOutline, searchOutline })
  }

  async navigate(page: string) {
    if(this.route.snapshot.routeConfig?.path === page) {
      this.onNavigateToSelf.emit()
    } else {
      await this.navController.navigateRoot(`/${page}`)
    }
  }

  ngOnInit() {}

}
