import {Component, Input, OnInit} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonImg, IonLabel,
  IonModal, IonNote, IonTextarea,
  IonTitle, IonToggle,
  IonToolbar, ModalController, NavController
} from "@ionic/angular/standalone";
import {FormsModule} from "@angular/forms";
import {addIcons} from "ionicons";
import {
  add,
  barChartOutline,
  calendarNumberOutline,
  createOutline, homeOutline,
  pencil,
  peopleOutline,
  todayOutline,
    checkmarkOutline,
    closeOutline
} from "ionicons/icons";
import {DatabaseService} from "../../services/database.service";
import {CryptoService} from "../../services/crypto.service";

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.component.html',
  styleUrls: ['./new-entry.component.css'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButton,
    IonButtons,
    IonTitle,
    IonContent,
    FormsModule,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonTextarea,
    IonIcon,
    IonToggle,
    IonNote,
    IonLabel,
    IonImg
  ],
  standalone: true
})
export class NewEntryComponent  implements OnInit {
  
  @Input() entryIndex: number | null = null;

  text = ""
  @Input() date: string
  written: string
  sync = true
  imgsrc: string | undefined

  constructor(private modalCtrl: ModalController,
              private navController: NavController,
              private dbService: DatabaseService,
              private crypto: CryptoService) {
    addIcons({ closeOutline, checkmarkOutline, add, pencil, createOutline, todayOutline, barChartOutline, peopleOutline, calendarNumberOutline, homeOutline })
    this.date = new Date().toISOString()
    this.written = new Date().toISOString()
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm() {
      await this.db()
    return this.modalCtrl.dismiss(null, 'confirm');
  }

  ngOnInit() {}

  async db() {
      const db = this.dbService.database
      const fromDate = new Date(this.date)
      const fromWritten = new Date(this.written)
      const data = await this.crypto.encryptData(this.text)
    
    let entryIndex = this.entryIndex
    if (entryIndex === null) {
      const res = await this.dbService.database.select("SELECT MAX(entryIndex) AS entryIndex FROM entry WHERE date = date($1)", [this.date])
      // @ts-ignore
      const currentMax = res[0].entryIndex
      entryIndex = currentMax + 1
    }

      const result1 = await db.execute(
          "INSERT into entry (date, written, entryIndex, text, sync) VALUES (date($1), datetime($2), $3, $4, $5)",
          [this.date, this.written, entryIndex, data, this.sync],
      );
      //await this.navController.navigateRoot(`/home`)
  }
  
  openFileDialog() {
    // @ts-ignore
    document.getElementById("file-upload").click();
  }
  
  setImage(event: any) {
    console.log(event.target.files[0]);
    const reader = new FileReader()
    
    // Wandelt die Datei in Base64 um
    reader.onload = (e) => {
      // @ts-ignore
      this.imgsrc = e.target.result // Base64 Data-URL setzen
      
      // @ts-ignore
      console.log(new Blob([this.imgsrc]).size)
      //console.log('Base64:', e.target.result) // Kannst du für Upload verwenden
    }
    
    reader.readAsDataURL(event.target.files[0])
  }

}
