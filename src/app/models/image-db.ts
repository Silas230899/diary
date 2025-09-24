export class ImageDb {
  
  filename: string
  imageData: Blob
  
  constructor(filename: string, imageData: Blob) {
    this.filename = filename
    this.imageData = imageData
  }
  
}
