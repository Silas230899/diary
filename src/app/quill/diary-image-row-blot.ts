import Quill from "quill";

const Container = Quill.import("blots/container") as any;

class DiaryImageRowBlot extends Container {
  static blotName = "diaryImageRow";
  static tagName = "div";
  static className = "diary-image-row";
}

export default DiaryImageRowBlot;
