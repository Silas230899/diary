import Quill from "quill";

const Embed = Quill.import("blots/embed") as any

export class DiaryEntryReferenceBlot extends Embed {
  
  static blotName = "diary-entry-reference"
  static tagName = "span"
  static className = "ql-diary-entry-reference"
  
  static create(value: string): HTMLElement {
    const node = super.create() as HTMLElement
    node.setAttribute("data-uuid", value)
    node.textContent = value
    return node
  }
  
  static value(node: HTMLElement) {
    return node.getAttribute("data-uuid")
  }
}
