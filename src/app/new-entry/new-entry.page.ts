import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
    IonButton, IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonContent,
    IonDatetime,
    IonDatetimeButton, IonFooter,
    IonHeader, IonIcon,
    IonImg, IonLabel,
    IonModal,
    IonTextarea,
    IonTitle,
    IonToolbar,
    NavController
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {add, homeOutline, createOutline, pencil, barChartOutline, peopleOutline, todayOutline, calendarNumberOutline } from "ionicons/icons";
import {DatabaseService} from "../services/database.service";
import {BaseDirectory, readFile} from "@tauri-apps/plugin-fs";

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.page.html',
  styleUrls: ['./new-entry.page.scss'],
  standalone: true,
    imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonDatetime, IonDatetimeButton, IonModal, IonTextarea, IonImg, IonFooter, IonButtons, IonIcon, IonLabel]
})
export class NewEntryPage implements OnInit {
    text = ""
    date: string
    written: string

    constructor(private navController: NavController, private dbService: DatabaseService) {
        addIcons({ add, pencil, createOutline, todayOutline, barChartOutline, peopleOutline, calendarNumberOutline, homeOutline })
        this.date = new Date().toISOString()
        this.written = new Date().toISOString()
    }

    async navigate(dst: string) {
        await this.navController.navigateRoot(`/${dst}`)
    }

  ngOnInit() {
  }


    async db() {
        const db = this.dbService.database
        const fromDate = new Date(this.date)
        const fromWritten = new Date(this.written)
        const data = await this.dbService.encryptData(this.text, "silas")

        //console.log("Enter " + this.date + ", " + this.written)

        const result1 = await db.execute(
            "INSERT into entry (date, written, text) VALUES (date($1), datetime($2), $3)",
            [this.date, this.written, data],
        );
        await this.navController.navigateRoot(`/home`)
    }

    imageSrc: string | null = null;

    async onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const filePath = (file as any).path ?? file.name; // in Tauri: file.path vorhanden

        try {
            const fileBytes = await readFile(filePath, { baseDir: BaseDirectory.Desktop });

            // Uint8Array -> Base64
            const base64 = btoa(
                new Uint8Array(fileBytes).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );

            this.imageSrc = `data:image/*;base64,${base64}`;
        } catch (err) {
            console.error('Fehler beim Laden:', err);
        }
    }

    triggerFileInput() {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        fileInput?.click();
    }
}
