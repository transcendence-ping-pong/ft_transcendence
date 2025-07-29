import { t } from '@/locales/Translations.js'

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: WiredMono, helvetica, sans-serif;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    input {
      flex: 1;
      padding: 1rem 1rem;
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
      flex: 1;
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
  </style>

  <form id="loginForm" autocomplete="off">
    <input id="username" name="username" type="email" required autocomplete="username" />
    <input id="password" name="password" type="password" minlength=7 required autocomplete="current-password" />
    <button id="login" type="submit" />
  </form>
`;

export class UserLogin extends HTMLElement {
  private _error = '';

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const form = this.shadowRoot?.getElementById('loginForm');
    form?.addEventListener('submit', this._onSubmit.bind(this));

    const usernameInput = this.shadowRoot?.getElementById('username') as HTMLInputElement;
    const passwordInput = this.shadowRoot?.getElementById('password') as HTMLInputElement;
    const button = this.shadowRoot?.getElementById('login') as HTMLButtonElement;

    if (usernameInput) usernameInput.placeholder = t('auth.username');
    if (passwordInput) passwordInput.placeholder = t('auth.password');
    if (button) button.textContent = t('auth.login');
  }

  disconnectedCallback() {
    const form = this.shadowRoot?.getElementById('loginForm');
    form?.removeEventListener('submit', this._onSubmit.bind(this));
  }

  set error(msg: string) {
    this._error = msg;
    // this._updateError();
  }

  get error() {
    return this._error;
  }

  private _onSubmit(e: Event) {
    // e.preventDefault();
    const username = (this.shadowRoot?.getElementById('username') as HTMLInputElement)?.value.trim();
    const password = (this.shadowRoot?.getElementById('password') as HTMLInputElement)?.value;
    // this.error = '';

    // if (!username || !password) {
    //   this.error = 'Please fill in all fields';
    //   return;
    // }

    // if (password.length < 7) {
    //   this.error = 'Minimum 7 chars long';
    //   return;
    // }

    this.dispatchEvent(new CustomEvent('login', {
      detail: { username, password },
      bubbles: true,
      composed: true
    }));
  }

  private _updateError() {
    const errorDiv = this.shadowRoot?.getElementById('error');
    if (errorDiv) errorDiv.textContent = this._error;
  }
}

customElements.define('user-login', UserLogin);