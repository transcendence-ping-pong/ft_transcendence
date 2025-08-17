import { t, err } from '@/locales/Translations.js';
import * as authService from '@/services/authService.js';
import { state } from '@/state';
import { UserData } from '@/utils/playerUtils/types';

// TODO IMPROVEMENT: signin and signup can be abstracted
// there are too many similarities and repetition
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      min-width: 400px;
      min-width: 465px;
      margin: 0 auto;
    }
    .form-title {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 1rem;
      text-align: center;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    input {
      padding: 1rem;
      border: 1.5px solid var(--accent);
      font-size: 1rem;
      background: var(--body);
      color: var(--text);
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: var(--border);
    }
    .input-error {
      border-color:var(--warning);
    }
    button {
      padding: 1rem 0;
      border: none;
      background: var(--accent-secondary);
      color: var(--body);
      font-size: 1.125rem;
      font-weight: bold;
      min-height: 59px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    button:hover, button:focus {
      background: var(--accent);
      color: var(--text);
    }
    .google-btn {
      background: var(--google);
      color: var(--text);
    }
    .google-btn:hover, .google-btn:focus {
      background: var(--google-hover);
    }
    .google-btn-icon {
      width: 1.5em;
      height: 1.5em;
      vertical-align: middle;
      margin-right: 0.5em;
    }
    .footer {
      text-align: center;
      font-size: 1rem;
      color: var(--text);
    }
    .footer button {
      background: none;
      color: var(--accent-secondary);
      border: none;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      font-size: 1em;
      margin-left: 0.5em;
      text-decoration: none;
    }
    .footer button:hover, .footer button:focus {
      transform: scale(1.05);
      text-decoration: underline;
    }
    .error {
      font-size: 0.75rem;
      color: var(--warning);
      text-align: start;
      margin-top: -0.5rem;
      min-height: 1.25rem;
      display: block;
    }
  </style>

  <h1 class="form-title">${t('auth.signin')}</h1>
  <form id="loginForm" autocomplete="off">
    <input id="email" name="email" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
    <input id="password" name="password" type="password" minlength=7 required autocomplete="current-password" placeholder="${t('auth.password')}" />
    <div id="error" class="error"></div>
    <button id="login" type="submit">${t('auth.signin')}</button>
    <button id="google" type="button" class="google-btn">
      <svg class="google-btn-icon" viewBox="0 0 48 48">
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
  </form>
  <div class="footer">
    ${t('auth.createAccount')}
    <button id="signupBtn" type="button">${t('auth.signup')}</button>
  </div>
`;

export class UserSignin extends HTMLElement {
  emailInput!: HTMLInputElement;
  passwordInput!: HTMLInputElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadow = this.shadowRoot;
    this.emailInput = shadow.getElementById('email') as HTMLInputElement;
    this.passwordInput = shadow.getElementById('password') as HTMLInputElement;
    shadow.getElementById('loginForm').onsubmit = this._onLogin.bind(this);
    shadow.getElementById('google').onclick = this._onGoogleLogin.bind(this);
    shadow.getElementById('signupBtn').onclick = this._onSignupClick.bind(this);

    this.emailInput.addEventListener('input', () => this._clearError());
    this.passwordInput.addEventListener('input', () => this._clearError());
  }

  // private method, set user data in state in a more structured way
  // method is not part of the public API
  // _ prefix indicates it's intended for internal use only, but not enforced
  #setUserData(res: authService.AuthResponse, email: string) {
    state.userData = {
      username: res.username || '',
      email,
      accessToken: res.accessToken || '',
      refreshToken: res.refreshToken || '',
    } as UserData;
  }

  async _onLogin(e: Event) {
    e.preventDefault();
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    const res = await authService.login(email, password);
    if (res.error) {
      this.emailInput.classList.add('input-error');
      this.passwordInput.classList.add('input-error');
      this._setError(err(res.error));
      return;
    }

    // remove error styles if login is successful and trigger event
    this._clearError();
    this._setError('');
    this.#setUserData(res, email);
    this.dispatchEvent(new CustomEvent('loginSuccess', { bubbles: true, composed: true }));
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
    this.shadowRoot.getElementById('error').textContent = msg;
  }

  _clearError() {
    this._setError('');
    this.emailInput.classList.remove('input-error');
    this.passwordInput.classList.remove('input-error');
  }
}

customElements.define('user-signin', UserSignin);
