import { actionIcons } from '@/utils/Constants';

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
      z-index: 9998;
      transition: background 400ms cubic-bezier(.4,2,.3,1);
    }
    .overlay.show {
      background: rgba(0,0,0,0.6);
    }
    .modal {
      background: var(--body);
      border: 2px solid var(--border);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
      padding: 24px;
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
      display: block;
      width: 100%;
      height: 100%;
    }
    .close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: inline-flex;
      align-items: center;
      padding: 0.1em 0.3em;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      width: var(--button-circle-size);
      height: var(--button-circle-size);
      border-radius: 50%;
      transition: color 0.2s;
    }
    .close-btn span img {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }
    .close-btn:hover {
      background: color-mix(in srgb, var(--hover), transparent 50%);
    }
  </style>

  <div class="overlay">
    <div class="modal">
      <div class="body-center">
        <slot name="body"></slot>
      </div>
      <button class="close-btn" title="Close" style="display:none;">
        <span>${actionIcons.close}</span>
      </button>
    </div>
  </div>
`;

export class GenericModal extends HTMLElement {
  static get observedAttributes() {
    return ['dismissible', 'appear-delay', 'small'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.updateDismissible();
    this.updateModalSize();
    this.setupEvents();
    this.triggerAppear();

    // listen for modal-dismiss from slotted content, e.g. DeleteProfile cancel button
    this.addEventListener('modal-dismiss', (e) => {
      e.stopPropagation(); // TODO STUDY: prevent bubbling further (?)
      this.dismiss(true); // avoid infinite loop
    });
  }

  // callback parameters: name, oldValue, newValue
  attributeChangedCallback(name: string) {
    if (name === 'dismissible') {
      this.updateDismissible();
    }
    if (name === 'appear-delay') {
      this.triggerAppear();
    }
    if (name === 'small' || name === 'large') {
      this.updateModalSize();
    }
  }

  private triggerAppear() {
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

  private updateModalSize() {
    const modal = this.shadowRoot.querySelector('.modal') as HTMLElement;
    if (modal) {
      if (this.hasAttribute('small')) {
        modal.style.width = 'var(--modal-small-width)';
        modal.style.height = 'var(--modal-small-height)';
      } else if (this.hasAttribute('large')) {
        modal.style.width = 'var(--modal-large-width)';
        modal.style.height = 'var(--modal-large-height)';
      } else {
        modal.style.width = 'var(--modal-width)';
        modal.style.height = 'var(--modal-height)';
      }
    }
  }

  private updateDismissible() {
    const dismissible = this.getAttribute('dismissible') === 'true';
    const closeBtn = this.shadowRoot.querySelector('.close-btn') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.style.display = dismissible ? '' : 'none';
    }
  }

  private setupEvents() {
    const closeBtn = this.shadowRoot.querySelector('.close-btn') as HTMLButtonElement;
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

  private dismiss(fromChild = false) {
    this.remove();
    if (!fromChild) {
      this.dispatchEvent(new CustomEvent('modal-dismiss', { bubbles: true }));
    }
  }
}

customElements.define('generic-modal', GenericModal);
