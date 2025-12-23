import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonModal, IonNote, IonSegment, IonSegmentButton, IonSkeletonText, IonTextarea, IonThumbnail,
  IonTitle, IonToggle,
  IonToolbar, ModalController
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
  closeOutline,
  camera,
  cloudDoneOutline,
  cloudOfflineOutline,
  timeOutline,
} from "ionicons/icons";
import imageBlobReduce from 'image-blob-reduce';
import { v7 as uuidv7 } from 'uuid';
import {NewEntryWithoutEntryIndex} from "../../models/new-entry-without-entry-index";
import {ImageView} from "../../models/image-view";
import {ImageDb} from "../../models/image-db";
import {ActionSheetController} from "@ionic/angular";
import {SyncStatus} from "../../models/syncStatusTypes";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.component.html',
  styleUrls: ['./new-entry.component.scss'],
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
    IonSkeletonText,
    IonThumbnail,
    IonList,
    IonItem,
    IonSegment,
    IonSegmentButton
  ],
  standalone: true
})
export class NewEntryComponent  implements OnInit {

  @Input() text = ""
  @Input() date: string
  @Input() written: string
  @Input() customWrittenDate = false
  @Input() sync = true
  @Input() imagesViews: ImageView[] = []
  imagesDb: ImageDb[] = []
  
  @ViewChild("textarea") textarea!: IonTextarea

  constructor(private modalCtrl: ModalController,
              private actionSheetCtrl: ActionSheetController,
              private route: ActivatedRoute,) {
    addIcons({ timeOutline, cloudDoneOutline, cloudOfflineOutline, camera, closeOutline, checkmarkOutline, add, pencil, createOutline, todayOutline, barChartOutline, peopleOutline, calendarNumberOutline, homeOutline })
    let currentDate = new Date()
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    this.date = currentDate.toISOString()
    this.written = currentDate.toISOString()
    const newEntryText = localStorage.getItem("newEntryTextarea")
    if(newEntryText !== null) {
      this.text = newEntryText
    }
  }
  
  ngOnInit() {
  }
  
  customCounterFormatter(inputLength: number, maxLength: number) {
    return `${inputLength} Zeichen`;
  }
  
  async ionViewDidEnter() {
    await this.textarea.setFocus()
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm() {
    const syncStatus: SyncStatus = this.sync ? 'pending_upload' : "keep_local"
    let writtenDate = this.written
    if(!this.customWrittenDate) {
      let currentDate = new Date()
      currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
      writtenDate = currentDate.toISOString()
    }
    const newEntry = new NewEntryWithoutEntryIndex(this.date, writtenDate, true, this.text, this.imagesDb, syncStatus)
    
    const everyImageUsed = this.imagesViews.every(image => this.text.includes(`![image](${image.filename})`))
    
    if(!everyImageUsed) {
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Du hast nicht alle Bilder benutzt. Trotzdem einfügen?',
        buttons: [
          {
            text: 'Ja',
            role: 'confirm',
          },
          {
            text: 'Nein',
            role: 'cancel',
          },
        ],
      });
      
      await actionSheet.present();
      
      const { role } = await actionSheet.onWillDismiss();
      
      if(role === "confirm") await this.modalCtrl.dismiss(newEntry, 'confirm');
    } else {
      await this.modalCtrl.dismiss(newEntry, 'confirm');
    }
    localStorage.removeItem("newEntryTextarea")
  }
  
  openFileDialog() {
    // @ts-ignore
    document.getElementById("file-upload").click();
  }
  
  async convertToWebp(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context not available"));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to encode AVIF"));
            },
            "image/webp",
            1
          );
        };
        
        img.onerror = reject;
        img.src = reader.result as string;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  
  async setImage(event: any) {
    const imagefile: File = event.target.files[0]
    
    if(imagefile.name === undefined || imagefile.type === undefined || !imagefile.type.startsWith("image/")) {
      console.log("dont use uploaded file bc it is not an image")
      return
    }
    
    const uuid = uuidv7()
    const newFilename = uuid + "." + "webp"
    
    const imageView = new ImageView(newFilename, "")
    this.imagesViews.push(imageView)
    
    console.log("bildgröße vorher: " + imagefile.size)
    
    const downscaled = await imageBlobReduce().toCanvas(imagefile, { max: 750 })
    //console.log(downscaled.width, downscaled.height)
    const downscaledWebpBlob: Blob = await new Promise((resolve, reject) => {
      downscaled.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to encode webp"));
        },
        "image/webp",
        0.9)
    })
    console.log("Bildgröße nachher: " + (await downscaledWebpBlob.arrayBuffer()).byteLength)
    this.imagesDb.push(new ImageDb(newFilename, downscaledWebpBlob))
    const imageUrl = URL.createObjectURL(downscaledWebpBlob)
    //this.imagesViews.push(new ImageView(newFilename, imageUrl))
    imageView.localImageUrl = imageUrl
    /*
    //console.log(imagefile)
    const filename = imagefile.name;
    //console.log(filename);
    const reader = new FileReader()
    
    
    const webp = await this.convertToWebp(imagefile)
    const url = URL.createObjectURL(webp)*/
    /*
    webpcanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode AVIF"));
      },
      "image/webp",
      1
    );
    *//*
    const dataurl = downscaled.toDataURL()
    
    
    
    const rescaled = await imageBlobReduce().toBlob(imagefile, {max: 500})
    
    
    reader.onload = (e) => {
      // @ts-ignore
      const imageData = e.target.result
      
      this.imagesViews.push(new ImageView(newFilename, url))
      // @ts-ignore
      //console.log(new Blob([this.imgsrc]).size)
      //console.log('Base64:', e.target.result) // Kannst du für Upload verwenden
    }
    
    //reader.readAsDataURL(imagefile)
    reader.readAsDataURL(rescaled)*/
    /*
    const dirExists = await exists("images", { baseDir: BaseDirectory.AppData })
    if(!dirExists) await mkdir("images", { baseDir: BaseDirectory.AppData })
    
    const file = await create("images/" + newFilename, { baseDir: BaseDirectory.AppData })
    const fileArrayBuffer = await rescaled.arrayBuffer()
    const encryptedFile = await this.crypto.encryptArrayBufferToArrayBuffer(fileArrayBuffer)
    await file.write(encryptedFile)
    await file.close()
    */
  }
  
  getFileExtension(filename: string): string | null {
    const index = filename.lastIndexOf(".");
    return index !== -1 ? filename.slice(index + 1) : null;
  }
  
  reference(img: ImageView) {
    this.text += `\n![image](${img.filename})`
    console.log(img.filename)
  }
  
  setCustomWrittenDate(flag: boolean) {
    this.customWrittenDate = flag
    let currentDate = new Date()
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    this.written = currentDate.toISOString()
  }
  
  textareaInput($event: any) {
    localStorage.setItem("newEntryTextarea", $event.detail.value)
  }
}
