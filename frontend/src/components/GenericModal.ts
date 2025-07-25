const template = document.createElement('template');
template.innerHTML = `
  <style>
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal {
      background: var(--body);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
      padding: 24px;
      max-width: 400px;
      min-width: 320px;
      max-height: 80vh;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-size: 1.5rem;
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      z-index: 2;
      transition: color 0.2s;
    }
    .close-btn:hover {
      color: #222;
    }
  </style>
  <div class="overlay">
    <div class="modal">
      <slot name="header"></slot>
      <slot name="body"></slot>
      <slot name="footer"></slot>
      <button class="close-btn" title="Close" style="display:none;">&times;</button>
    </div>
  </div>
`;

export class GenericModal extends HTMLElement {
  static get observedAttributes() {
    return ['dismissible'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.updateDismissible();
    this.setupEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'dismissible') {
      this.updateDismissible();
    }
  }

  updateDismissible() {
    const dismissible = this.getAttribute('dismissible') === 'true';
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.style.display = dismissible ? '' : 'none';
    }
  }

  setupEvents() {
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    const overlay = this.shadowRoot.querySelector('.overlay');
    const modal = this.shadowRoot.querySelector('.modal');
    const dismissible = this.getAttribute('dismissible') === 'true';

    if (closeBtn && dismissible) {
      closeBtn.onclick = () => this.dismiss();
    }
    if (overlay && modal && dismissible) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.dismiss();
      });
    }
  }

  dismiss() {
    this.remove();
    this.dispatchEvent(new CustomEvent('modal-dismiss', { bubbles: true }));
  }
}

customElements.define('generic-modal', GenericModal);
