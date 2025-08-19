import { actionIcons } from '@/utils/Constants';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      background: var(--body);
      color: var(--text);
      padding: 0.4rem 1rem;
      font-size: 0.98rem;
      margin-bottom: 0.2em;
      width: 100%;
      border: 2px solid var(--border);
      box-shadow: 0 2px 12px #0002;
      box-sizing: border-box;
      position: relative;
    }
    :host(:hover) {
      background: var(--hover);
    }
    :host([welcome]) {
      background: var(--accent);
      color: var(--text);
      font-weight: bold;
    }
    .notif-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1em;
      min-height: 80px;
    }
    .notif-action {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .notif-action-btn {
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--accent);
      border-radius: 50%;
      width: var(--button-circle-size);
      height: var(--button-circle-size);
    }
    .icon-circle img {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }
    .icon-circle:hover {
      border-color: 2px solid var(--border);
      background: var(--accent-secondary);
      box-shadow: var(--shadow-soft);
    }

    .notif-text {
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .notif-text__title {
      font-weight: 600;
      font-size: 1em;
      margin-bottom: 0.1em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .notif-text__message {
      font-size: 0.97em;
      color: var(--text);
      white-space: wrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90%;
    }
    .notif-meta__time {
      position: absolute;
      bottom: 0.5em;
      right: 1em;
      font-size: 0.85em;
      color: var(--border);
      white-space: nowrap;
    }
    .notif-meta__dismiss {
      position: absolute;
      top: 0.5em;
      right: 1em;
      cursor: pointer;
      border: none;
      background: none;
      width: 2rem;
      height: 2rem;
      margin-left: 0.2em;
      transition: color 0.2s, background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .notif-meta__dismiss span {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.2rem;
      height: 1.2rem;
      text-align: center;
      filter: invert(var(--invert));
      font-size: 1.5em;
    }

    .notif-meta__dismiss:hover {
      background: rgba(0, 0, 0, 0.20);
      cursor: pointer;
    }
  </style>

  <div class="notif-content">
    <div class="notif-action"></div>
    <div class="notif-text">
      <div class="notif-text__title"></div>
      <div class="notif-text__message"></div>
    </div>
    <div class="notif-meta__time"></div>
    <button class="notif-meta__dismiss" title="Dismiss" style="display:none;">
      <span>${actionIcons.close}</span>
    </button>
  </div>
`;

class NotificationCard extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'message', 'type', 'time', 'action', 'welcome'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'title') {
      this.shadowRoot.querySelector('.notif-text__title').textContent = newValue || '';
    }
    if (name === 'message') {
      this.shadowRoot.querySelector('.notif-text__message').textContent = newValue || '';
    }
    if (name === 'time') {
      this.shadowRoot.querySelector('.notif-meta__time').textContent = newValue || '';
    }
    if (name === 'action') {
      this.renderAction(newValue);
    }
    if (name === 'welcome') {
      // handled by :host([welcome]) style
    }
  }

  connectedCallback() {
    // show dismiss button if not a welcome notification
    const dismissBtn = this.shadowRoot.querySelector('.notif-meta__dismiss') as HTMLButtonElement;
    if (!this.hasAttribute('welcome')) {
      dismissBtn.style.display = '';
      dismissBtn.onclick = (e) => {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('dismiss', { bubbles: true }));
      };
    } else {
      dismissBtn.style.display = 'none';
    }

    // initial render
    this.attributeChangedCallback('title', null, this.getAttribute('title'));
    this.attributeChangedCallback('message', null, this.getAttribute('message'));
    this.attributeChangedCallback('time', null, this.getAttribute('time'));
    this.attributeChangedCallback('action', null, this.getAttribute('action'));
  }

  renderAction(actionAttr: string | null) {
    const actionDiv = this.shadowRoot.querySelector('.notif-action');
    actionDiv.innerHTML = '';
    if (!actionAttr) return;
    let action;
    try {
      action = JSON.parse(actionAttr);
    } catch {
      return;
    }
    if (!action || typeof action !== 'object') return;
    const btn = document.createElement('button');
    btn.className = 'notif-action-btn';
    btn.title = action.label;
    btn.innerHTML = `<span class="icon-circle">${action.icon}</span>` || action.label;

    btn.onclick = (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('action', { detail: action, bubbles: true }));
    };
    actionDiv.appendChild(btn);
  }
}

customElements.define('notification-card', NotificationCard);