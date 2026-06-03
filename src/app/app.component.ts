import { Component } from '@angular/core';

import {IonApp, IonRouterOutlet, Platform} from "@ionic/angular/standalone";
import {SynchronizationService} from "./services/synchronization.service";
import Quill from "quill";
import DiaryImageBlot from "./quill/diary-image-blot";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(private sync: SynchronizationService) {
    Quill.register(DiaryImageBlot);
    const Image = Quill.import('formats/image');
    // @ts-ignore
    Image.sanitize = function(url: string) {
      const allowedProtocols = ['http', 'https', 'blob']
      const protocol = url.split(':')[0].toLowerCase()
      return allowedProtocols.includes(protocol)
        ? url
        : '//:0';
    };
  }
}
