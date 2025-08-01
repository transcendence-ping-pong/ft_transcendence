const template = document.createElement('template');
template.innerHTML = `
  <style>
    .overlay {
      position: fixed;
      inset: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: background 400ms cubic-bezier(.4,2,.3,1);
    }
    .overlay.show {
      background: rgba(0,0,0,0.6);
    }
    .modal {
      background: var(--body);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
      padding: 24px;
      min-width: 500px;
      max-width: 800px;
      min-height: 450px;
      max-height: 700px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transform: translateY(60px);
      transition: opacity 400ms cubic-bezier(.4,2,.3,1), transform 400ms cubic-bezier(.4,2,.3,1);
    }
    .modal.show {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
    .body-center {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
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
      <div class="body-center">
        <slot name="body"></slot>
      </div>
      <button class="close-btn" title="Close" style="display:none;">&times;</button>
    </div>
  </div>
`;

export class GenericModal extends HTMLElement {
  static get observedAttributes() {
    return ['dismissible', 'appear-delay'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.updateDismissible();
    this.setupEvents();
    this.triggerAppear();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'dismissible') {
      this.updateDismissible();
    }
    if (name === 'appear-delay') {
      this.triggerAppear();
    }
  }

  triggerAppear() {
    const delay = parseInt(this.getAttribute('appear-delay') || '0', 10);
    const modal = this.shadowRoot.querySelector('.modal');
    const overlay = this.shadowRoot.querySelector('.overlay');
    if (modal && overlay) {
      modal.classList.remove('show');
      overlay.classList.remove('show');
      setTimeout(() => {
        modal.classList.add('show');
        overlay.classList.add('show');
      }, isNaN(delay) ? 0 : delay);
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
    const dismissible = this.getAttribute('dismissible') === 'true';

    if (closeBtn && dismissible) {
      closeBtn.onclick = () => this.dismiss();
    }
    if (overlay && dismissible) {
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