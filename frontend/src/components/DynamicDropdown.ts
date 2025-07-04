const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: absolute;
      top: 32px;
      left: 50%;
      width: 100%;
      max-width: 30vw;
      min-width: 500px;
      transform: translateX(-50%);
      z-index: 100;
    }
    .dropdown {
      border: 2px solid var(--border, #222);
      background: var(--body, #fff);
      box-shadow: 0 2px 8px #0002;
      overflow: hidden;
      transition: max-height 0.3s cubic-bezier(.4,2,.6,1), box-shadow 0.2s;
      max-height: 56px;
      position: relative;
    }
    .dropdown.open {
      max-height: 600px;
      box-shadow: var(--shadow);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      background: var(--accent);
      cursor: pointer;
      min-height: 56px;
    }
    .app-name {
      flex: 1;
      text-align: center;
      font-weight: bold;
      font-size: 1.25rem;
      letter-spacing: 2px;
      color: var(--border);
      user-select: none;
    }
    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.3rem;
      color: var(--border);
      display: flex;
      align-items: center;
      padding: 0 0.25rem;
      transition: color 0.2s;
    }
    .icon-btn:active {
      color: var(--accent);
    }
    .content {
      padding: 1rem;
      display: none;
      background: var(--body);
    }
    .dropdown.open .content {
      display: block;
    }
  </style>

  <div class="dropdown">
    <div class="header">
      <span class="app-name"><slot name="app-name">AppName</slot></span>
      <button class="icon-btn" id="closeBtn" title="Close" tabindex="0" aria-label="Close">&#10005;</button>
    </div>
    <div class="content">
      <slot></slot>
    </div>
  </div>
`;

export class DynamicDropdown extends HTMLElement {
  private open = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.shadowRoot?.querySelector('.header')?.addEventListener('click', () => this.toggle());
    this.shadowRoot?.getElementById('closeBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    this._render();
  }

  toggle() {
    this.open = !this.open;
    this._render();
  }

  close() {
    this.open = false;
    this._render();
  }

  _render() {
    const dropdown = this.shadowRoot?.querySelector('.dropdown');
    if (dropdown) {
      dropdown.classList.toggle('open', this.open);
    }
  }
}

customElements.define('dynamic-dropdown', DynamicDropdown);