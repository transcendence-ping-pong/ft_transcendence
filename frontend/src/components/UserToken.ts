import { t, err } from '@/locales/Translations.js';
import * as authService from '@/services/authService.js';

// TODO IMPROVEMENT: signin and signup can be abstracted
// there are too many similarities and repetition
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }
    .token-auth {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .token-auth__title {
      color: var(--text);
      font-size: var(--title-font-size);
    }
    .token-auth__description {
      width: 100%;
      color: var(--border);
      font-size: var(--main-font-size);
    }

    .token-auth__content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .token-auth__code-input {
      width: 100%;
      max-width: 180px;
      font-size: 1.4rem;
      letter-spacing: 0.4em;
      text-align: center;
      padding: 0.5em 0.5em;
      border: 1px solid var(--border);
      outline: none;
      background: var(--body);
      color: var(--text);
    }
  </style>

  <div class="token-auth">
    <div class="token-auth__header">
      <h1 class="token-auth__title">${t('profile.2FA')}</h1>
      <h1/>
      <p class="token-auth__description">${t('profile.invalidCode')}</p>
    </div>

    <div class="token-auth__content">
      <input id="codeInput" class="token-auth__code-input" name="2fa" type="text" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" placeholder="------" required />
    </div>

    <div class="token-auth__footer">
      <button id="cancelBtn" class="qr-auth__footer-btn" type="button">${t('profile.cancel')}</button>
      <button id="verifyBtn" class="qr-auth__footer-btn" type="button">${t('profile.verify')}</button>
    </div>
  </div>
`;

export class UserToken extends HTMLElement {
  emailInput!: HTMLInputElement;
  passwordInput!: HTMLInputElement;
  usernameInput!: HTMLInputElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {

  }
}

customElements.define('user-token', UserToken);