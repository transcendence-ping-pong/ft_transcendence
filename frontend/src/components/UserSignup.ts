import { t } from '@/locales/Translations.js';
import * as authService from '@/services/authService.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      min-width: 400px;
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
      color: red;
      text-align: center;
      margin-bottom: 0.5em;
    }
  </style>

  <div class="form-title">${t('auth.signup')}</div>
  <form id="signupForm" autocomplete="off">
    <input id="email" name="email" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
    <input id="password" name="password" type="password" minlength=7 required autocomplete="new-password" placeholder="${t('auth.password')}" />
    <button id="signup" type="submit">${t('auth.signup')}</button>
    <div id="error" class="error"></div>
  </form>
  <div class="footer">
    ${t('auth.alreadyHaveAccount')}
    <button id="loginBtn" type="button">${t('auth.signin')}</button>
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
