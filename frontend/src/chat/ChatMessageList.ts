import { state } from '../state.js';

class ChatMessageList extends HTMLElement {
  private container: HTMLDivElement;
  private messagesContainer: HTMLDivElement;
  private currentTab: 'global' | 'direct' = 'global';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.setupStyles();
    this.createContainer();
    this.setupEventListeners();
    this.render();
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
      }

      .chat-messages-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .chat-tabs {
        display: flex;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .chat-tab {
        flex: 1;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .chat-tab.active {
        color: white;
        background: rgba(255, 255, 255, 0.1);
        border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      }

      .chat-tab:hover:not(.active) {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.05);
      }

      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .message {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.5rem 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border-left: 3px solid rgba(255, 255, 255, 0.2);
      }

      .message.system {
        border-left-color: #ff6b6b;
        background: rgba(255, 107, 107, 0.1);
      }

      .message.direct {
        border-left-color: #4ecdc4;
        background: rgba(78, 205, 196, 0.1);
      }

      .message-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .message-username {
        font-weight: 600;
        color: white;
        font-size: 0.9rem;
      }

      .message-time {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.75rem;
      }

      .message-content {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.9rem;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .no-messages {
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
        padding: 2rem;
        font-style: italic;
      }

      .help-text {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.8rem;
        text-align: center;
        padding: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin-top: auto;
      }

      .help-text code {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-family: monospace;
      }

      /* scrollbar styling */
      .messages-container::-webkit-scrollbar {
        width: 6px;
      }

      .messages-container::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }

      .messages-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }

      .messages-container::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `;
    this.shadowRoot!.appendChild(style);
  }

  private createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'chat-messages-container';

    // tabs
    const tabs = document.createElement('div');
    tabs.className = 'chat-tabs';

    const globalTab = document.createElement('button');
    globalTab.className = 'chat-tab active';
    globalTab.textContent = 'Global';
    globalTab.addEventListener('click', () => this.switchTab('global'));

    const directTab = document.createElement('button');
    directTab.className = 'chat-tab';
    directTab.textContent = 'Direct';
    directTab.addEventListener('click', () => this.switchTab('direct'));

    tabs.appendChild(globalTab);
    tabs.appendChild(directTab);

    // messages container
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'messages-container';

    this.container.appendChild(tabs);
    this.container.appendChild(this.messagesContainer);

    this.shadowRoot!.appendChild(this.container);
  }

  private setupEventListeners() {
    // listen for state changes to re-render
    const checkForUpdates = () => {
      this.render();
    };

    // check every 100ms for updates (simple approach)
    setInterval(checkForUpdates, 100);
  }

  private switchTab(tab: 'global' | 'direct') {
    this.currentTab = tab;
    
    // update tab styling
    const tabs = this.shadowRoot!.querySelectorAll('.chat-tab');
    tabs.forEach((t, index) => {
      if ((tab === 'global' && index === 0) || (tab === 'direct' && index === 1)) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    this.render();
  }

  private render() {
    this.messagesContainer.innerHTML = '';

    if (this.currentTab === 'global') {
      this.renderGlobalMessages();
    } else {
      this.renderDirectMessages();
    }

    // add help text
    this.addHelpText();
  }

  private renderGlobalMessages() {
    const messages = state.chatMessages;
    
    if (messages.length === 0) {
      const noMessages = document.createElement('div');
      noMessages.className = 'no-messages';
      noMessages.textContent = 'No messages yet. Start the conversation!';
      this.messagesContainer.appendChild(noMessages);
      return;
    }

    messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      this.messagesContainer.appendChild(messageElement);
    });

    this.scrollToBottom();
  }

  private renderDirectMessages() {
    const messages = state.directMessages;
    
    if (messages.length === 0) {
      const noMessages = document.createElement('div');
      noMessages.className = 'no-messages';
      noMessages.textContent = 'No direct messages yet. Use /pm "username" "message" to send one!';
      this.messagesContainer.appendChild(noMessages);
      return;
    }

    messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      this.messagesContainer.appendChild(messageElement);
    });

    this.scrollToBottom();
  }

  private createMessageElement(message: any) { // Changed type to any as ChatService is removed
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;

    const header = document.createElement('div');
    header.className = 'message-header';

    const username = document.createElement('span');
    username.className = 'message-username';
    username.textContent = message.senderUsername;

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = this.formatTime(message.timestamp);

    header.appendChild(username);
    header.appendChild(time);

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.message;

    messageDiv.appendChild(header);
    messageDiv.appendChild(content);

    return messageDiv;
  }

  private addHelpText() {
    const helpText = document.createElement('div');
    helpText.className = 'help-text';
    helpText.innerHTML = `
      <strong>Commands:</strong> <code>/help</code> <code>/list</code> <code>/pm "user" "msg"</code> <code>/block "user"</code> <code>/invite "user"</code>
    `;
    this.messagesContainer.appendChild(helpText);
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // less than 1 minute
      return 'now';
    } else if (diff < 3600000) { // less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  private scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}

customElements.define('chat-message-list', ChatMessageList);

export default ChatMessageList;
