export class ImageView {
  
  filename: string
  localImageUrl: string
  
  constructor(name: string, localImageUrl: string) {
    this.filename = name
    this.localImageUrl = localImageUrl
  }
  
}
