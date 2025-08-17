import { t, err } from '@/locales/Translations.js';
import * as authService from '@/services/authService.js';
import { setUserData } from '@/state';
import '@/components/templates/AuthFormLayout.js';

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
    .auth-form__google-button,
    .auth-form__primary-button {
      padding: 1rem 0;
      border: none;
      background: var(--accent-secondary);
      color: var(--body);
      font-size: calc(var(--main-font-size) * 1.25);
      font-weight: bold;
      min-height: var(--button-height, 59px);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .auth-form__primary-button:hover, .auth-form__primary-button:focus {
      background: var(--accent);
      color: var(--text);
    }
    .auth-form__google-button {
      background: var(--google);
      color: var(--text);
    }
    .auth-form__google-button:hover, .auth-form__google-button:focus {
      background: var(--google-hover);
    }
    .auth-form__google-button-icon {
      width: 1.5em;
      height: 1.5em;
      vertical-align: middle;
      margin-right: 0.5em;
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
    <h2 slot="header">${t('auth.signin')}</h2>
    <form slot="content" id="loginForm" autocomplete="off">
      <input id="email" class="auth-form__input" name="email" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
      <input id="password" class="auth-form__input" name="password" type="password" minlength="7" required autocomplete="current-password" placeholder="${t('auth.password')}" />
    </form>
    <div slot="error" id="error" class="auth-form__error"></div>
    <div slot="footer" class="auth-form__footer">
      <button id="login" class="auth-form__primary-button" type="submit" form="loginForm">${t('auth.signin')}</button>
      <button id="google" type="button" class="auth-form__google-button">
        <svg class="auth-form__google-button-icon" viewBox="0 0 48 48">
          <g>
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.36 1.22 8.34 2.26l6.18-6.18C34.62 2.06 29.7 0 24 0 14.64 0 6.4 5.48 2.44 13.44l7.6 5.91C12.2 13.36 17.6 9.5 24 9.5z"/>
            <path fill="#34A853" d="M46.1 24.5c0-1.54-.14-3.02-.39-4.45H24v8.43h12.44c-.54 2.74-2.18 5.06-4.64 6.62l7.44 5.79C43.98 37.06 46.1 31.36 46.1 24.5z"/>
            <path fill="#FBBC05" d="M10.04 28.35c-.62-1.84-.98-3.8-.98-5.85s.36-4.01.98-5.85l-7.6-5.91C.86 14.98 0 19.33 0 24c0 4.67.86 9.02 2.44 13.26l7.6-5.91z"/>
            <path fill="#EA4335" d="M24 48c6.48 0 11.92-2.14 15.9-5.84l-7.44-5.79c-2.08 1.4-4.74 2.23-8.46 2.23-6.4 0-11.8-3.86-14.96-9.45l-7.6 5.91C6.4 42.52 14.64 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </g>
        </svg>
        ${t('auth.signinWithGoogle')}
      </button>
      <div>
        ${t('auth.createAccount')}
        <button id="signupBtn" type="button" class="auth-form__footer-link">${t('auth.signup')}</button>
      </div>
    </div>
  </auth-form-layout>
`;

export class UserSignin2 extends HTMLElement {
  emailInput!: HTMLInputElement;
  passwordInput!: HTMLInputElement;
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
    shadow.getElementById('loginForm')!.onsubmit = this._onLogin.bind(this);
    shadow.getElementById('google')!.onclick = this._onGoogleLogin.bind(this);
    shadow.getElementById('signupBtn')!.onclick = this._onSignupClick.bind(this);

    this.emailInput.addEventListener('input', () => this._clearError());
    this.passwordInput.addEventListener('input', () => this._clearError());
  }

  private async _onLogin(e: Event) {
    e.preventDefault();
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    authService.check2FAStatus(email).then((status) => {
      const enabled = !!status.has2FA;
      if (enabled) {
        this.dispatchEvent(new CustomEvent('switch-to-token', { bubbles: true, composed: true, detail: { email, password } }));
        return;
      }
    }).catch((error) => {
      this._setError(err(error.message || 'Failed to check 2FA status'));
      return;
    });

    const res = await authService.login(email, password);
    if (res.error) {
      this.emailInput.classList.add('auth-form__input-error');
      this.passwordInput.classList.add('auth-form__input-error');
      this._setError(err(res.error));
      return;
    }

    this._clearError();
    setUserData(res, email);
    this.dispatchEvent(new CustomEvent('login-success', { bubbles: true, composed: true }));
  }

  async _onGoogleLogin(e: Event) {
    e.preventDefault();
    await authService.googleLogin();
  }

  _onSignupClick(e: Event) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('switch-to-signup', { bubbles: true, composed: true }));
  }

  _setError(msg: string) {
    (this.layout as any).setError(msg);
  }

  _clearError() {
    (this.layout as any).clearError(() => {
      this.emailInput.classList.remove('auth-form__input-error');
      this.passwordInput.classList.remove('auth-form__input-error');
    });
  }
}

customElements.define('user-signin2', UserSignin2);