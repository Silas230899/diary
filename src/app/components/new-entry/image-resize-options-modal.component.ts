import {Component, Input, OnInit} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader, IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ModalController
} from '@ionic/angular/standalone';
import {FormsModule} from '@angular/forms';
import {addIcons} from "ionicons";
import {checkmarkOutline, closeOutline} from "ionicons/icons";

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  previewUrl: string;
}

export interface ImageResizeOptions {
  maxSize: number;
  quality: number;
}

type ImageSizePreset = '750' | '1200' | '1600' | 'original' | 'custom';

@Component({
  selector: 'app-image-resize-options-modal',
  templateUrl: './image-resize-options-modal.component.html',
  styleUrls: ['./image-resize-options-modal.component.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonRange,
    IonIcon
  ],
  standalone: true
})
export class ImageResizeOptionsModalComponent implements OnInit {
  @Input({required: true}) metadata!: ImageMetadata;

  readonly minMaxSize = 200;
  readonly qualityMin = 60;
  readonly qualityMax = 100;

  selectedPreset: ImageSizePreset = '750';
  maxSize = 750;
  quality = 95;

  constructor(private modalCtrl: ModalController) {
    addIcons({ checkmarkOutline, closeOutline })
  }

  ngOnInit() {
    this.maxSize = Math.min(750, this.longestSide);
    this.selectedPreset = this.maxSize === this.longestSide ? 'original' : '750';
  }

  get longestSide() {
    return Math.max(this.metadata.width, this.metadata.height);
  }

  get minAllowedSize() {
    return Math.min(this.minMaxSize, this.longestSide);
  }

  get resultWidth() {
    return this.calculateResultDimensions().width;
  }

  get resultHeight() {
    return this.calculateResultDimensions().height;
  }

  get qualityPercent() {
    return Math.round(this.quality);
  }

  setPreset(value: string | number | undefined) {
    const preset = String(value) as ImageSizePreset;
    this.selectedPreset = preset;

    if (preset === 'custom') return;

    const nextMaxSize = preset === 'original' ? this.longestSide : Number(preset);
    this.maxSize = this.clampMaxSize(nextMaxSize);
  }

  setCustomMaxSize(value: unknown) {
    this.selectedPreset = 'custom';

    if (typeof value === 'number') {
      this.maxSize = this.clampMaxSize(value);
      return;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) this.maxSize = this.clampMaxSize(parsed);
    }
  }

  setQuality(value: unknown) {
    if (typeof value !== 'number') return;
    this.quality = Math.min(Math.max(value, this.qualityMin), this.qualityMax);
  }

  formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm() {
    const options: ImageResizeOptions = {
      maxSize: this.maxSize,
      quality: this.quality / 100
    };

    return this.modalCtrl.dismiss(options, 'confirm');
  }

  private calculateResultDimensions() {
    const scale = Math.min(this.maxSize / this.longestSide, 1);

    return {
      width: Math.max(Math.round(this.metadata.width * scale), 1),
      height: Math.max(Math.round(this.metadata.height * scale), 1)
    };
  }

  private clampMaxSize(value: number) {
    return Math.min(Math.max(Math.round(value), this.minAllowedSize), this.longestSide);
  }
}
