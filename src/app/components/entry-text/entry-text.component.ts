import {Component, Input, OnInit} from '@angular/core';
import {EntryViewRecord} from "../../models/entry-view-record";

type EntryPart = { type: "text", value: string }
  | { type: "newline" }
  | { type: "image", value: string }
  | { type: "images", value: string[] }
  | { type: "chat", value: string }

@Component({
  selector: 'app-entry-text',
  templateUrl: './entry-text.component.html',
  styleUrls: ['./entry-text.component.css'],
})
export class EntryTextComponent  implements OnInit {
  
  @Input() entry!: EntryViewRecord
  entryParts!: EntryPart[]

  constructor() {}

  ngOnInit() {
    let res: EntryPart[] = []
    for(let line of this.entry.text.split(/\n/)) {
      if(line.startsWith("![image](")) {
        const filename = line.substring(9, line.length-1)
        const img = this.entry.images.filter(value => value.filename == filename)[0]
        if(img === undefined) res.push({ type: "text", value: `Could not find ${filename}` })
        else if(res.length > 0) {
          const last = res[res.length-1]
          if(last.type === "image") {
            res = res.slice(0, res.length-1)
            res.push({ type: "images", value: [last.value, img.localImageUrl] })
          } else if(last.type === "images") {
            last.value.push(img.localImageUrl)
          } else {
            res.push({ type: "image", value: img.localImageUrl })
          }
        } else {
          res.push({ type: "image", value: img.localImageUrl })
        }
      } else if(line.startsWith("![chat]")) {
        res.push({ type: "chat", value: line.substring(7) })
      } else {
        if(line.length === 0) {
          res.push({ type: "newline" })
        } else {
          res.push({ type: "text", value: line })
        }
      }
      //res.push({ type: "newline" })
    }
    let res2: EntryPart[] = []
    for(let r of res) {
      res2.push(r)
      res2.push({ type: "newline" })
    }
    this.entryParts = res2.slice(0, res2.length-1)
  }

}
