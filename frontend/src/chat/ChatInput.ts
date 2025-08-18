import { state } from '../state.js';

class ChatInput extends HTMLElement {
  private input: HTMLInputElement;
  private sendButton: HTMLButtonElement;
  private container: HTMLDivElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.setupStyles();
    this.createInput();
    this.setupEventListeners();
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
      }

      .chat-input-container {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .chat-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: white;
        font-size: 0.9rem;
        outline: none;
        transition: all 0.2s ease;
      }

      .chat-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }

      .chat-input:focus {
        border-color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
      }

      .chat-input:hover:not(:focus) {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.12);
      }

      .send-button {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        color: white;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
        font-weight: 500;
        min-width: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .send-button:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.4);
        transform: translateY(-1px);
      }

      .send-button:active:not(:disabled) {
        transform: translateY(0);
      }

      .send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .send-button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
      }

      .input-hint {
        position: absolute;
        top: -25px;
        left: 0;
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.75rem;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .input-hint.visible {
        opacity: 1;
      }

      @media (max-width: 480px) {
        .chat-input-container {
          gap: 0.25rem;
        }
        
        .chat-input {
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
        }
        
        .send-button {
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
          min-width: 50px;
        }
      }
    `;
    this.shadowRoot!.appendChild(style);
  }

  private createInput() {
    this.container = document.createElement('div');
    this.container.className = 'chat-input-container';

    this.input = document.createElement('input');
    this.input.className = 'chat-input';
    this.input.type = 'text';
    this.input.placeholder = 'Type a message or use /help for commands...';
    this.input.maxLength = 500;

    this.sendButton = document.createElement('button');
    this.sendButton.className = 'send-button';
    this.sendButton.textContent = 'Send';
    this.sendButton.disabled = true;

    this.container.appendChild(this.input);
    this.container.appendChild(this.sendButton);

    this.shadowRoot!.appendChild(this.container);
  }

  private setupEventListeners() {
    this.input.addEventListener('input', () => {
      this.updateSendButton();
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // focus input when chat opens
    const checkForFocus = () => {
      if (state.isChatOpen) {
        this.input.focus();
      }
    };

    setInterval(checkForFocus, 100);
  }

  private updateSendButton() {
    const hasText = this.input.value.trim().length > 0;
    this.sendButton.disabled = !hasText;
  }

  private sendMessage() {
    const message = this.input.value.trim();
    if (!message) return;

    // check if it's a slash command
    if (message.startsWith('/')) {
      // This functionality will need to be re-implemented or removed
      // as ChatService is no longer available.
      // For now, we'll just log it or remove if not needed.
      console.log('Slash command received:', message);
    } else {
      // This functionality will need to be re-implemented or removed
      // as ChatService is no longer available.
      // For now, we'll just log it or remove if not needed.
      console.log('Global message received:', message);
    }

    // clear input and focus
    this.input.value = '';
    this.updateSendButton();
    this.input.focus();
  }

  // public method to focus input
  focus() {
    this.input.focus();
  }

  // public method to clear input
  clear() {
    this.input.value = '';
    this.updateSendButton();
  }
}

customElements.define('chat-input', ChatInput);

export default ChatInput;
