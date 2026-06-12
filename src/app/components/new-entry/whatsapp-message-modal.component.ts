import {Component, OnInit} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController
} from "@ionic/angular/standalone";
import {FormsModule} from "@angular/forms";
import {addIcons} from "ionicons";
import {checkmarkOutline, closeOutline} from "ionicons/icons";

export interface WhatsAppMessageModalResult {
  text: string;
  senderName?: string;
  time?: string;
}

@Component({
  selector: 'app-whatsapp-message-modal',
  templateUrl: './whatsapp-message-modal.component.html',
  styleUrls: ['./whatsapp-message-modal.component.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonInput,
    IonTextarea,
    IonIcon
  ],
  standalone: true
})
export class WhatsAppMessageModalComponent implements OnInit {
  text = "";
  senderName = "";
  time = "";

  constructor(private modalCtrl: ModalController) {
    addIcons({ checkmarkOutline, closeOutline })
  }

  ngOnInit() {}

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm() {
    const text = this.text.trim();
    if(!text) return;

    const result: WhatsAppMessageModalResult = {
      text,
      senderName: this.senderName.trim() || undefined,
      time: this.time.trim() || undefined
    };

    return this.modalCtrl.dismiss(result, 'confirm');
  }
}
