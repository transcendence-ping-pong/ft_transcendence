import { actionIcons } from '@/utils/Constants';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 1200;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    #chatButton {
      border-radius: 50%;
      width: var(--chat-icon-size);
      height: var(--chat-icon-size);
      background: var(--body);
      border: 2px solid var(--text);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
      box-shadow: var(--shadow-soft);
    }
    #chatButton:hover {
      background: var(--accent-secondary);
      box-shadow: var(--shadow);
    }

    .top-bar__chat-icon img {
      width: 2.5rem;
      height: 2.5rem;
      display: block;
      filter: invert(var(--invert));
    }
    .top-bar__chat-icon img:hover {
      filter: invert(1);
    }
  </style>

  <button class="top-bar__chat-button" id="chatButton" type="button" aria-label="Open chat">
    <span class="top-bar__chat-icon">
      ${actionIcons.chat}
    </span>
  </button>
`;

export class ToogleChatBox extends HTMLElement {
  private chatButton: HTMLButtonElement;
  private isOpen = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadow = this.shadowRoot;
    this.chatButton = shadow?.getElementById('chatButton') as HTMLButtonElement;
    this.chatButton.addEventListener('click', (e) => this.handleChat(e));
    // sync state if chat-panel is already open
    const chatPanel = document.querySelector('chat-panel');
    if (chatPanel && chatPanel.hasAttribute('visible')) {
      this.isOpen = true;
    }
  }

  disconnectedCallback() {
    this.chatButton.removeEventListener('click', (e) => this.handleChat(e));
  }

  private handleChat(e: Event) {
    e.preventDefault();
    const chatPanel = document.querySelector('chat-panel');
    if (!chatPanel) {
      console.error('Chat panel not found in DOM');
      return;
    }
    this.isOpen = !chatPanel.hasAttribute('visible');
    if (this.isOpen) {
      chatPanel.setAttribute('visible', '');
    } else {
      chatPanel.removeAttribute('visible');
    }
  }
}

customElements.define('toggle-chat-box', ToogleChatBox);

// private handleChat(e: Event) {
//   e.preventDefault();
//   console.log('Chat button clicked!');

//   // only open chat panel, don't toggle
//   const chatPanel = document.querySelector('chat-panel');
//   console.log('Found chat panel:', chatPanel);

//   if (chatPanel) {
//     chatPanel.setAttribute('visible', '');
//     this.updateChatButtonState(true);
//     console.log('Chat panel shown');
//   } else {
//     console.error('Chat panel not found in DOM');
//   }
// }

// private updateChatButtonState(isOpen: boolean) {
//   const chatButton = this.shadowRoot?.getElementById('chatButton');
//   if (chatButton) {
//     if (isOpen) {
//       chatButton.style.background = 'rgba(255, 255, 255, 0.3)';
//       chatButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
//     } else {
//       chatButton.style.background = 'var(--video-transition-bg, rgba(0, 0, 0, 0.8))';
//       chatButton.style.borderColor = 'rgba(255, 255, 255, 0.2)';
//     }
//   }
// }