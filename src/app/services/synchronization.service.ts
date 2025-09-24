import {Injectable} from '@angular/core';
import {listen} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";
import {openUrl} from "@tauri-apps/plugin-opener";
import {EntryDbRecord} from "../models/entry-db-record";
import {ImageDb} from "../models/image-db";
import {DatabaseService} from "./database.service";

@Injectable({
  providedIn: 'root'
})
export class SynchronizationService {
  
  allFiles: any[] = []
  
  private readonly clientSecret = "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";
  private readonly clientId = "15828861697-4hsmsq4fhdktkd05hrceipvl2ak64jnc.apps.googleusercontent.com";
  
  private accessToken: string | null = null// = "ya29.a0AQQ_BDTXmdCJxMx-3-mrKNmg13ejoAPwaqF4ItxSw524wHI9bC8oGxwbguG3_OTrB9GHnCyhioyRnrLuabyY7yfBGbFky83mjHB-yV_Oavl4yJ3k5TIe2APZXQD9YkcTznNVjyvmbKC9sGcX7mjYAxUQeVTY2HPGB4iRBI2iCaPiOeelvSPz066gYN_ke4gKvE_k9QIaCgYKAZ0SARQSFQHGX2Mi85gBy_79wkNEz7_P6H4WNA0206"
  private refreshToken: string | null = null// = "1//03qU0-NY0pA5DCgYIARAAGAMSNwF-L9IrIKlSiciaApTey1YUVqZmNuf4KhksBE7anFxUChlhaz453m5mER-BsS71YIdrj-lpOOU"
  private accessTokenExpiration: string | null = null
  
  private startPageToken: string | null = null
  
  constructor(private dbService: DatabaseService) {
    const accessToken = localStorage.getItem("drive_access_token")
    const refreshToken = localStorage.getItem("drive_refresh_token")
    const accessTokenExpiration = localStorage.getItem("drive_access_token_expiration")
    const startPageToken = localStorage.getItem("drive_start_page_token")
    if(accessToken !== null && refreshToken !== null && accessTokenExpiration !== null && startPageToken !== null) {
      console.log("drive is initialized")
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      this.accessTokenExpiration = accessTokenExpiration
      this.startPageToken = startPageToken
    }
  }
  
  async synchronize() {
    // download changes from drive
    const changesList = await this.listChanges()
    console.log(changesList)
    for(const change of changesList.changes) {
      if(change.removed) {
        const entry = await this.dbService.getEntryByDriveFileId(change.fileId)
        if(entry) {
          const affectedRows = await this.dbService.deleteEntryByDriveFileId(change.fileId)
          console.log("affected rows: " + affectedRows)
          for(const filename of entry.referencedImages) {
            await this.dbService.deleteImage(filename)
            console.log("deleted image " + filename)
          }
        } else console.log("entry was deleted from db already")
      } else {
        if(change.file.mimeType === "application/json") {
          const existsAlready = this.dbService.entryExistsWithDriveFileId(change.fileId)
          if(!existsAlready) {
            const entry = await this.downloadEntry(change.file.id)
            console.log(entry)
            await this.dbService.insertEntry(entry)
          } else console.log("entry " + change.file.name + "exists already")
        } else if(change.file.mimeType === "image/webp") {
          if(!await this.dbService.imageFileExists(change.file.name)) {
            const imageData = await this.downloadImage(change.file.id)
            const image = new ImageDb(change.file.name, imageData)
            await this.dbService.addImage(image)
          } else console.log("image " + change.file.name + " exists already")
        }
      }
    }
    this.startPageToken = await changesList.newStartPageToken
    localStorage.setItem("drive_start_page_token", this.startPageToken!)
    
    // upload changes from local db
    const entries = await this.dbService.getAllUnsyncedSyncEntries()
    for(let entry of entries) {
      if(entry.syncStatus === "pending_delete" && entry.driveFileId !== null) {
        await this.deleteFile(entry.driveFileId)
        
      } else if(entry.syncStatus === "pending_create") {
        console.log(entry.syncStatus)
        entry.syncStatus = "synced"
        const entryDriveFileId = await this.uploadEntry(entry)
        entry.driveFileId = entryDriveFileId
        await this.dbService.setDriveFileId(entry.id, entry.driveFileId)
        await this.dbService.setSyncStatus(entry.id, entry.syncStatus)
        
        for(let filename of entry.referencedImages) {
          const dbImage = await this.dbService.getDBImage(filename)
          const imageDriveFileId = await this.uploadImage(dbImage)
        }
      }
    }
  }
  
  isGoogleInitialized() {
    console.log(this.accessToken + "," + this.refreshToken + "," + this.accessTokenExpiration)
    return this.accessToken !== null && this.refreshToken !== null && this.accessTokenExpiration !== null
  }
  
  private async generatePKCE() {
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
  async listDriveFiles() {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=files(id,name)&spaces=appDataFolder",
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
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
  
  async getFile(id: string) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fehler beim Abrufen der Dateien (${res.status}): ${text}`);
    }
    
    if(res.headers.get("content-type") === "application/octet-stream") {
      return res.arrayBuffer()
    } else if(res.headers.get("content-type") === "text/plain") {
      return res.text()
    } else if(res.headers.get("content-type") === "image/webp") {
      return res.arrayBuffer()
    } else if(res.headers.get("content-type") === "application/json") {
      return res.json()
    } else console.log(res.headers.get("content-type"));
  }
  
  private async fetchTokens(code: string, codeVerifier: string, redirectUri: string, clientId: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: this.clientSecret,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    return await res.json(); // enthält access_token, refresh_token
  }
  
  private async checkToken() {
    if(new Date(this.accessTokenExpiration!).getTime() < new Date().getTime()) {
      const res = await this.getNewToken(this.refreshToken!)
      console.log("refreshed token")
      console.log(res)
      this.accessToken = res.access_token;
      const expiresIn = res.expires_in
      this.accessTokenExpiration = new Date(new Date().getTime() + expiresIn * 1000).toISOString()
      localStorage.setItem("drive_access_token", this.accessToken!);
      localStorage.setItem("drive_access_token_expiration", this.accessTokenExpiration!);
    }
  }
  
  async getNewToken(refreshToken: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }),
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Getting refresh token failed: ${errText}`);
    }
    
    return await res.json(); // enthält access_token, refresh_token
  }
  
  async uploadEntry(entry: EntryDbRecord) {
    await this.checkToken()
    
    const form = new FormData();
    
    // 1. Teil: Metadaten
    const metadata = {
      name: "entry-" + entry.id,
      mimeType: "application/json",
      parents: ["appDataFolder"],
    };
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    
    // 2. Teil: Dateiinhalt (JSON als Blob)
    form.append(
      "file",
      new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" })
    );
    
    const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: form,
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed: ${errText}`);
    }
    
    const result = await res.json();
    console.log("text file uploaded:", result);
    return result.id
  }
  
  async downloadEntry(id: string) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fehler beim Abrufen der Dateien (${res.status}): ${text}`);
    }
    
    return (res.json() as Promise<EntryDbRecord>)
  }
  
  async downloadImage(driveFileId: string) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fehler beim Abrufen der Dateien (${res.status}): ${text}`);
    }
    
    return res.blob()
    
    //return (res.json() as Promise<EntryDbRecord>)
  }
  
  async uploadJsonFile(jsonData: any) {
    await this.checkToken();
    
    // Beispiel: Zufälliges JSON-Dokument erzeugen
    const fileName = `random-json-${Date.now()}.json`;
    
    const url =
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    
    const form = new FormData();
    
    // 1. Teil: Metadaten
    const metadata = {
      name: fileName,
      mimeType: "application/json",
      parents: ["appDataFolder"], // oder weglassen, wenn du im Root hochladen willst
    };
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    
    // 2. Teil: Dateiinhalt (JSON als Blob)
    form.append(
      "file",
      new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
    );
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: form,
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed: ${errText}`);
    }
    
    const result = await res.json();
    console.log("JSON file uploaded:", result);
  }
  
  async uploadImage(image: ImageDb) {
    await this.checkToken()
    
    const form = new FormData();
    
    // 1. Teil: Metadaten
    const metadata = {
      name: image.filename,
      mimeType: "application/octet-stream",
      parents: ["appDataFolder"],
    };
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    
    form.append("file", image.imageData);
    
    const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    
    // Request ausführen
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: form,
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed: ${errText}`);
    }
    
    const result = await res.json();
    console.log("image uploaded:", result);
    return result.id
  }
  
  async uploadBinary(filename: string, content: Uint8Array<ArrayBuffer>) {
    await this.checkToken();
    
    const url =
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    
    const form = new FormData();
    
    // 1. Teil: Metadaten (JSON)
    const metadata = {
      name: filename,
      mimeType: "application/octet-stream", // generischer Binärtyp
      parents: ["appDataFolder"],
    };
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    
    // 2. Teil: Dateiinhalt als Blob (Binärdaten)
    form.append("file", new Blob([content], { type: "application/octet-stream" }));
    
    // Request ausführen
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
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
  
  async uploadFile() {
    await this.checkToken()
    
    const fileName = "file"
    const fileContent = "testinhalt"
    
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
    const unlisten = await listen("diary://new-url", async (event) => {
      console.log("Deep Link empfangen:", event.payload);
      
      // @ts-ignore
      const url = new URL(event.payload);
      if (url.pathname.startsWith("/oauth/callback")) {
        const code = url.searchParams.get("code");
        if (!code) return console.error("Kein Authorization Code erhalten!");
        
        console.log("Authorization Code:", code);
        // → Token-Exchange durchführen
      }
    })
    
    
    
    
    const localAddress = await invoke<string>('get_free_local_address');
    const redirectUri = `http://${localAddress}/`;
    //const redirectUri = "http://127.0.0.1:12345"; // oder myapp://oauth
    
    const { codeVerifier, codeChallenge } = await this.generatePKCE();
    
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", this.clientId);
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
    
    console.log("code: " + code)
    
    unlisten()
    
    const hm = await this.fetchTokens(code, codeVerifier, redirectUri, this.clientId);
    
    console.log(hm)
    
    const accessToken = hm.access_token;
    this.accessToken = accessToken;
    
    const refreshToken = hm.refresh_token;
    this.refreshToken = refreshToken;
    
    const expiresIn = hm.expires_in
    const driveAccessTokenExpiration = new Date(new Date().getTime() + expiresIn * 1000).toISOString()
    this.accessTokenExpiration = driveAccessTokenExpiration
    
    const startPageToken = await this.getStartPageToken()
    this.startPageToken = startPageToken;
    
    localStorage.setItem("drive_access_token", accessToken);
    localStorage.setItem("drive_refresh_token", refreshToken);
    localStorage.setItem("drive_access_token_expiration", driveAccessTokenExpiration);
    localStorage.setItem("drive_start_page_token", startPageToken)
    
    
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
  
  async listChanges() {
    await this.checkToken()
    
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/changes?pageToken=${this.startPageToken}&spaces=appDataFolder`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fehler beim Abrufen der Dateien (${res.status}): ${text}`);
    }
    
    return res.json()
  }
  
  async getStartPageToken() {
    await this.checkToken()
    
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/changes/startPageToken`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fehler beim Abrufen der Dateien (${res.status}): ${text}`);
    }
    
    const startPageToken = (await res.json()).startPageToken
    
    return startPageToken
  }
  
  async listFiles() {
    await this.checkToken()
    console.log("📂 Liste aller Dateien:");
    const files = await this.listDriveFiles();
    this.allFiles = files;
    console.log(files);
    for(let file of files) {
      console.log(file.name + ":");
      const f = await this.getFile(file.id)
      console.log(f)
    }
  }
  
  async deleteFile(driveFileId: string) {
    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}`;
    
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
    
    console.log("File deleted: " + driveFileId);
  }
  
  async deleteAll() {
    await this.checkToken()
    console.log("📂 Liste aller Dateien:");
    const files = await this.listDriveFiles();
    this.allFiles = files;
    console.log(files);
    for(let file of files) {
      console.log("delete " + file.name + ":");
      const f = await this.deleteFile(file.id)
      console.log(f)
    }
  }
  
  async getMasterPasswordSalt() {
    await this.checkToken()
    const name = "masterPasswordSalt.bin"
    const query = `name='${name.replace(/'/g, "\\'")}' and trashed=false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    
    if (!res.ok) {
      throw new Error(`Fehler bei files.list: ${res.status} ${await res.text()}`);
    }
    
    const data = await res.json() as { files: { id: string; name: string }[] };
    return data.files.length > 0 ? data.files[0] : null;
  }
}
