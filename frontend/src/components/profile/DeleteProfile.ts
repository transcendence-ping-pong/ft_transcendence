import { t } from '@/locales/Translations';
import '@/components/_templates/AuthFormLayout.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .delete-profile__title {
      color: var(--text);
      font-size: var(--title-font-size);
    }
    .delete-profile__description {
      color: var(--border);
      font-size: var(--main-font-size);
      margin-bottom: 2rem;
    }
    .delete-profile__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
    }
    .delete-profile__footer-btn {
      padding: 1rem 1rem;
      border: none;
      background: var(--accent-secondary);
      color: var(--body);
      font-size: var(--main-font-size);
      font-weight: bold;
      min-height: var(--button-height);
      min-width: var(--button-min-width);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .delete-profile__footer-btn:hover, .delete-profile__footer-btn:focus {
      background: var(--accent);
      color: var(--text);
    }
    .delete-profile__footer-btn:disabled {
      background: var(--accent-secondary);
      color: var(--body);
      cursor: not-allowed;
      opacity: 0.35;
    }
    .delete-btn {
      background: var(--warning);
      color: var(--body);
    }
    .delete-btn:hover, .delete-btn:focus {
      background: var(--warning-secondary);
      color: #fff;
    }
  </style>
  <auth-form-layout style="--auth-form-max-width: 600px;">
    <div slot="header">
      <h1 class="delete-profile__title">${t('profile.deleteAccount')}</h1>
    </div>
    <div slot="content">
      <p class="delete-profile__description">${t('profile.deleteAccountWarning')}</p>
    </div>
    <div slot="footer" class="delete-profile__footer">
      <button id="cancelBtn" class="delete-profile__footer-btn" type="button">${t('profile.cancel')}</button>
      <button id="confirmBtn" class="delete-profile__footer-btn delete-btn" type="button">${t('profile.deleteAccountConfirm')}</button>
    </div>
  </auth-form-layout>
`;

class DeleteProfile extends HTMLElement {
  private cancelBtn: HTMLButtonElement;
  private confirmBtn: HTMLButtonElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.cancelBtn = this.shadowRoot.querySelector('#cancelBtn') as HTMLButtonElement;
    this.confirmBtn = this.shadowRoot.querySelector('#confirmBtn') as HTMLButtonElement;

    this.cancelBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('modal-dismiss', { bubbles: true }));
    });

    this.confirmBtn.addEventListener('click', () => {
      // TODO: add connection to BE here
      alert('DELETE PROFILE');
    });
  }
}

customElements.define('delete-profile', DeleteProfile);
