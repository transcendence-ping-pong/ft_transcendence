import { t, err } from '@/locales/Translations.js';
import * as authService from '@/services/authService.js';
import '@/components/_templates/AuthFormLayout.js';

// because of shadow DOM, styles are encapsulated here...
// ... even so all auth components share the same behaviour
// TODO: light DOM? render all markup inside the layout component?
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
    }
    .auth-form__input:focus {
      border-color: var(--border);
    }
    .input-error {
      border-color: var(--warning);
    }
    .template__primary-button {
      padding: 1rem 0;
      border: none;
      background: var(--accent-secondary);
      color: var(--body);
      font-size: var(--main-font-size);
      font-weight: bold;
      min-height: 59px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .template__primary-button:hover, .template__primary-button:focus {
      background: var(--accent);
      color: var(--text);
    }
    .auth-form__footer-link {
      background: none;
      color: var(--accent-secondary);
      border: none;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      font-size: var(--main-font-size);
      margin-left: 0.25rem;
      text-decoration: none;
    }
    .auth-form__footer-link:hover, .auth-form__footer-link:focus {
      color: var(--accent);
    }
    .auth-form__footer {
      margin-top: 1rem;
      text-align: center;
      font-size: var(--main-font-size);
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }
    .auth-form__error {
      min-height: 1.25rem;
      color: var(--warning);
      font-size: var(--secondary-font-size);
      text-align: start;
    }
    .auth-form__input-error {
      border: 2px solid var(--warning);
    }
  </style>
  <auth-form-layout>
    <h2 slot="header">${t('auth.signup')}</h2>
    <form slot="content" id="signupForm" autocomplete="off">
      <input id="username" class="auth-form__input" name="username" type="text" required autocomplete="username" placeholder="${t('auth.username')}" />
      <input id="email" class="auth-form__input" name="email" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
      <input id="password" class="auth-form__input" name="password" type="password" minlength="6" required autocomplete="new-password" placeholder="${t('auth.password')}" />
    </form>
    <div slot="error" id="error" class="auth-form__error"></div>
    <div slot="footer" class="auth-form__footer">
      <button id="signup" class="template__primary-button" type="submit" form="signupForm">${t('auth.signup')}</button>
      <div>
        ${t('auth.alreadyHaveAccount')}
        <button id="loginBtn" type="button" class="auth-form__footer-link">${t('auth.signin')}</button>
      </div>
    </div>
  </auth-form-layout>
`;

export class UserSignup2 extends HTMLElement {
  emailInput!: HTMLInputElement;
  passwordInput!: HTMLInputElement;
  usernameInput!: HTMLInputElement;
  layout!: HTMLElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadow = this.shadowRoot!;
    this.layout = shadow.querySelector('auth-form-layout')!;
    this.emailInput = shadow.getElementById('email') as HTMLInputElement;
    this.passwordInput = shadow.getElementById('password') as HTMLInputElement;
    this.usernameInput = shadow.getElementById('username') as HTMLInputElement;
    shadow.getElementById('signupForm')!.onsubmit = this._onSignup.bind(this);
    shadow.getElementById('loginBtn')!.onclick = this._onLoginClick.bind(this);

    this.emailInput.addEventListener('input', () => this._clearError());
    this.passwordInput.addEventListener('input', () => this._clearError());
    this.usernameInput.addEventListener('input', () => this._clearError());
  }

  async _onSignup(e: Event) {
    e.preventDefault();
    const email = this.emailInput.value.trim();
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;

    const res = await authService.signup(username, email, password);
    if (res.error) {
      this.emailInput.classList.add('auth-form__input-error');
      this.usernameInput.classList.add('auth-form__input-error');
      this.passwordInput.classList.add('auth-form__input-error');
      this._setError(err(res.error));
      return;
    }

    this._clearError();
    this._setError('');
    this.dispatchEvent(new CustomEvent('switch-to-login', {
      detail: { email, password },
      bubbles: true,
      composed: true
    }));
  }

  _onLoginClick(e: Event) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('switch-to-login', { bubbles: true, composed: true }));
  }

  _setError(msg: string) {
    (this.layout as any).setError(msg);
  }

  _clearError() {
    (this.layout as any).clearError(() => {
      this.emailInput.classList.remove('auth-form__input-error');
      this.passwordInput.classList.remove('auth-form__input-error');
      this.usernameInput.classList.remove('auth-form__input-error');
    });
  }
}

customElements.define('user-signup2', UserSignup2);
