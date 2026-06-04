import Quill from 'quill';
import DiaryImageRowBlot from "./diary-image-row-blot";

const BlockEmbed = Quill.import('blots/block/embed') as any;

export type DiaryImageValue = {
  id: string;
  src: string;
  alt?: string;
};

class DiaryImageBlot extends BlockEmbed {
  static blotName = "diaryImage";
  static tagName = "img";
  static className = "diary-image";
  
  // Quill/Parchment soll diese Blots automatisch in diaryImageRow wrappen.
  static requiredContainer = DiaryImageRowBlot;
  
  static create(value: DiaryImageValue) {
    const node = super.create() as HTMLImageElement;
    
    node.setAttribute("data-image-id", value.id);
    node.setAttribute("src", value.src); // blob URL nur zur Anzeige
    
    node.setAttribute("alt", value.alt ?? "");
    
    return node;
  }
  
  static value(node: HTMLImageElement) {
    return {
      id: node.getAttribute("data-image-id"),
    };
  }
}

export default DiaryImageBlot;
