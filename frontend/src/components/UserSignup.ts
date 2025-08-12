import { t, err } from '@/locales/Translations.js';
import * as authService from '@/services/authService.js';

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
      color: var(--border);
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: var(--border);
    }
    .input-error:focus,
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
      background: var(--accent);
      color: var(--text);
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
      font-size: 1rem;
      margin-left: 0.25rem;
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

  <h1 class="form-title">${t('auth.signup')}</h1>
  <form id="signupForm" autocomplete="off">
    <input id="username" name="username" type="text" required autocomplete="username" placeholder="${t('auth.username')}" />
    <input id="email" name="email" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
    <input id="password" name="password" type="password" minlength=6 required autocomplete="new-password" placeholder="${t('auth.password')}" />
    <p id="error" class="error"></p>
    <button id="signup" type="submit">${t('auth.signup')}</button>
  </form>
  <div class="footer">
    ${t('auth.alreadyHaveAccount')}
    <button id="loginBtn" type="button">${t('auth.signin')}</button>
  </div>
`;

export class UserSignup extends HTMLElement {
  emailInput!: HTMLInputElement;
  passwordInput!: HTMLInputElement;
  usernameInput!: HTMLInputElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  // arrow functions automatically bind `this` to the class instance
  // so we can use them as event handlers without binding
  // e.g. this._onSignup = () => { ... } versus this._onSignup.bind(this)
  connectedCallback() {
    const shadow = this.shadowRoot;
    this.emailInput = shadow.getElementById('email') as HTMLInputElement;
    this.passwordInput = shadow.getElementById('password') as HTMLInputElement;
    this.usernameInput = shadow.getElementById('username') as HTMLInputElement;
    shadow.getElementById('signupForm').onsubmit = this._onSignup.bind(this);
    shadow.getElementById('loginBtn').onclick = this._onLoginClick.bind(this);

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
      this.emailInput.classList.add('input-error');
      this.usernameInput.classList.add('input-error');
      this.passwordInput.classList.add('input-error');
      this._setError(err(res.error));
      return;
    }

    // remove error styles if signup is successful and trigger event
    this._clearError();
    this._setError('');
    this.dispatchEvent(new CustomEvent('switch-to-login',
      {
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
    this.shadowRoot.getElementById('error').textContent = msg;
  }

  _clearError() {
    this._setError('');
    this.emailInput.classList.remove('input-error');
    this.passwordInput.classList.remove('input-error');
    this.usernameInput.classList.remove('input-error');
  }
}

customElements.define('user-signup', UserSignup);
