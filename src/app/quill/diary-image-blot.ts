import Quill from 'quill';

const BlockEmbed = Quill.import('blots/block/embed') as any;

class DiaryImageBlot extends BlockEmbed {
  static blotName = "diaryImage";
  static tagName = "img";
  
  static create(value: { id: string; src?: string }) {
    const node = super.create() as HTMLImageElement;
    
    node.setAttribute("data-image-id", value.id);
    
    if (value.src) {
      node.setAttribute("src", value.src); // blob URL nur zur Anzeige
    }
    
    return node;
  }
  
  static value(node: HTMLImageElement) {
    return {
      id: node.getAttribute("data-image-id"),
    };
  }
}

export default DiaryImageBlot;
