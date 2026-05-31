import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonModal, IonNote, IonSegment, IonSegmentButton, IonSkeletonText, IonTextarea, IonThumbnail,
  IonTitle, IonToggle,
  IonToolbar, ModalController, ToastController
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
  logoWhatsapp
} from "ionicons/icons";
import imageBlobReduce from 'image-blob-reduce';
import { v7 as uuidv7 } from 'uuid';
import {NewEntryWithoutEntryIndex} from "../../models/new-entry-without-entry-index";
import {ImageView} from "../../models/image-view";
import {ImageDb} from "../../models/image-db";
import {ActionSheetController} from "@ionic/angular";
import {SyncStatus} from "../../models/syncStatusTypes";
import {ActivatedRoute} from "@angular/router";
import {
  ImageMetadata,
  ImageResizeOptions,
  ImageResizeOptionsModalComponent
} from "./image-resize-options-modal.component";
import {QuillEditorComponent} from "ngx-quill";
import Quill from 'quill';

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
    IonSegmentButton,
    QuillEditorComponent
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
  @Input() imagesDb: ImageDb[] = []
  
  @ViewChild("textarea") textarea!: IonTextarea

  private readonly imageReducer = imageBlobReduce();

  constructor(private modalCtrl: ModalController,
              private actionSheetCtrl: ActionSheetController,
              private route: ActivatedRoute,
              private toastController: ToastController,) {
    addIcons({ logoWhatsapp, timeOutline, cloudDoneOutline, cloudOfflineOutline, camera, closeOutline, checkmarkOutline, add, pencil, createOutline, todayOutline, barChartOutline, peopleOutline, calendarNumberOutline, homeOutline })
    let currentDate = new Date()
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    this.date = currentDate.toISOString()
    this.written = currentDate.toISOString()
    const newEntryText = localStorage.getItem("newEntryTextarea")
    if(newEntryText !== null) {
      this.text = newEntryText
    }
  }
  
  ngOnInit() {}
  
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
    const newEntry = new NewEntryWithoutEntryIndex(this.date,
      writtenDate,
      true,
      this.text.trim(),
      this.imagesDb,
      syncStatus)
    
    const unusedImages = this.imagesViews.filter(image => !this.text.includes(`![image](${image.filename})`))
    
    if(unusedImages.length > 0) {
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
      
      if(role === "confirm") {
        const unusedImageFilenames = unusedImages.map(image => image.filename);
        
        newEntry.images = this.imagesDb.filter(image => !unusedImageFilenames.includes(image.filename))
        
        await this.modalCtrl.dismiss(newEntry, 'confirm');
      }
    } else {
      await this.modalCtrl.dismiss(newEntry, 'confirm');
    }
    localStorage.removeItem("newEntryTextarea")
  }
  
  openFileDialog() {
    // @ts-ignore
    document.getElementById("file-upload").click();
  }

  async setImage(event: Event) {
    const input = event.target as HTMLInputElement
    const imagefile = input.files?.[0]

    try {
      if(!imagefile || imagefile.name === undefined || imagefile.type === undefined || !imagefile.type.startsWith("image/")) {
        console.log("dont use uploaded file bc it is not an image")
        return
      }

      const metadata = await this.getImageMetadata(imagefile)
      const options = await this.presentImageResizeOptions(metadata)

      if(!options) return

      const uuid = uuidv7()
      const newFilename = uuid + "." + "webp"

      const imageView = new ImageView(newFilename, "")
      this.imagesViews.push(imageView)

      console.log("Bildgröße vorher: " + imagefile.size)

      const downscaledWebpBlob = await this.resizeToWebp(imagefile, options.maxSize, options.quality)

      console.log("Bildgröße nachher: " + downscaledWebpBlob.size)
      this.imagesDb.push(new ImageDb(newFilename, downscaledWebpBlob))
      imageView.localImageUrl = URL.createObjectURL(downscaledWebpBlob)
      console.log(imageView.localImageUrl)
      await this.presentImageLoadedToast(downscaledWebpBlob.size)
      
      const Image = Quill.import('formats/image');
      // @ts-ignore
      Image.sanitize = function(url: string) {
        const allowedProtocols = ['http', 'https', 'blob']
        const protocol = url.split(':')[0].toLowerCase()
        return allowedProtocols.includes(protocol)
          ? url
          : '//:0';
      };
      
      const index = this.editor.quillEditor.getSelection()?.index
      console.log(index)
      const delta = this.editor.quillEditor.insertEmbed(index ? index : 0, 'image', imageView.localImageUrl)
      console.log(delta)
    } finally {
      input.value = ""
    }
  }

  private async resizeToWebp(file: File, maxSize: number, quality = 0.9): Promise<Blob> {
    const downscaled = await this.imageReducer.toCanvas(file, { max: maxSize })

    return new Promise((resolve, reject) => {
      downscaled.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to encode webp"));
        },
        "image/webp",
        quality)
    })
  }

  private async getImageMetadata(file: File): Promise<ImageMetadata> {
    const previewUrl = URL.createObjectURL(file)

    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          previewUrl
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(previewUrl)
        reject(new Error("Failed to load image metadata"))
      }

      img.src = previewUrl
    })
  }

  private async presentImageResizeOptions(metadata: ImageMetadata): Promise<ImageResizeOptions | null> {
    const modal = await this.modalCtrl.create({
      component: ImageResizeOptionsModalComponent,
      componentProps: {
        metadata
      }
    })

    await modal.present()
    const { data, role } = await modal.onWillDismiss<ImageResizeOptions>()

    URL.revokeObjectURL(metadata.previewUrl)

    if(role !== "confirm" || !data) return null

    return data
  }

  private async presentImageLoadedToast(size: number) {
    const toast = await this.toastController.create({
      message: `Bild geladen: ${this.formatBytes(size)}`,
      duration: 2000,
      position: "bottom",
    })

    await toast.present()
  }

  private formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  

  getFileExtension(filename: string): string | null {
    const index = filename.lastIndexOf(".");
    return index !== -1 ? filename.slice(index + 1) : null;
  }
  
  reference(img: ImageView) {
    this.text += `\n![image](${img.filename})`
    console.log(img.filename)
  }
  
  addChat() {
    this.text += `![chat]()`
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
  
  @ViewChild('quill') editor!: QuillEditorComponent
  
  modules2 = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
      ['blockquote', 'code-block'],
      
      [{ 'header': 1 }, { 'header': 2 }],               // custom button values
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
      [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
      [{ 'direction': 'rtl' }],                         // text direction
      
      [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      
      [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
      [{ 'font': [] }],
      [{ 'align': [] }],
      
      ['clean'],                                         // remove formatting button
      
      ['link', 'image']                         // link and image, video
    ]
  }
  
  clickHandler = () => {
    this.openFileDialog()
  }
  
  modules = {
    toolbar: {
      container: [
        ['bold', 'image'] // toggled buttons
      ],
      handlers: {
        image: this.clickHandler,
      }
    }
  }
  
  
  protected report() {
    console.log(JSON.stringify(this.editor.quillEditor.getContents(), undefined, 2))
  }
}
