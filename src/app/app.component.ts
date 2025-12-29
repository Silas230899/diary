import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {IonApp, IonRouterOutlet, Platform} from "@ionic/angular/standalone";
import {SynchronizationService} from "./services/synchronization.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(private sync: SynchronizationService) {}
}
