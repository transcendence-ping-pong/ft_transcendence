import { t, err } from '@/locales/Translations.js';
import { actionIcons } from '@/utils/Constants.js';
import * as authService from '@/services/authService.js';

// when entering signin credentials, the user will be redirected to this component
// this extra step is available only if user has 2FA enabled in their profile
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      padding: 3rem;
      width: 100%;
      height: 100%;
    }
    .token-auth {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: stretch;
    }
    .token-auth__header {
      padding: 2rem 0 1rem 0;
      text-align: center;
      border: 2px solid red;
    }
    .token-auth__title {
      color: var(--text);
      font-size: var(--title-modal-font-size);
      margin: 0;
    }
    hr {
      border: none;
      border-top: 1px solid var(--border);
      padding-bottom: 1rem;
    }

    .token-auth__code {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .token-auth__code-description {
      color: var(--border);
      font-size: var(--secondary-font-size);
      margin: 0.5rem 0 0 0;
    }

    .token-auth__content {
      flex: 1;
      display: flex;
      height: 100%;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px solid green;
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
      border: 1.5px solid var(--accent);
      font-size: 1rem;
      background: var(--body);
      color: var(--text);
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      width: 100%;
    }
    .token-auth__input:focus {
      border-color: var(--border);
    }
    .input-error {
      border-color: var(--warning);
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

    .token-auth__footer {
      flex: 1;
      display: flex;
      gap: 1rem;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      border: 2px solid blue;
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
      font-size: 0.95rem;
      min-height: 1.2em;
      margin-top: 0.5em;
      text-align: center;
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
        <div class="token-auth__code">
          <p class="token-auth__code-description">${t('profile.invalidCode')}</p>
          <input id="codeInput" class="token-auth__code-input" name="2fa" type="text" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" placeholder="------" required />
        </div>
        <div id="error" class="error"></div>
      </form>
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
  private errorDiv!: HTMLDivElement;
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

    shadow.getElementById('cancelBtn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('switch-to-login', { bubbles: true, composed: true }));
    });
  }

  setCredentials(email: string, password: string) {
    this.emailInput.value = email || '';
    this.passwordInput.value = password || '';
  }

  setError(message: string) {
    this.errorDiv.textContent = message;
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

    this.setError('');
    this.emailInput.classList.remove('input-error');
    this.passwordInput.classList.remove('input-error');
    this.codeInput.classList.remove('input-error');

    const res = await authService.login(email, password, token);
    console.log('TOKEN response:', res);
    if (res.error) {
      this.codeInput.classList.add('input-error');
      this.setError(err(res.error));
      return;
    }

    // Success: trigger login-success event for parent
    this.setError('');
    this.dispatchEvent(new CustomEvent('login-success', { bubbles: true, composed: true }));
  }
}

customElements.define('user-token', UserToken);