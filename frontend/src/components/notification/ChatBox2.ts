import { websocketService as wss } from '@/services/websocketService.js';
import { state } from '@/state.js';
import { t } from '@/locales/Translations.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
    }
    .chat-compact {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.7em 1em;
      background: var(--accent);
      color: var(--text);
      font-weight: bold;
      margin-bottom: 0.5em;
      box-shadow: 0 2px 8px #0002;
      border: 2px solid var(--text);
      cursor: pointer;
    }
    .chat-full {
      display: flex;
      flex-direction: column;
      background: var(--body);
      border: 2px solid var(--border);
      box-shadow: 0 2px 8px #0002;
      padding: 1em;
      min-height: 220px;
      max-height: 50vh;
      box-shadow: var(--shadow-soft);
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      min-height: 100px;
      max-height: 30vh;
      margin-bottom: 1em;
      background: var(--body);
      border: 1px solid var(--border);
      padding: 0.7em;
      font-size: 1em;
      color: var(--text);
    }
    .chat-message {
      margin-bottom: 0.5em;
      word-break: break-word;
      display: flex;
      flex-direction: column;
      gap: 0.1em;
    }
    .chat-message .sender {
      font-weight: bold;
      font-size: 0.95em;
      color: var(--accent);
    }
    .chat-message .text {
      font-size: 1em;
      color: var(--text);
    }
    .chat-input-form {
      display: flex;
      gap: 0.5em;
      margin-top: 0.5em;
    }
    .chat-input-form input {
      flex: 1;
      padding: 0.4em 0.8em;
      border: 1px solid var(--border);
      font-size: 1em;
      background: var(--body);
      color: var(--text);
      outline: none;
    }
    .chat-input-form button {
      padding: 0.4em 1em;
      border: none;
      background: var(--accent);
      color: var(--body);
      font-weight: bold;
      cursor: pointer;
    }
    .chat-input-form button:hover {
      background: var(--accent-secondary);
      color: #fff;
    }
  </style>
  <div class="chat-compact" style="display:none"></div>
  <div class="chat-full" style="display:none">
    <div class="chat-messages"></div>
    <form class="chat-input-form" onsubmit="return false;">
      <input type="text" class="chat-input" placeholder="${t("chat.inputPlaceholder")}" maxlength="500" />
      <button type="submit">${t("chat.send")}</button>
    </form>
  </div>
`;

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
  type?: 'user' | 'system' | 'other';
  category?: 'global' | 'direct';
  receiverUsername?: string;
  inviteData?: any;
}

export class ChatBox extends HTMLElement {
  private compactDiv: HTMLElement;
  private fullDiv: HTMLElement;
  private messagesDiv: HTMLElement;
  private input: HTMLInputElement;
  private form: HTMLFormElement;
  private mode: "compact" | "full" = "compact";
  private messages: ChatMessage[] = [];
  private requestedOnlineUsers = false;
  private messageHistory: ChatMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private _wsHandlersAttached: boolean = false;
  private lastInvite: any = null;
  private _initialized: boolean = false;

  static get observedAttributes() {
    return ["mode"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.compactDiv = this.shadowRoot.querySelector('.chat-compact');
    this.fullDiv = this.shadowRoot.querySelector('.chat-full');
    this.messagesDiv = this.shadowRoot.querySelector('.chat-messages');
    this.input = this.shadowRoot.querySelector('.chat-input');
    this.form = this.shadowRoot.querySelector('.chat-input-form');

    this.compactDiv.addEventListener('click', () => this.setAttribute('mode', 'full'));
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSend();
    });

    this.setupWebSocketListeners();
    this.render();
    this.loadMessages();

    // preload last invite from localStorage if present
    try {
      const raw = localStorage.getItem('lastInvite');
      if (raw) this.lastInvite = JSON.parse(raw);
    } catch {}
    this._initialized = true;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "mode") this.render();
  }

  render() {
    // ensure refs exist (can be called before connectedCallback via attributeChangedCallback)
    if (!this.compactDiv || !this.fullDiv || !this.messagesDiv || !this.input) {
      this.compactDiv = this.shadowRoot?.querySelector('.chat-compact') as HTMLElement;
      this.fullDiv = this.shadowRoot?.querySelector('.chat-full') as HTMLElement;
      this.messagesDiv = this.shadowRoot?.querySelector('.chat-messages') as HTMLElement;
      this.input = this.shadowRoot?.querySelector('.chat-input') as HTMLInputElement;
      if (!this.compactDiv || !this.fullDiv) return; // wait until connected
    }
    this.mode = (this.getAttribute("mode") as "compact" | "full") || "compact";
    if (this.mode === "compact") {
      this.compactDiv.style.display = "";
      this.fullDiv.style.display = "none";
      this.renderCompact();
    } else {
      this.compactDiv.style.display = "none";
      this.fullDiv.style.display = "";
      this.renderMessages();
      setTimeout(() => this.input?.focus(), 0);
    }
  }

  renderCompact() {
    const lastMsg = this.messages[this.messages.length - 1];
    this.compactDiv.innerHTML = `
      <span>${t("chat.compactTitle")}</span>
      <span>${lastMsg ? lastMsg.text.slice(0, 24) + (lastMsg.text.length > 24 ? "..." : "") : t("chat.noMessages")}</span>
    `;
  }

  renderMessages() {
    this.messagesDiv.innerHTML = this.messages.length
      ? this.messages.map(msg => {
          const isDirect = msg.category === 'direct' && msg.receiverUsername;
          const header = isDirect ? `${msg.sender} → ${msg.receiverUsername}` : `${msg.sender} → global`;
          return `
            <div class="chat-message">
              <span class="sender">${header}</span>
              <span class="text">${msg.text}</span>
            </div>
          `;
        }).join("")
      : `<div style="color:var(--text);opacity:0.7;">No messages yet.</div>`;
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
  }

  handleSend() {
    const text = this.input.value.trim();
    if (!text) return;
    if (text.length > 500) {
      this.addMessage({ sender: '', text: t("chat.messageTooLong"), timestamp: Date.now(), type: 'system' });
      this.input.value = "";
      return;
    }
    if (text.startsWith('/')) {
      this.handleSlashCommand(text);
    } else {
      this.sendGlobalMessage(text);
    }
    this.input.value = "";
  }

  addMessage(msg: ChatMessage) {
    // simple de-duplication: ignore if identical to last within 750ms
    const last = this.messages[this.messages.length - 1];
    if (last && last.sender === msg.sender && last.text === msg.text && (msg.timestamp - last.timestamp) < 750) {
      return;
    }
    this.messages.push(msg);
    if (msg.type !== 'system') {
      this.messageHistory.push(msg);
      if (this.messageHistory.length > 100) this.messageHistory.shift();
      this.saveMessages();
    }
    this.renderMessages();
    this.renderCompact();
  }

  // --- WebSocket listeners ---
  private setupWebSocketListeners() {
    if (this._wsHandlersAttached) return;
    if (!wss || !wss.socket) {
      window.addEventListener('websocketConnected', () => this.setupWebSocketListeners(), { once: true });
      return;
    }
    this._wsHandlersAttached = true;
    wss.socket.on('chatMessage', (data: any) => {
      if (data && data.type === 'global' && data.senderUsername && data.message) {
        this.addMessage({ sender: data.senderUsername, text: data.message, timestamp: Date.now(), type: 'other', category: 'global' });
      }
    });
    wss.socket.on('directMessage', (data: any) => {
      if (data && data.type === 'direct' && data.senderUsername && data.message) {
        this.addMessage({ sender: data.senderUsername, text: data.message, timestamp: Date.now(), type: 'other', category: 'direct', receiverUsername: data.receiverUsername });
      }
    });
    wss.socket.on('onlineUsers', (data: any) => this.handleOnlineUsersUpdate(data));
    wss.socket.on('chatError', (data: any) => {
      const errorMessage = data.message || 'Unknown error';
      if (errorMessage.includes('timed out') || errorMessage.includes('spam')) {
        this.handleTimeoutError(errorMessage);
      } else {
        this.addMessage({ sender: '', text: t("chat.error", { error: errorMessage }), timestamp: Date.now(), type: 'system' });
      }
    });
    wss.socket.on('gameInvite', (data: any) => {
      if (data && data.type === 'invite' && data.senderUsername && data.message) {
        this.lastInvite = data;
        this.addMessage({ sender: data.senderUsername, text: data.message, timestamp: Date.now(), type: 'other', category: 'direct', receiverUsername: data.receiverUsername, inviteData: data });
      }
    });
    wss.socket.on('inviteAccepted', (data: any) => this.addMessage({ sender: '', text: data.message, timestamp: Date.now(), type: 'system' }));
    wss.socket.on('inviteDeclined', (data: any) => this.addMessage({ sender: '', text: data.message, timestamp: Date.now(), type: 'system' }));
    wss.socket.on('gameCountdown', (data: any) => this.addMessage({
      sender: '', text: t("chat.gameStarting", { countdown: data.countdown }), timestamp: Date.now(), type: 'system'
    }));
    // ...add more listeners as needed
  }

  // --- Command handling ---
  private handleSlashCommand(cmd: string) {
    if (cmd === '/help') {
      this.addMessage({ sender: '', text: 'Available: /help /list /pm username message /invite username difficulty /accept /decline /profile username /clear', timestamp: Date.now(), type: 'system' });
    } else if (cmd === '/list') {
      this.requestOnlineUsers();
    } else if (cmd === '/clear') {
      this.messages = [];
      this.messageHistory = [];
      this.saveMessages();
      this.renderMessages();
      this.renderCompact();
    } else if (cmd.startsWith('/pm ')) {
      const [_, receiver, ...messageParts] = cmd.split(/\s+/);
      let message = messageParts.join(' ');
      if (receiver && message) {
        if (receiver === this.getCurrentUsername()) {
          this.addMessage({ sender: '', text: t("chat.pmError"), timestamp: Date.now(), type: 'system' });
          return;
        }
        wss.emit('directMessage', {
          type: 'direct',
          senderUsername: this.getCurrentUsername(),
          receiverUsername: receiver,
          message: message,
          timestamp: Date.now()
        });
      } else {
        this.addMessage({ sender: '', text: t("chat.pmUsage"), timestamp: Date.now(), type: 'system' });
      }
    } else if (cmd.startsWith('/invite ')) {
      const [_, receiver, difficulty] = cmd.split(/\s+/);
      if (!receiver || !difficulty) {
        this.addMessage({ sender: '', text: t("chat.inviteUsage"), timestamp: Date.now(), type: 'system' });
        return;
      }
      wss.emit('chatMessage', {
        message: `/invite ${receiver} ${difficulty}`,
        username: this.getCurrentUsername()
      });
    } else if (cmd === '/accept') {
      this.handleInviteCommand('accept');
    } else if (cmd === '/decline') {
      this.handleInviteCommand('decline');
    } else if (cmd.startsWith('/profile ')) {
      const [_, username] = cmd.split(/\s+/);
      if (username) {
        window.location.href = `/profile/${username}`;
      } else {
        this.addMessage({ sender: '', text: t("chat.profileUsage"), timestamp: Date.now(), type: 'system' });
      }
    } else {
      this.addMessage({ sender: '', text: t("chat.helpUsage"), timestamp: Date.now(), type: 'system' });
    }
  }

  private requestOnlineUsers() {
    if (wss && wss.isConnected()) {
      wss.emit('getOnlineUsers');
      this.requestedOnlineUsers = true;
    } else {
      this.addMessage({ sender: '', text: t("chat.onlineUsersError"), timestamp: Date.now(), type: 'system' });
    }
  }

  private sendGlobalMessage(message: string) {
    if (wss && wss.isConnected()) {
      let username = this.getCurrentUsername();
      wss.emit('chatMessage', { message, username });
    } else {
      this.addMessage({ sender: '', text: t("chat.sendError"), timestamp: Date.now(), type: 'system' });
    }
  }

  private handleInviteCommand(action: 'accept' | 'decline') {
    let inv = this.lastInvite;
    if (!inv) {
      try { const raw = localStorage.getItem('lastInvite'); if (raw) inv = JSON.parse(raw); } catch {}
    }
    if (!inv) {
      // try to find last invite in history
      const last = [...this.messageHistory].reverse().find(m => (m as any).inviteData);
      inv = last ? (last as any).inviteData : null;
    }
    if (!inv) {
      this.addMessage({ sender: '', text: t("chat.inviteNotFound"), timestamp: Date.now(), type: 'system' });
      return;
    }
    if (wss && wss.socket) {
      wss.socket.emit('inviteResponse', {
        inviteId: inv.id,
        response: action,
        senderUsername: inv.senderUsername,
        receiverUsername: inv.receiverUsername,
        difficulty: inv.difficulty
      });
      this.addMessage({ sender: '', text: action === 'accept' ? t("chat.inviteAccepted") : t("chat.inviteDeclined"), timestamp: Date.now(), type: 'system' });
      this.lastInvite = null;
    }
  }

  private findInviteMessage(inviteId?: number): HTMLElement | null {
    const nodes = this.messagesDiv.querySelectorAll('.chat-message');
    for (let i = nodes.length - 1; i >= 0; i--) {
      const msg = nodes[i] as HTMLElement;
      if (msg.getAttribute('data-invite-type') === 'true') {
        if (!inviteId) return msg;
        const msgInviteId = msg.getAttribute('data-invite-id');
        if (msgInviteId && parseInt(msgInviteId) === inviteId) return msg;
      }
    }
    return null;
  }

  private extractInviteDataFromMessage(messageElement: HTMLElement): any {
    if (messageElement.getAttribute('data-invite-type') !== 'true') return null;
    const inviteId = messageElement.getAttribute('data-invite-id');
    const senderUsername = messageElement.getAttribute('data-sender');
    const receiverUsername = messageElement.getAttribute('data-receiver');
    const difficulty = messageElement.getAttribute('data-difficulty');
    if (!inviteId || !senderUsername || !receiverUsername || !difficulty) return null;
    return {
      id: parseInt(inviteId),
      senderUsername,
      receiverUsername,
      difficulty
    };
  }

  private handleOnlineUsersUpdate(data: any) {
    if (this.requestedOnlineUsers) {
      if (data && Array.isArray(data)) {
        const currentUsername = this.getCurrentUsername();
        const otherUsers = data.filter((user: any) => user.username !== currentUsername);
        if (otherUsers.length === 0) {
          this.addMessage({ sender: '', text: t("chat.noOtherUsersOnline"), timestamp: Date.now(), type: 'system' });
        } else {
          const userList = data.map((user: any) => user.username === currentUsername ? `${user.username}(You)` : user.username).join(', ');
          this.addMessage({ sender: '', text: t("chat.onlineUsers", { users: userList }), timestamp: Date.now(), type: 'system' });
        }
      } else {
        this.addMessage({ sender: '', text: t("chat.failedToGetOnlineUsers"), timestamp: Date.now(), type: 'system' });
      }
      this.requestedOnlineUsers = false;
    }
  }

  private handleTimeoutError(errorMessage: string) {
    this.addMessage({ sender: '', text: `⚠️ ${errorMessage}`, timestamp: Date.now(), type: 'system' });
    this.input.disabled = true;
    setTimeout(() => {
      this.input.disabled = false;
      this.addMessage({ sender: '', text: t("chat.chatReenabled"), timestamp: Date.now(), type: 'system' });
    }, 120000);
  }

  private getCurrentUsername(): string {
    return state.userData?.username || localStorage.getItem('loggedInUser') || 'Anonymous';
  }

  private saveMessages() {
    try {
      // persist to a separate key to avoid conflicting with chat-panel
      localStorage.setItem('chatBoxMessages', JSON.stringify(this.messages));
    } catch (error) {
      localStorage.removeItem('chatMessages');
    }
  }

  private loadMessages() {
    try {
      const savedMessages = localStorage.getItem('chatBoxMessages');
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        if (Array.isArray(messages)) {
          this.messages = messages;
          this.messageHistory = messages.filter((m: any) => (m.type !== 'system'));
          this.renderMessages();
          this.renderCompact();
        }
      }
    } catch {
      localStorage.removeItem('chatMessages');
    }
  }
}

customElements.define('chat-box', ChatBox);
