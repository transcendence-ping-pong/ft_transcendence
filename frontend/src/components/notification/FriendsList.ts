import { state } from "@/state";

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }
    .compact {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.7em 1em;
      background: var(--accent);
      color: var(--text);
      border-radius: 0.5em;
      font-weight: bold;
      margin-bottom: 0.5em;
      box-shadow: 0 2px 8px #0002;
    }
    .full-list {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
      background: var(--body);
      border-radius: 0.5em;
      box-shadow: 0 2px 8px #0002;
      padding: 1em;
    }
    .toggle-bar {
      display: flex;
      gap: 1em;
      margin-bottom: 1em;
    }
    .toggle-btn {
      background: var(--accent-secondary);
      border: none;
      padding: 0.5em 1em;
      border-radius: 0.5em;
      cursor: pointer;
      font-weight: bold;
      color: var(--text);
    }
    .toggle-btn.active {
      background: var(--accent);
      color: var(--body);
    }
    .friend-item {
      padding: 0.5em 0;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 0.7em;
    }
    .friend-item:last-child {
      border-bottom: none;
    }
    .status-dot {
      width: 0.7em;
      height: 0.7em;
      border-radius: 50%;
      background: var(--success);
      display: inline-block;
    }
    .status-dot.offline {
      background: var(--border);
    }
  </style>
  <div class="compact" style="display:none"></div>
  <div class="full-list" style="display:none">
    <div class="toggle-bar">
      <button class="toggle-btn active" data-tab="friends">Friends</button>
      <button class="toggle-btn" data-tab="pending">Pending</button>
    </div>
    <div class="list-content"></div>
  </div>
`;

export class FriendsList extends HTMLElement {
  private compactDiv: HTMLElement;
  private fullDiv: HTMLElement;
  private listContent: HTMLElement;
  private tab: "friends" | "pending" = "friends";

  static get observedAttributes() {
    return ["mode"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.compactDiv = this.shadowRoot.querySelector('.compact');
    this.fullDiv = this.shadowRoot.querySelector('.full-list');
    this.listContent = this.shadowRoot.querySelector('.list-content');
    this.shadowRoot.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).dataset.tab as "friends" | "pending";
        this.tab = tab;
        this.updateToggle();
        this.renderList();
      });
    });

    this.render();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "mode") this.render();
  }

  render() {
    const mode = this.getAttribute("mode") || "compact";
    if (mode === "compact") {
      this.compactDiv.style.display = "";
      this.fullDiv.style.display = "none";
      this.renderCompact();
    } else {
      this.compactDiv.style.display = "none";
      this.fullDiv.style.display = "";
      this.renderList();
      this.updateToggle();
    }
  }

  renderCompact() {
    // Replace with real data
    const friends = state.friends || [];
    const online = friends.filter(f => f.online).length;
    this.compactDiv.innerHTML = `
      <span>Friends: ${friends.length}</span>
      <span>Online: ${online}</span>
    `;
  }

  renderList() {
    // Replace with real data
    const friends = state.friends || [];
    const pending = state.pendingFriends || [];
    const list = this.tab === "friends" ? friends : pending;
    this.listContent.innerHTML = list.length
      ? list.map(f => `
        <div class="friend-item">
          <span class="status-dot${f.online ? "" : " offline"}"></span>
          <span>${f.username}</span>
        </div>
      `).join("")
      : `<div>No ${this.tab} found.</div>`;
  }

  updateToggle() {
    this.shadowRoot.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === this.tab);
    });
  }
}

customElements.define('friends-list', FriendsList);