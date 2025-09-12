import {Component} from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader, IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon, IonInput, IonLabel,
  IonTitle,
  IonToolbar, ModalController, NavController
} from '@ionic/angular/standalone';
import {add, createOutline, pencil, trashOutline} from 'ionicons/icons';
import {addIcons} from "ionicons";
import {FormsModule} from "@angular/forms";
import {DatabaseService} from "../services/database.service";
import {Entry} from "../models/entry";
import {NewEntryComponent} from "../components/new-entry/new-entry.component";
import {NavBarComponent} from "../components/nav-bar/nav-bar.component";
import {OAuth2Client} from "google-auth-library";
import {getCurrent} from "@tauri-apps/plugin-deep-link";
import {openUrl} from "@tauri-apps/plugin-opener";
import {listen} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";

type Day = Entry[]

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
    imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, FormsModule, IonCardSubtitle, IonLabel, IonInput, NavBarComponent],
})
export class HomePage {

  entries: Day[] = []

  constructor(private navController: NavController, private dbService: DatabaseService, private modalCtrl: ModalController) {
    addIcons({ add, pencil, createOutline, trashOutline })

    const db = dbService.database
    const res2: Promise<Entry[]> = db.select("SELECT * FROM entry")
    res2.then(async (res) => {
      const entriesByDay: Map<string, Entry[]> = new Map()

      for(const entry of res) {
        const text = await dbService.decryptData(entry["text"], "silas")
        const entryObject = new Entry(
            entry["id"],
            entry["date"],
            entry["written"],
            entry["entryId"],
            text)
        console.log(entryObject.date)
        const day = entriesByDay.get(entryObject.date)
        if(day) day.push(entryObject)
        else entriesByDay.set(entryObject.date, [entryObject])
      }

      this.entries = Array.from(entriesByDay)
          .sort((a, b) => new Date(b[0]).getTime()-new Date(a[0]).getTime())
          .map(value => value[1])

      this.entries.forEach(entry => {entry.sort((a, b) => a.entryId-b.entryId)})
    })

      listen("diary://new-url", async (event) => {
          console.log("Deep Link empfangen:", event.payload);

          // @ts-ignore
          const url = new URL(event.payload);
          if (url.pathname.startsWith("/oauth/callback")) {
              const code = url.searchParams.get("code");
              if (!code) return console.error("Kein Authorization Code erhalten!");

              console.log("Authorization Code:", code);
              // → Token-Exchange durchführen
          }
      }).then(value => {

      })
  }

  async navigate(dst: string) {
    await this.navController.navigateRoot(`/${dst}`)
  }

  async delete(entry: Entry) {
    const db = this.dbService.database
    await db.execute("DELETE FROM entry WHERE id = $1", [entry.id])
    //this.entries.splice(this.entries.indexOf(entry), 1)
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric", weekday: "long"});
  }

  formatDatetime(date: string, written: string) {
    let options = {}
    if(this.isSameDay(new Date(date), new Date(written))) {
      options = {
        hour: "2-digit",
        minute: "2-digit"}
      return "Heute, " + new Date(written).toLocaleTimeString(undefined, options);
    } else {
      options = {
        day: "numeric",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"}
      return new Date(written).toLocaleDateString(undefined, options);
    }
  }

  private isSameDay(date1: Date, date2: Date) {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
  }

    async openNewEntryModal() {
      const modal = await this.modalCtrl.create({
        component: NewEntryComponent,
      });
      await modal.present();

      const { data, role } = await modal.onWillDismiss();

      if (role === 'confirm') {
        console.log(`Hello, ${data}!`)
      }
    }

    async google() {

      console.log(await getCurrent())

        const localAddress = await invoke<string>('get_free_local_address');
        const redirectUri = `http://${localAddress}/`;
        console.log(redirectUri)
        const authUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=15828861697-dgl8nsejs1jbmefj39gcaeud9occkgrj.apps.googleusercontent.com` +
            `&redirect_uri=${redirectUri}` +
            `&response_type=code` +
            `&scope=https://www.googleapis.com/auth/drive.file` +
            `&access_type=offline` +
            `&prompt=consent`;




        await invoke('start_oauth_server', {address: localAddress});

        await openUrl(authUrl);

        //const redirectUri = await invoke<string>('start_oauth_server');



        //const clientId = "15828861697-dgl8nsejs1jbmefj39gcaeud9occkgrj.apps.googleusercontent.com";
        //const client = new OAuth2Client({clientId: clientId, clientSecret: "xyz"});
/*
// Auth-URL mit Drive-Scope generieren
        const authUrl = client.generateAuthUrl({
            access_type: "offline",
            scope: [
                "https://www.googleapis.com/auth/drive.file" // Zugriff nur auf von der App erstellte Dateien
                // oder "https://www.googleapis.com/auth/drive" für vollen Zugriff
            ],
        });

// Browser öffnen (System-Browser oder neues Tauri-Window)
        await openPath(authUrl)

        console.log("success")*/
    }
}
