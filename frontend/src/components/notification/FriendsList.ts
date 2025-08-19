const MOCK_FRIENDS = [
  { username: "banana", online: true },
  { username: "pong killer master", online: false },
  { username: "avocado supreme", online: true },
  { username: "milk", online: false },
  { username: "batatinha", online: true },
  { username: "samantha jones", online: false },
  { username: "more wine", online: true },
  { username: "letssssss", online: false },
];

const MOCK_PENDING = [
  { username: "a_lot_of_sushi", online: false },
  { username: "pong 2000", online: false },
];

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
      font-weight: bold;
      margin-bottom: 0.5em;
      box-shadow: 0 2px 8px #0002;
      border: 2px solid var(--text);
    }
    .full-list {
      display: flex;
      flex-direction: column;
      background: var(--body);
      border: 2px solid var(--border);
      box-shadow: 0 2px 8px #0002;
      padding: 1em;
      height: var(--friends-height);
      min-height: 220px;
      max-height: 50vh;
      box-shadow: var(--shadow-soft);
    }
    .toggle-bar {
      display: flex;
      align-items: center;
      gap: 0.5em;
      margin-bottom: 1em;
    }
    .toggle-btn {
      background: var(--accent);
      border: 1px solid var(--border);
      padding: 0.5em 1em;
      cursor: pointer;
      font-size: var(--secondary-font-size);
      font-weight: bold;
      color: var(--text);
      transition: background 0.2s;
    }
    .toggle-btn.active {
      background: var(--accent-secondary);
      color: #fff;
      box-shadow: var(--shadow-soft);
    }
    .search-box {
      flex: 1;
      margin-left: 1em;
      display: flex;
      align-items: center;
    }
    .search-box input {
      width: 100%;
      padding: 0.4em 0.8em;
      border: 1px solid var(--border);
      font-size: 1em;
      background: var(--body);
      color: var(--text);
      outline: none;
      transition: border 0.2s;
    }
    .list-content {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      max-height: calc(100% - 2.5em);
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
    .add-friend-form {
      display: flex;
      gap: 0.5em;
      margin-top: 0.5em;
    }
    .add-friend-form input {
      flex: 1;
      padding: 0.4em 0.8em;
      border: 1px solid var(--border);
      font-size: 1em;
      background: var(--body);
      color: var(--text);
      outline: none;
    }
    .add-friend-form button {
      padding: 0.4em 1em;
      border: none;
      background: var(--accent);
      color: var(--body);
      font-weight: bold;
      cursor: pointer;
    }
  </style>
  <div class="compact" style="display:none"></div>
  <div class="full-list" style="display:none">
    <div class="toggle-bar">
      <button class="toggle-btn active" data-tab="friends">Friends</button>
      <button class="toggle-btn" data-tab="pending">Pending</button>
      <button class="toggle-btn" data-tab="add">Add</button>
      <div class="search-box">
        <input type="text" placeholder="Search or add..." class="search-input" />
      </div>
    </div>
    <div class="list-content"></div>
  </div>
`;

export class FriendsList extends HTMLElement {
  private compactDiv: HTMLElement;
  private fullDiv: HTMLElement;
  private listContent: HTMLElement;
  private searchInput: HTMLInputElement;
  private tab: "friends" | "pending" | "add" = "friends";
  private search: string = "";
  private onlineUsersData: {} = {};

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
    this.searchInput = this.shadowRoot.querySelector('.search-input');
    this.shadowRoot.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).dataset.tab as "friends" | "pending" | "add";
        this.tab = tab;
        this.updateToggle();
        this.renderList();
      });
    });
    this.searchInput.addEventListener('input', (e) => {
      this.search = (e.target as HTMLInputElement).value;
      this.renderList();
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
    const friends = MOCK_FRIENDS;
    const online = friends.filter(f => f.online).length;
    this.compactDiv.innerHTML = `
      <span>Friends: ${friends.length}</span>
      <span>Online: ${online}</span>
    `;
  }

  renderList() {
    if (this.tab === "add") {
      this.listContent.innerHTML = `
        <form class="add-friend-form" onsubmit="return false;">
          <input type="text" class="add-input" placeholder="Enter username..." />
          <button type="submit">Add</button>
        </form>
      `;
      // Add event listener for add form
      const form = this.listContent.querySelector('.add-friend-form') as HTMLFormElement;
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('.add-input') as HTMLInputElement;
        if (input.value.trim()) {
          alert('Mock: Add friend ' + input.value.trim());
          input.value = '';
        }
      });
      return;
    }

    // Filter friends/pending by search
    const friends = MOCK_FRIENDS.filter(f => f.username.toLowerCase().includes(this.search.toLowerCase()));
    const pending = MOCK_PENDING.filter(f => f.username.toLowerCase().includes(this.search.toLowerCase()));
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
    // Show/hide search box for add tab
    if (this.tab === "add") {
      this.searchInput.style.display = "none";
    } else {
      this.searchInput.style.display = "";
    }
  }
}

customElements.define('friends-list', FriendsList);
