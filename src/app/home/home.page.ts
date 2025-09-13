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

    async generatePKCE() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const codeVerifier = btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest("SHA-256", data);
        const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        return { codeVerifier, codeChallenge };
    }

    /**
     * Listet die Dateien im Google Drive des Nutzers auf.
     * @param accessToken Dein OAuth2-Access Token
     * @returns Array von Dateinamen
     */
    async listDriveFiles(
        accessToken: string
    ): Promise<string[]> {
        const res = await fetch(
            "https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name)",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Fehler beim Abrufen der Dateien (${res.status}): ${text}`);
        }

        const data = await res.json();
        return data.files?.map((f: { name: string }) => f.name) ?? [];
    }



    async fetchTokens(code: string, codeVerifier: string, redirectUri: string, clientId: string) {
        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: "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",
                code,
                code_verifier: codeVerifier,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
            }),
        });
        return await res.json(); // enthält access_token, refresh_token
    }

    async refreshToken(clientId: string, refreshToken: string) {
        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: "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",
                grant_type: "refresh_token",
                refresh_token: refreshToken
            }),
        });
        return await res.json(); // enthält access_token, refresh_token
    }


    async google() {
        const clientId = "15828861697-4hsmsq4fhdktkd05hrceipvl2ak64jnc.apps.googleusercontent.com";

        const localAddress = await invoke<string>('get_free_local_address');
        const redirectUri = `http://${localAddress}/`;
        //const redirectUri = "http://127.0.0.1:12345"; // oder myapp://oauth

        const { codeVerifier, codeChallenge } = await this.generatePKCE();

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");



        //console.log(await getCurrent())

        /*
        console.log(redirectUri)
        const authUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=15828861697-dgl8nsejs1jbmefj39gcaeud9occkgrj.apps.googleusercontent.com` +
            `&redirect_uri=${redirectUri}` +
            `&response_type=code` +
            `&scope=https://www.googleapis.com/auth/drive.file` +
            `&access_type=offline` +
            `&prompt=consent`;

         */



        const server = invoke('start_oauth_server', {address: localAddress})

        await openUrl(authUrl)

        const code: string = (await server) as string

        console.log(code)

        const hm = await this.fetchTokens(code, codeVerifier, redirectUri, clientId);

        console.log(hm)

        const accessToken = hm.access_token;
        const refreshToken = hm.refresh_token;

        console.log(accessToken);
        console.log(refreshToken);

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

    async listFiles() {
        const accessToken = "ya29.a0AS3H6NzyyCFidgxu_qNsFbOA6gMzuEVFqbzaAfSi8DJNtVpGd-v0ddZHQ_nmLRetlRU8PZeLLD6Tf9XG-gUmkbiACAOdQTDIohXgaoaLAzpJWclNYOXFZKEBmG455ZmSCnsBeUh761v-ai2s_u8kSnucaF07ETPVpQVme5k-2qAVjKtrgUB_nF7sEbvH3MerXgZbTsoaCgYKAc8SARQSFQHGX2MifqR5RYiX275GM_ynOa-X2Q0206"
        console.log("📂 Liste aller Dateien:");
        const names = await this.listDriveFiles(accessToken);
        console.log(names);
    }

}
