import { Component } from '@angular/core';

import {IonApp, IonRouterOutlet, Platform} from "@ionic/angular/standalone";
import {SynchronizationService} from "./services/synchronization.service";
import Quill from "quill";
import DiaryImageBlot from "./quill/diary-image-blot";
import DiaryImageRowBlot from "./quill/diary-image-row-blot";
import {WhatsAppBubbleBlot} from "./quill/whatsapp-message-blot";
import {DatabaseService} from "./services/database.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(private sync: SynchronizationService, private db: DatabaseService) {
    let currentDate = new Date();
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    const date = { month: currentDate.getUTCMonth() + 1, day: currentDate.getUTCDate() }
    db.preloadDate(date)
    
    Quill.register(DiaryImageRowBlot);
    Quill.register(DiaryImageBlot);
    DiaryImageRowBlot["allowedChildren"] = [DiaryImageBlot];
    Quill.register(WhatsAppBubbleBlot)
    
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
