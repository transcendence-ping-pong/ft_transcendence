import { t, err } from '@/locales/Translations.js';
import { actionIcons } from '@/utils/Constants.js';
import * as authService from '@/services/authService.js';
import { setUserData } from '@/state';

// when entering signin credentials, the user will be redirected to this component
// this extra step is available only if user has 2FA enabled in their profile
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      padding: 0;
      margin: 0;
      width: 100%;
      height: 100%;
    }
    .token-auth {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .token-auth__header {
      padding-bottom: 1rem;
      justify-content: center;
    }
    .token-auth__title {
      color: var(--text);
      font-size: var(--title-modal-font-size);
      text-align: center;
    }
    hr {
      border: none;
      border-top: 1px solid var(--border);
      padding-bottom: 1rem;
    }

    .token-auth__content {
      flex: 1 1 auto;
      display: flex;
      min-height: 0;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .token-auth__edit {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      align-items: stretch;
      margin: 0 auto;
    }
    .token-auth__input {
      padding: 1rem;
      min-height: var(--button-height);
      border: 1.5px solid var(--accent);
      font-size: var(--main-font-size);
      background: var(--body);
      color: var(--border);
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      width: 100%;
    }
    .token-auth__input:focus {
      border-color: var(--border);
      background: var(--body);
    }
    .token-auth__input-wrapper {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }
    .token-auth__input--icon {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      z-index: 2;
      background: transparent;
      border: none;
      padding: 0;
    }
    .token-auth__input--icon img {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }

    .token-auth__code {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      background: var(--accent-50);
      padding: 0.5rem;
    }
    .token-auth__code-input {
      font-size: 1.4rem;
      letter-spacing: 0.4em;
      text-align: center;
      padding: 0.5em 0.5em;
      border: 1.5px solid var(--border);
      outline: none;
      background: var(--body);
      color: var(--text);
      width: 50%;
    }
    .token-auth__code-description {
      padding-left: 0.5rem;
      color: var(--text);
      font-size: var(--secondary-font-size);
    }

    .token-auth__footer {
      display: flex;
      gap: 1rem;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
    }
    .token-auth__footer-btn {
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
    .token-auth__footer-btn:hover, .token-auth__footer-btn:focus {
      background: var(--accent);
      color: var(--text);
    }
    .error {
      color: var(--warning);
      font-size: var(--secondary-font-size);
      min-height: 1.5rem;
      text-align: end;
    }
    .input-error {
      border: 2.5px solid var(--warning);
    }
  </style>

  <div class="token-auth">
    <div class="token-auth__header">
      <h1 class="token-auth__title">${t('profile.2FA')}</h1>
    </div>
    <div class="token-auth__content">
      <form id="tokenForm" class="token-auth__edit" autocomplete="off">
        <input id="email" class="token-auth__input" name="email" type="email" disabled />
        <div class="token-auth__input-wrapper">
          <input id="password" class="token-auth__input" name="password" type="password" minlength="7" disabled />
          <span id="viewBtn" class="token-auth__input--icon">${actionIcons.eye}</span>
        </div>
        <div id="codeWrapper" class="token-auth__code">
          <p class="token-auth__code-description">${t('profile.invalidCode')}</p>
          <input id="codeInput" class="token-auth__code-input" name="2fa" type="text" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" placeholder="------" required />
        </div>
      </form>
      <div class="token-auth__error">
        <p id="error" class="error"></p>
      </div>
    </div>
    <div class="token-auth__footer">
      <button id="verifyBtn" class="token-auth__footer-btn" type="submit" form="tokenForm">${t('profile.verify')}</button>
    </div>
  </div>
`;

export class UserToken extends HTMLElement {
  private emailInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private codeInput!: HTMLInputElement;
  private errorDiv!: HTMLParagraphElement;
  private viewBtn!: HTMLSpanElement;
  private tokenForm!: HTMLFormElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadow = this.shadowRoot!;
    this.emailInput = shadow.getElementById('email') as HTMLInputElement;
    this.passwordInput = shadow.getElementById('password') as HTMLInputElement;
    this.codeInput = shadow.getElementById('codeInput') as HTMLInputElement;
    this.errorDiv = shadow.getElementById('error') as HTMLDivElement;
    this.viewBtn = shadow.getElementById('viewBtn') as HTMLSpanElement;
    this.tokenForm = shadow.getElementById('tokenForm') as HTMLFormElement;

    this.tokenForm.addEventListener('submit', (e) => this._onSubmit(e));
    this.viewBtn.addEventListener('click', () => this._togglePassword());
  }

  _setError(message: string) {
    this.errorDiv.textContent = message;
    this.shadowRoot.getElementById('codeWrapper').classList.add('input-error');
  }

  _clearError() {
    this._setError('');
    this.shadowRoot.getElementById('codeWrapper').classList.remove('input-error');
  }

  private _togglePassword() {
    const isVisible = this.passwordInput.type === 'text';
    this.passwordInput.type = isVisible ? 'password' : 'text';
    this.viewBtn.innerHTML = isVisible ? actionIcons.eye : actionIcons.eyeClosed;
  }

  private async _onSubmit(e: Event) {
    e.preventDefault();
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;
    const token = this.codeInput.value.trim();

    this._setError('');
    this.codeInput.classList.remove('input-error');

    const res = await authService.login(email, password, token);
    if (res.error) {
      this.codeInput.classList.add('input-error');
      this._setError(err(res.error));
      return;
    }

    // trigger login-success event for parent
    this._clearError();
    setUserData(res, email);
    this.dispatchEvent(new CustomEvent('login-success', { bubbles: true, composed: true }));
  }
}

customElements.define('user-token', UserToken);