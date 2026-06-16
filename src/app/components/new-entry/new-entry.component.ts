import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent, IonDatetime, IonDatetimeButton,
  IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonModal, IonSegment, IonSegmentButton,
  IonTitle,
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
  timeOutline,
  logoWhatsapp
} from "ionicons/icons";
import imageBlobReduce from 'image-blob-reduce';
import { v7 as uuidv7 } from 'uuid';
import {NewEntryWithoutEntryIndex} from "../../models/new-entry-without-entry-index";
import {ImageView} from "../../models/image-view";
import {ImageDb} from "../../models/image-db";
import {SyncStatus} from "../../models/syncStatusTypes";
import {
  ImageMetadata,
  ImageResizeOptions,
  ImageResizeOptionsModalComponent
} from "./image-resize-options-modal.component";
import {ContentChange, QuillEditorComponent} from "ngx-quill";
import restoreImageDelta from "../../quill/diary-image-delta-restore";
import Quill from "quill";
import {WhatsAppBubbleValue} from "../../quill/whatsapp-message-blot";
import {
  WhatsAppMessageModalComponent,
  WhatsAppMessageModalResult
} from "./whatsapp-message-modal.component";

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
    IonIcon,
    IonLabel,
    IonList,
    IonItem,
    IonSegment,
    IonSegmentButton,
    QuillEditorComponent
  ],
  standalone: true
})
export class NewEntryComponent  implements OnInit {

  @Input() text: string | undefined
  @Input() date: string
  @Input() written: string
  @Input() customWrittenDate = false
  @Input() sync = true
  @Input() imagesViews: ImageView[] = []
  @Input() imagesDb: ImageDb[] = []
  
  @ViewChild('quill') editor!: QuillEditorComponent

  private readonly imageReducer = imageBlobReduce();
  
  clickHandler = () => { this.openFileDialog() }
  
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
  
  modules3 = {
    toolbar: '#toolbar'
  }

  constructor(private modalCtrl: ModalController,
              private toastController: ToastController) {
    addIcons({ logoWhatsapp, timeOutline, camera, closeOutline, checkmarkOutline, add, pencil, createOutline, todayOutline, barChartOutline, peopleOutline, calendarNumberOutline, homeOutline })
    let currentDate = new Date()
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    this.date = currentDate.toISOString()
    this.written = currentDate.toISOString()
  }
  
  ngOnInit() {}
  
  ionViewDidEnter() {
    this.editor.quillEditor.focus()
  }
  
  protected canSave() {
    if(this.editor && this.editor.quillEditor) return this.editor.quillEditor.getLength() > 0
    else return false
  }
  
  protected editorCreated() {
    const newEntryText = localStorage.getItem("newEntryTextarea")
    if(this.text !== undefined) {
      if(this.text.startsWith("{\"ops\":[")) {
        try {
          const delta = restoreImageDelta(this.text, this.imagesViews)
          this.editor.quillEditor.setContents(delta)
        } catch (e) {
          this.editor.quillEditor.setText(this.text)
        }
      } else this.editor.quillEditor.setText(this.text)
    } else if(newEntryText !== null) {
      this.editor.quillEditor.setContents(JSON.parse(newEntryText))
    }
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
      JSON.stringify(this.editor.quillEditor.getContents()),
      this.imagesDb,
      syncStatus)
    
    await this.modalCtrl.dismiss(newEntry, 'confirm');
    
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
      
      /*
      const index = this.editor.quillEditor.getSelection()?.index
      const delta = this.editor.quillEditor.insertEmbed(index ? index : 0, 'diaryImage', {
        id: imageView.filename,
        src: imageView.localImageUrl
      })
      */
      const range = this.editor.quillEditor.getSelection(true);
      let index = range ? range.index : this.editor.quillEditor.getLength();
      
      const [line, offset] = this.editor.quillEditor.getLine(index);
      
      // Wenn mitten in Text, erst neue Zeile erzeugen.
      if (line && offset > 0) {
        this.editor.quillEditor.insertText(index, "\n", Quill.sources.USER);
        index += 1;
      }
      
      const value = {
        id: imageView.filename,
        src: imageView.localImageUrl
      }
      
      this.editor.quillEditor.insertEmbed(index, "diaryImage", value, Quill.sources.USER);
      
      // Cursor hinter das Bild.
      this.editor.quillEditor.setSelection(index + 1, 0, Quill.sources.SILENT);
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
  
  reference(img: ImageView) {
    this.text += `\n![image](${img.filename})`
    console.log(img.filename)
  }
  
  addChat() {
    this.text += `![chat]()`
  }
  
  setCustomWrittenDate(flag: boolean) {
    this.customWrittenDate = flag
    let currentDate = new Date(this.date)
    currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset()*60*1000)
    this.written = currentDate.toISOString()
  }
  
  protected contentChanged($event: ContentChange) {
    localStorage.setItem("newEntryTextarea", JSON.stringify($event.content))
  }
  
  protected insertWhatsAppMessage() {
    const quill = this.editor.quillEditor
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();

    if(range && range.length > 0) {
      const selectedText = quill.getText(range.index, range.length).trimEnd();
      if(!selectedText) {
        void this.insertWhatsAppMessageFromModal(index)
        return
      }

      quill.deleteText(range.index, range.length, 'user');
      this.insertWhatsAppBubble(index, {
        text: selectedText
      });
      return
    }

    void this.insertWhatsAppMessageFromModal(index)
  }

  private async insertWhatsAppMessageFromModal(index: number) {
    const message = await this.presentWhatsAppMessageOptions()
    if(!message) return

    this.insertWhatsAppBubble(index, message)
  }

  private insertWhatsAppBubble(messageIndex: number, message: WhatsAppMessageModalResult) {
    this.editor.quillEditor.insertEmbed(
      messageIndex,
      'whatsappBubble',
      {
        text: message.text,
        direction: message.senderName === undefined ? 'outgoing' : 'incoming',
        senderName: message.senderName,
        time: message.time
      } satisfies WhatsAppBubbleValue,
      'user',
    );

    this.editor.quillEditor.setSelection(messageIndex + 1, 0, 'silent');
  }

  private async presentWhatsAppMessageOptions(): Promise<WhatsAppMessageModalResult | null> {
    const modal = await this.modalCtrl.create({
      component: WhatsAppMessageModalComponent
    })

    await modal.present()
    const { data, role } = await modal.onWillDismiss<WhatsAppMessageModalResult>()

    if(role !== "confirm" || !data) return null

    return data
  }
}
