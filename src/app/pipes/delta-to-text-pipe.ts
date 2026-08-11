import { Pipe, PipeTransform } from '@angular/core';
import {WhatsAppBubbleValue} from "../quill/whatsapp-message-blot";

interface DeltaOp {
  insert?: string | object | WhatsAppBubbleInsert ;
}

interface Delta {
  ops: DeltaOp[];
}

interface WhatsAppBubbleInsert {
  whatsappBubble: WhatsAppBubbleValue;
}

function isWhatsAppBubbleInsert(
  insert: unknown
): insert is WhatsAppBubbleInsert {
  return (
    typeof insert === 'object' &&
    insert !== null &&
    'whatsappBubble' in insert
  );
}

@Pipe({
  name: 'deltaToText'
})
export class DeltaToTextPipe implements PipeTransform {
  
  transform(value: string): string {
    try {
      const delta = JSON.parse(value) as Partial<Delta>;
      
      if (!Array.isArray(delta.ops)) {
        return value;
      }
      
      return delta.ops
        .map((op: { insert?: string | object }) => {
          if(typeof op.insert === 'string') return op.insert
          else if(isWhatsAppBubbleInsert(op.insert)) {
            const { senderName, text, time } = op.insert.whatsappBubble;
            let result = text
            if(senderName !== undefined) result = `${senderName}: ${result}`
            if(time !== undefined) result = `${result} (${time})`
            return result
          } else return ""
        })
        .join('')
    } catch {
      return value;
    }
  }
}
