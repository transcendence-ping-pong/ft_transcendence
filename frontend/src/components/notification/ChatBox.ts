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
  </style>
  <div class="chat-compact" style="display:none"></div>
  <div class="chat-full" style="display:none">
    <div class="chat-messages"></div>
    <form class="chat-input-form" onsubmit="return false;">
      <input type="text" class="chat-input" placeholder="Type a message..." maxlength="500" />
      <button type="submit">Send</button>
    </form>
  </div>
`;

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

export class ChatBox extends HTMLElement {
  private compactDiv: HTMLElement;
  private fullDiv: HTMLElement;
  private messagesDiv: HTMLElement;
  private input: HTMLInputElement;
  private form: HTMLFormElement;
  private mode: "compact" | "full" = "compact";
  private messages: ChatMessage[] = [];

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

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSend();
    });

    this.render();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "mode") this.render();
  }

  render() {
    this.mode = (this.getAttribute("mode") as "compact" | "full") || "compact";
    if (this.mode === "compact") {
      this.compactDiv.style.display = "";
      this.fullDiv.style.display = "none";
      this.renderCompact();
    } else {
      this.compactDiv.style.display = "none";
      this.fullDiv.style.display = "";
      this.renderMessages();
      setTimeout(() => this.input.focus(), 0);
    }
  }

  renderCompact() {
    // show a summary (e.g., unread count or last message)
    const lastMsg = this.messages[this.messages.length - 1];
    this.compactDiv.innerHTML = `
      <span>Chat</span>
      <span>${lastMsg ? lastMsg.text.slice(0, 24) + (lastMsg.text.length > 24 ? "..." : "") : "No messages"}</span>
    `;
  }

  renderMessages() {
    this.messagesDiv.innerHTML = this.messages.length
      ? this.messages.map(msg => `
        <div class="chat-message">
          <span class="sender">${msg.sender}</span>
          <span class="text">${msg.text}</span>
        </div>
      `).join("")
      : `<div style="color:var(--text);opacity:0.7;">No messages yet.</div>`;
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
  }

  handleSend() {
    const text = this.input.value.trim();
    if (!text) return;
    // For demo, sender is always "You"
    this.messages.push({
      sender: "You",
      text,
      timestamp: Date.now()
    });
    this.input.value = "";
    this.renderMessages();
    this.renderCompact();
  }
}

customElements.define('chat-box', ChatBox);
