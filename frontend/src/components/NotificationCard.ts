class NotificationCard extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'message', 'type', 'time', 'action', 'welcome'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--body);
          color: var(--text);
          box-shadow: 0 1px 4px #0001;
          padding: 0.4rem 1rem;
          font-size: 0.98rem;
          min-height: 40px;
          margin-bottom: 0.2em;
          width: 100%;
          border: 2px solid var(--border);
          box-sizing: border-box;
          position: relative;
          transition: background 0.2s, color 0.2s;
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
          align-items: stretch;
          gap: 1em;
        }
        .notif-action {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 2.5rem;
        }
        .notif-action-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.3em;
          color: #b8a77a;
          padding: 0.1em 0.3em;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .notif-action-btn:hover {
          color: #7a6a2f;
        }
        .icon-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--accent, #f0e9d2);
          border-radius: 50%;
          width: 2.25rem;
          height: 2.25rem;
          box-shadow: 0 1px 2px #0002;
        }
        .icon-circle img {
          width: 1.5rem;
          height: 1.5rem;
          display: block;
          filter: invert(var(--invert));
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
        }
        .notif-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          min-width: 70px;
          gap: 0.2em;
        }
        .notif-meta__top {
          display: flex;
          align-items: center;
          gap: 0.3em;
        }
        .notif-meta__top-time {
          font-size: 0.85em;
          color: #888;
          white-space: nowrap;
        }
        .notif-meta__top-dismiss {
          background: none;
          border: none;
          color: #888;
          font-size: 1.1em;
          cursor: pointer;
          margin-left: 0.2em;
          transition: color 0.2s;
        }
        .notif-meta__top-dismiss:hover {
          color: #c00;
        }
      </style>

      <div class="notif-content">
        <div class="notif-action"></div>
        <div class="notif-text">
          <div class="notif-text__title"></div>
          <div class="notif-text__message"></div>
        </div>
        <div class="notif-meta">
          <div class="notif-meta__top">
            <button class="notif-meta__top-dismiss" title="Dismiss" style="display:none;">&times;</button>
            <div class="notif-meta__top-time"></div>
          </div>
        </div>
      </div>
    `;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'title') {
      this.shadowRoot.querySelector('.notif-text__title').textContent = newValue || '';
    }
    if (name === 'message') {
      this.shadowRoot.querySelector('.notif-text__message').textContent = newValue || '';
    }
    if (name === 'time') {
      this.shadowRoot.querySelector('.notif-meta__top-time').textContent = newValue || '';
    }
    if (name === 'action') {
      this.renderAction(newValue);
    }
    if (name === 'welcome') {
      // handled by :host([welcome]) style
    }
  }

  connectedCallback() {
    // Show dismiss button unless explicitly hidden
    const dismissBtn = this.shadowRoot.querySelector('.notif-meta__top-dismiss');
    if (!this.hasAttribute('hide-dismiss')) {
      dismissBtn.style.display = '';
      dismissBtn.onclick = (e) => {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('dismiss', { bubbles: true }));
      };
    } else {
      dismissBtn.style.display = 'none';
    }
    // Initial render
    this.attributeChangedCallback('title', null, this.getAttribute('title'));
    this.attributeChangedCallback('message', null, this.getAttribute('message'));
    this.attributeChangedCallback('time', null, this.getAttribute('time'));
    this.attributeChangedCallback('action', null, this.getAttribute('action'));
  }

  renderAction(actionAttr) {
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
    if (action.icon && (action.icon.startsWith('http') || action.icon.startsWith('/'))) {
      btn.innerHTML = `<span class="icon-circle"><img src="${action.icon}" alt="${action.label}" /></span>`;
    } else if (action.icon && action.icon.startsWith('<svg')) {
      btn.innerHTML = `<span class="icon-circle">${action.icon}</span>`;
    } else if (action.icon) {
      btn.innerHTML = `<span class="icon-circle">${action.icon}</span>`;
    } else {
      btn.textContent = action.label;
    }
    btn.onclick = (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('action', { detail: action, bubbles: true }));
    };
    actionDiv.appendChild(btn);
  }
}

customElements.define('notification-card', NotificationCard);