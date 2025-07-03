const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: WiredMono, helvetica, sans-serif;
      padding: 1rem 0;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }
    label {
      font-size: 0.95rem;
      color: var(--border, #222);
      margin-bottom: 0.25rem;
    }
    input {
      padding: 0.5rem;
      border: 1.5px solid var(--accent, #5be9b9);
      border-radius: 0.4rem;
      font-size: 1rem;
      background: var(--body, #fff);
      color: var(--border, #222);
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: var(--border, #222);
    }
    button {
      margin-top: 0.5rem;
      padding: 0.5rem 0;
      border: none;
      border-radius: 0.4rem;
      background: var(--accent, #5be9b9);
      color: var(--body, #fff);
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    button:hover, button:focus {
      background: var(--border, #222);
      color: var(--accent, #5be9b9);
    }
    .error {
      color: #ff4f4f;
      font-size: 0.95rem;
      min-height: 1.2em;
      margin-top: 0.25rem;
      text-align: center;
    }
  </style>
  <form id="loginForm" autocomplete="off">
    <div>
      <label for="username">Username</label>
      <input id="username" name="username" type="text" required autocomplete="username" />
    </div>
    <div>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" required autocomplete="current-password" />
    </div>
    <button type="submit">Login</button>
    <div class="error" id="error"></div>
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
  }

  disconnectedCallback() {
    const form = this.shadowRoot?.getElementById('loginForm');
    form?.removeEventListener('submit', this._onSubmit.bind(this));
  }

  set error(msg: string) {
    this._error = msg;
    this._updateError();
  }

  get error() {
    return this._error;
  }

  private _onSubmit(e: Event) {
    e.preventDefault();
    const username = (this.shadowRoot?.getElementById('username') as HTMLInputElement)?.value.trim();
    const password = (this.shadowRoot?.getElementById('password') as HTMLInputElement)?.value;
    this.error = ''; // Clear error

    // Dispatch a custom event for parent to handle login logic
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