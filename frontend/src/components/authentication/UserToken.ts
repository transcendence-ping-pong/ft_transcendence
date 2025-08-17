import { t, err } from '@/locales/Translations.js';
import { actionIcons } from '@/utils/Constants.js';
import * as authService from '@/services/authService.js';
import { setUserData } from '@/state';
import '@/components/_templates/AuthFormLayout.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      max-width: var(--auth-form-max-width, 400px);
      margin: 0 auto;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    }
    .auth-form__input {
      padding: 1rem;
      border: 1.5px solid var(--accent);
      font-size: var(--main-font-size);
      background: var(--body);
      color: var(--border);
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      width: 100%;
    }
    .auth-form__input:focus {
      border-color: var(--border);
    }
    .input-error {
      border-color: var(--warning);
    }
    .auth-form__input-wrapper {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }
    .auth-form__input--icon {
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
    .auth-form__input--icon img {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }
    .auth-form__code {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      background: var(--accent-50);
      padding: 0.5rem;
    }
    .auth-form__code-input {
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
    .auth-form__code-description {
      padding-left: 0.5rem;
      color: var(--text);
      font-size: var(--secondary-font-size);
    }
    .auth-form__footer {
      margin-top: 1rem;
      text-align: center;
      font-size: var(--main-font-size);
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    .template__primary-button {
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
    .template__primary-button:hover, .template__primary-button:focus {
      background: var(--accent);
      color: var(--text);
    }
    .auth-form__error {
      color: var(--warning);
      font-size: var(--secondary-font-size);
      min-height: 1.5rem;
      text-align: end;
    }
    .auth-form__input-error {
      border: 2.5px solid var(--warning);
    }
  </style>
  <auth-form-layout>
    <div slot="header">
      <h2>${t('profile.2FA')}</h2>
    </div>
    <form slot="content" id="tokenForm" autocomplete="off">
      <input id="email" class="auth-form__input" name="email" type="email" disabled />
      <div class="auth-form__input-wrapper">
        <input id="password" class="auth-form__input" name="password" type="password" minlength="7" disabled />
        <span id="viewBtn" class="auth-form__input--icon">${actionIcons.eye}</span>
      </div>
      <div class="auth-form__code">
        <p class="auth-form__code-description">${t('profile.invalidCode')}</p>
        <input id="codeInput" class="auth-form__code-input" name="2fa" type="text" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" placeholder="------" required />
      </div>
    </form>
    <div slot="error" id="error" class="auth-form__error"></div>
    <div slot="footer" class="auth-form__footer">
      <button id="verifyBtn" class="template__primary-button" type="submit" form="tokenForm">${t('profile.verify')}</button>
    </div>
  </auth-form-layout>
`;

export class UserToken2 extends HTMLElement {
  private emailInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private codeInput!: HTMLInputElement;
  private viewBtn!: HTMLSpanElement;
  private tokenForm!: HTMLFormElement;
  private layout!: HTMLElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadow = this.shadowRoot!;
    this.layout = shadow.querySelector('auth-form-layout')!;
    this.emailInput = shadow.getElementById('email') as HTMLInputElement;
    this.passwordInput = shadow.getElementById('password') as HTMLInputElement;
    this.codeInput = shadow.getElementById('codeInput') as HTMLInputElement;
    this.viewBtn = shadow.getElementById('viewBtn') as HTMLSpanElement;
    this.tokenForm = shadow.getElementById('tokenForm') as HTMLFormElement;

    this.tokenForm.addEventListener('submit', (e) => this._onSubmit(e));
    this.viewBtn.addEventListener('click', () => this._togglePassword());
    this.codeInput.addEventListener('input', () => this._clearError());
  }

  _setError(message: string) {
    (this.layout as any).setError(message);
    this.shadowRoot!.getElementById('codeInput')!.classList.add('auth-form__input-error');
  }

  _clearError() {
    (this.layout as any).clearError(() => {
      this.shadowRoot!.getElementById('codeInput')!.classList.remove('auth-form__input-error');
    });
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

    // TODO: check, I believe this is not necessary because of HTML5 validation
    // if (!/^\d{6}$/.test(token)) {
    //   this._setError(t("profile.invalidCode"));
    //   return;
    // }

    const res = await authService.login(email, password, token);
    if (res.error) {
      this.codeInput.classList.add('auth-form__input-error');
      this._setError(err(res.error));
      return;
    }

    this._clearError();
    setUserData(res, email);
    this.dispatchEvent(new CustomEvent('login-success', { bubbles: true, composed: true }));
  }
}

customElements.define('user-token2', UserToken2);
