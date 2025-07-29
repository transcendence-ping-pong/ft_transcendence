import { t } from '@/locales/Translations.js';
import * as authService from '@/services/authService.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: WiredMono, helvetica, sans-serif;
      max-width: 400px;
      margin: 0 auto;
    }
    .form-title {
      font-size: 1.5em;
      font-weight: bold;
      margin-bottom: 1em;
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
    button {
      padding: 1rem 0;
      border: none;
      background: var(--accent);
      color: var(--body);
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    button:hover, button:focus {
      background: var(--border);
      color: var(--accent);
    }
    .google-btn {
      background: #4285F4;
      color: #fff;
      margin-bottom: 0.5em;
    }
    .footer {
      margin-top: 1em;
      text-align: center;
      font-size: 0.98em;
      color: var(--text);
    }
    .footer button {
      background: none;
      color: var(--accent);
      border: none;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      font-size: 1em;
      margin-left: 0.5em;
      text-decoration: underline;
    }
    .error {
      color: red;
      text-align: center;
      margin-bottom: 0.5em;
    }
  </style>

  <div class="form-title">${t('auth.createAccount')}</div>
  <form id="signupForm" autocomplete="off">
    <input id="email" name="email" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
    <input id="password" name="password" type="password" minlength=7 required autocomplete="new-password" placeholder="${t('auth.password')}" />
    <button id="signup" type="submit">${t('auth.createAccount')}</button>
    <button id="google" type="button" class="google-btn">${t('auth.continueWithGoogle')}</button>
    <div id="error" class="error"></div>
  </form>
  <div class="footer">
    ${t('auth.alreadyHaveAccount')}
    <button id="loginBtn" type="button">${t('auth.login')}</button>
  </div>
`;

export class UserSignup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadow = this.shadowRoot;
    shadow.getElementById('signupForm').onsubmit = this._onSignup.bind(this);
    shadow.getElementById('google').onclick = this._onGoogleLogin.bind(this);
    shadow.getElementById('loginBtn').onclick = this._onLoginClick.bind(this);
  }

  async _onSignup(e) {
    e.preventDefault();
    const email = this.shadowRoot.getElementById('email').value.trim();
    const password = this.shadowRoot.getElementById('password').value;
    if (!email || !password) {
      this._setError('Please enter both email and password');
      return;
    }
    const res = await authService.signup(email, password);
    if (res.error) {
      this._setError(res.error);
    } else {
      this._setError('');
      alert('Signup successful! Please log in.');
      this.dispatchEvent(new CustomEvent('switch-to-login', { bubbles: true, composed: true }));
    }
  }

  async _onGoogleLogin(e) {
    e.preventDefault();
    await authService.googleLogin();
  }

  _onLoginClick(e) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('switch-to-login', { bubbles: true, composed: true }));
  }

  _setError(msg) {
    this.shadowRoot.getElementById('error').textContent = msg;
  }
}

customElements.define('user-signup', UserSignup);
