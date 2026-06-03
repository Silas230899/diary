import {ImageView} from "../models/image-view";
import Delta from 'quill-delta'

function restoreImageDelta(text: string, images: ImageView[]): Delta {
  const delta: Delta = JSON.parse(text)
  for(const op of delta.ops) {
    // @ts-ignore
    if (op.insert?.diaryImage) {
      // @ts-ignore
      const id = op.insert.diaryImage.id;
      const objectUrl = images.filter(img => img.filename === id)[0].localImageUrl
      // @ts-ignore
      op.insert.diaryImage.src = objectUrl;
    }
  }
  return delta
}

export default restoreImageDelta;
