import Quill from 'quill';

const BlockEmbed = Quill.import('blots/block/embed') as any;

export type WhatsAppBubbleDirection = 'incoming' | 'outgoing';

export interface WhatsAppBubbleValue {
  text: string;
  direction: WhatsAppBubbleDirection;
  senderName?: string;
  time?: string;
}

export class WhatsAppBubbleBlot extends BlockEmbed {
  static blotName = 'whatsappBubble';
  static tagName = 'div';
  static className = 'ql-whatsapp-bubble';
  
  static create(value: WhatsAppBubbleValue): HTMLElement {
    const node = super.create() as HTMLElement;
    
    const direction = value.direction;
    const text = value?.text ?? '';
    const senderName = direction === 'incoming' ? value?.senderName ?? '' : '';
    const time = value?.time ?? '';
    
    node.setAttribute('contenteditable', 'false');
    node.setAttribute('data-direction', direction);
    node.setAttribute('data-text', text);
    
    if (senderName) {
      node.setAttribute('data-sender-name', senderName);
    }
    
    if (time) {
      node.setAttribute('data-time', time);
    }
    
    node.classList.add(`ql-whatsapp-bubble--${direction}`);
    
    if (senderName) {
      const senderNode = document.createElement('div');
      senderNode.className = 'ql-whatsapp-bubble__sender';
      senderNode.textContent = senderName;
      node.appendChild(senderNode);
    }
    
    const textNode = document.createElement('div');
    textNode.className = 'ql-whatsapp-bubble__text';
    textNode.textContent = text;
    node.appendChild(textNode);
    
    if (time) {
      const metaRowNode = document.createElement('div');
      metaRowNode.className = 'ql-whatsapp-bubble__meta-row';
      
      const timeNode = document.createElement('span');
      timeNode.className = 'ql-whatsapp-bubble__time';
      timeNode.textContent = time;
      
      metaRowNode.appendChild(timeNode);
      node.appendChild(metaRowNode);
    }
    
    return node;
  }
  
  static value(node: HTMLElement) {
    const direction = node.getAttribute('data-direction') ?? 'outgoing'
    return {
      text: node.getAttribute('data-text') ?? '',
      direction: direction,
      senderName:
        direction === 'incoming'
          ? node.getAttribute('data-sender-name') ?? undefined
          : undefined,
      time: node.getAttribute('data-time') ?? undefined,
    };
  }
}
