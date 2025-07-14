const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: absolute;
      top: 0;
      left: 50%;
      width: 100%;
      max-width: 30vw;
      min-width: 500px;
      transform: translateX(-50%);
      z-index: 100;
    }
    .dropdown {
      border: 2px solid var(--border);
      background: var(--body);
      box-shadow: 0 2px 8px #0002;
      overflow: hidden;
      transition: max-height 0.3s cubic-bezier(.4,2,.6,1), box-shadow 0.2s;
      min-height: 38px;
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
      padding: 0.15rem 0.5rem;
      background: var(--accent);
      cursor: pointer;
      min-height: 38px;
    }
    .header-content {
      flex: 1;
      text-align: center;
      font-weight: bold;
      font-size: 1.25rem;
      letter-spacing: 2px;
      color: var(--border);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .arrow-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.3rem;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      padding: 0 0.25rem;
      transition: color 0.2s, background 0.2s, transform 0.18s cubic-bezier(.4,2,.6,1);
      filter: invert(var(--invert));
    }
    .arrow-btn:hover, .arrow-btn:focus {
      transform: scale(1.1);
    }
    .content {
      padding: 1rem;
      display: none;
      background: var(--body);
    }
    .dropdown.open .content {
      display: block;
    }
    .hidden {
      display: none !important;
    }
  </style>

  <div class="dropdown">
    <div class="header">
      <span class="header-content">
        <slot name="nav-buttons"></slot>
        <slot name="app-name"></slot>
      </span>
      <button class="arrow-btn" id="arrowBtn" title="Toggle" tabindex="0" aria-label="Toggle"></button>
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
    this.shadowRoot?.querySelector('.header')?.addEventListener('click', (e) => {
      // Prevent toggle if arrow button is clicked (to avoid double toggle)
      if ((e.target as HTMLElement).id === 'arrowBtn') return;
      this.toggle();
    });
    this.shadowRoot?.getElementById('arrowBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
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
    const arrowUpSVG = `<img src="https://unpkg.com/pixelarticons@1.8.1/svg/arrow-up.svg" />`;
    const arrowDownSVG = `<img src="https://unpkg.com/pixelarticons@1.8.1/svg/arrow-down.svg" />`;

    const dropdown = this.shadowRoot?.querySelector('.dropdown');
    const arrowBtn = this.shadowRoot?.getElementById('arrowBtn');
    if (dropdown) dropdown.classList.toggle('open', this.open);
    if (arrowBtn) arrowBtn.innerHTML = this.open ? arrowUpSVG : arrowDownSVG;

    // Show/hide slots based on open state
    const navButtonsSlot = this.shadowRoot?.querySelector('slot[name="nav-buttons"]') as HTMLSlotElement;
    const appNameSlot = this.shadowRoot?.querySelector('slot[name="app-name"]') as HTMLSlotElement;
    if (navButtonsSlot && appNameSlot) {
      if (this.open) {
        navButtonsSlot.classList.add('hidden');
        appNameSlot.classList.remove('hidden');
      } else {
        navButtonsSlot.classList.remove('hidden');
        appNameSlot.classList.add('hidden');
      }
    }
  }
}

customElements.define('dynamic-dropdown', DynamicDropdown);