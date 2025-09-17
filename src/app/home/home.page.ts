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
    IonIcon, IonInput, IonItem, IonLabel, IonList, IonTextarea,
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
import {CryptoService} from "../services/crypto.service";

type Day = Entry[]

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
    imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, FormsModule, IonCardSubtitle, IonLabel, IonInput, NavBarComponent, IonList, IonItem, IonTextarea],
})
export class HomePage {

  entries: Day[] = []
    allFiles: any[] = []

    accessToken = "ya29.a0AQQ_BDSeCG2450MCsUXNbGQ8xb_KGHjEoXp99BcdnSuM32GVzX4IlwOf3WUSVivA86kA_21s0M1TiQ_8wwZqNrq2Iknsv2acQqLfO_WYPYXaNIHqYto5jj9Se0yObOYPUzhFq9yEH0l5dMHEU4FuiDBp9kmpHENHlZXtknytnc2jOAzMHwhNHGtUgu-DrDPu65SMWcUaCgYKAYsSARQSFQHGX2MiUi_LeKqOoRhod_iktX0UeA0206"
    textfield: string = ""

  constructor(private navController: NavController,
              private dbService: DatabaseService,
              private modalCtrl: ModalController,
              private crypto: CryptoService) {
    addIcons({ add, pencil, createOutline, trashOutline })


    const db = dbService.database

    const res2: Promise<Entry[]> = db.select("SELECT * FROM entry")
    
    res2.then(async (res) => {

      const entriesByDay: Map<string, Entry[]> = new Map()

      for(const entry of res) {
        
        const text = await crypto.decryptData(entry["text"])
        

        const entryObject = new Entry(
          entry["id"],
          entry["date"],
          entry["written"],
          entry["entryIndex"],
          text,
          entry["sync"])
        console.log(entryObject.date)
        const day = entriesByDay.get(entryObject.date)
        if(day) day.push(entryObject)
        else entriesByDay.set(entryObject.date, [entryObject])
      }

      this.entries = Array.from(entriesByDay)
          .sort((a, b) => new Date(b[0]).getTime()-new Date(a[0]).getTime())
          .map(value => value[1])

      this.entries.forEach(entry => {entry.sort((a, b) => a.entryIndex-b.entryIndex)})
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
        component: NewEntryComponent
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
    ) {
        const res = await fetch(
            "https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name)&spaces=appDataFolder",
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
        //return data.files?.map((f: { name: string }) => f.name) ?? [];
        return data.files
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

    async deleteFile() {
        const id = "1tvdhhZGnYum-VIRz0fZe8CaG_dCnJFf3LhbtUQclzSYQ_7RN"

        const url = `https://www.googleapis.com/drive/v3/files/${id}`;

        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Upload failed: ${errText}`);
        }

        console.log("File deleted:");
    }

    async uploadFile() {
        const fileName = "file"
        const fileContent = this.textfield

        const url =
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

        // FormData automatisch bauen lassen
        const form = new FormData();

        // 1. Teil: Metadaten als Blob (JSON)
        const metadata = {
            name: fileName,
            mimeType: "text/plain",
            parents: ["appDataFolder"],
        };
        form.append(
            "metadata",
            new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );

        // 2. Teil: Dateiinhalt als Blob
        form.append("file", new Blob([fileContent], { type: "text/plain" }));

        // Fetch mit automatisch gesetztem Content-Type + Boundary
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                // KEIN Content-Type setzen -> Browser macht das inkl. Boundary automatisch
            },
            body: form,
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Upload failed: ${errText}`);
        }

        const result = await res.json();
        console.log("File uploaded:", result);
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
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive.appfolder");
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

        console.log("access:" + accessToken);
        console.log(refreshToken);

        this.accessToken = accessToken;

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
        console.log("📂 Liste aller Dateien:");
        const names = await this.listDriveFiles(this.accessToken);
        this.allFiles = names;
        console.log(names);
    }

    async deleteFile2(id: string) {
        const url = `https://www.googleapis.com/drive/v3/files/${id}`;

        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Upload failed: ${errText}`);
        }

        console.log("File deleted: " + id);
    }
}
