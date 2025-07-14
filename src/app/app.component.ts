import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {IonApp, IonRouterOutlet} from "@ionic/angular/standalone";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
