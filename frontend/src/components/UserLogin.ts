// // const template = document.createElement('template');
// // template.innerHTML = `
// //   <style>
// //     :host {
// //       display: block;
// //       font-family: WiredMono, helvetica, sans-serif;
// //     }
// //     form {
// //       display: flex;
// //       flex-direction: column;
// //       gap: 1rem;
// //       align-items: stretch;
// //     }
// //     input {
// //       flex: 1;
// //       padding: 1rem 1rem;
// //       border: 1.5px solid var(--accent);
// //       font-size: 1rem;
// //       background: var(--body);
// //       color: var(--border);
// //       outline: none;
// //       transition: border-color 0.2s;
// //     }
// //     input:focus {
// //       border-color: var(--border);
// //     }
// //     button {
// //       flex: 1;
// //       padding: 1rem 0;
// //       border: none;
// //       background: var(--accent);
// //       color: var(--body);
// //       font-size: 1rem;
// //       font-weight: bold;
// //       cursor: pointer;
// //       transition: background 0.2s, color 0.2s;
// //     }
// //     button:hover, button:focus {
// //       background: var(--border);
// //       color: var(--accent);
// //     }
// //   </style>

// //   <form id="loginForm" autocomplete="off">
// //     <input id="username" name="username" type="email" required autocomplete="username" />
// //     <input id="password" name="password" type="password" minlength=7 required autocomplete="current-password" />
// //     <button id="login" type="submit" />
// //   </form>
// // `;

// // export class UserLogin extends HTMLElement {
// //   private _error = '';

// //   constructor() {
// //     super();
// //     const shadow = this.attachShadow({ mode: 'open' });
// //     shadow.appendChild(template.content.cloneNode(true));
// //   }

// //   connectedCallback() {
// //     const form = this.shadowRoot?.getElementById('loginForm');
// //     form?.addEventListener('submit', this._onSubmit.bind(this));

// //     const usernameInput = this.shadowRoot?.getElementById('username') as HTMLInputElement;
// //     const passwordInput = this.shadowRoot?.getElementById('password') as HTMLInputElement;
// //     const button = this.shadowRoot?.getElementById('login') as HTMLButtonElement;

// //     if (usernameInput) usernameInput.placeholder = t('auth.username');
// //     if (passwordInput) passwordInput.placeholder = t('auth.password');
// //     if (button) button.textContent = t('auth.login');
// //   }

// //   disconnectedCallback() {
// //     const form = this.shadowRoot?.getElementById('loginForm');
// //     form?.removeEventListener('submit', this._onSubmit.bind(this));
// //   }

// //   set error(msg: string) {
// //     this._error = msg;
// //     // this._updateError();
// //   }

// //   get error() {
// //     return this._error;
// //   }

// //   private _onSubmit(e: Event) {
// //     // e.preventDefault();
// //     const username = (this.shadowRoot?.getElementById('username') as HTMLInputElement)?.value.trim();
// //     const password = (this.shadowRoot?.getElementById('password') as HTMLInputElement)?.value;
// //     // this.error = '';

// //     // if (!username || !password) {
// //     //   this.error = 'Please fill in all fields';
// //     //   return;
// //     // }

// //     // if (password.length < 7) {
// //     //   this.error = 'Minimum 7 chars long';
// //     //   return;
// //     // }

// //     this.dispatchEvent(new CustomEvent('login', {
// //       detail: { username, password },
// //       bubbles: true,
// //       composed: true
// //     }));
// //   }

// //   private _updateError() {
// //     const errorDiv = this.shadowRoot?.getElementById('error');
// //     if (errorDiv) errorDiv.textContent = this._error;
// //   }
// // }

// // customElements.define('user-login', UserLogin);

// import { t } from '@/locales/Translations.js';
// import * as authService from '@/services/authService.js';

// const template = document.createElement('template');
// template.innerHTML = `
//   <style>
//     :host {
//       display: block;
//       font-family: WiredMono, helvetica, sans-serif;
//     }
//     form {
//       display: flex;
//       flex-direction: column;
//       gap: 1rem;
//       align-items: stretch;
//     }
//     input {
//       flex: 1;
//       padding: 1rem 1rem;
//       border: 1.5px solid var(--accent);
//       font-size: 1rem;
//       background: var(--body);
//       color: var(--border);
//       outline: none;
//       transition: border-color 0.2s;
//     }
//     input:focus {
//       border-color: var(--border);
//     }
//     button {
//       flex: 1;
//       padding: 1rem 0;
//       border: none;
//       background: var(--accent);
//       color: var(--body);
//       font-size: 1rem;
//       font-weight: bold;
//       cursor: pointer;
//       transition: background 0.2s, color 0.2s;
//     }
//     button:hover, button:focus {
//       background: var(--border);
//       color: var(--accent);
//     }
//     .section {
//       margin-top: 1em;
//     }
//     .hidden {
//       display: none !important;
//     }
//     #userList {
//       margin-top: 1em;
//       font-size: 0.95em;
//       color: var(--text);
//     }
//   </style>
//   <form id="loginForm" autocomplete="off">
//     <label for="username">${t('auth.username')}</label>
//     <input id="username" name="username" type="text" required autocomplete="username" />
//     <label for="password">${t('auth.password')}</label>
//     <input id="password" name="password" type="password" minlength=7 required autocomplete="current-password" />
//     <div id="tokenSection" class="hidden section">
//       <label for="loginToken">${t('auth.token')}</label>
//       <input id="loginToken" type="text" placeholder="${t('auth.token')}" />
//     </div>
//     <button id="signup" type="button">${t('auth.signup')}</button>
//     <button id="login" type="submit">${t('auth.login')}</button>
//     <button id="google" type="button">${t('auth.google')}</button>
//     <button id="logout" type="button">${t('auth.logout')}</button>
//     <div id="loginStatus" style="margin-top:10px;font-weight:bold;"></div>
//     <div id="authenticatorSection" class="hidden section">
//       <div id="generateSecretSection" class="hidden">
//         <h2>${t('auth.enableAuthenticator')}</h2>
//         <button id="generateSecret" type="button">${t('auth.generateSecret')}</button>
//         <img id="qrCode" alt="QR Code" style="margin-top:10px;">
//         <p id="secret"></p>
//       </div>
//       <div id="verifyTokenSection" class="hidden section">
//         <label for="verifyToken">${t('auth.token')}</label>
//         <input id="verifyToken" type="text" placeholder="${t('auth.token')}" />
//         <button id="verifyTokenBtn" type="button">${t('auth.verifyToken')}</button>
//       </div>
//     </div>
//     <ul id="userList"></ul>
//   </form>
// `;

// export class UserLogin extends HTMLElement {
//   _loggedInUser = null;

//   constructor() {
//     super();
//     this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
//   }

//   connectedCallback() {
//     const shadow = this.shadowRoot;
//     shadow.getElementById('signup').onclick = this._onSignup.bind(this);
//     shadow.getElementById('loginForm').onsubmit = this._onLogin.bind(this);
//     shadow.getElementById('google').onclick = this._onGoogleLogin.bind(this);
//     shadow.getElementById('logout').onclick = this._onLogout.bind(this);
//     shadow.getElementById('generateSecret').onclick = this._onGenerateSecret.bind(this);
//     shadow.getElementById('verifyTokenBtn').onclick = this._onVerifyToken.bind(this);

//     this._loggedInUser = localStorage.getItem('loggedInUser');
//     if (this._loggedInUser) this._updateLoginStatus(this._loggedInUser);
//     this._fetchUsers();
//   }

//   async _onSignup(e) {
//     e.preventDefault();
//     if (this._loggedInUser) {
//       alert('You are already logged in. Please log out before creating a new account.');
//       return;
//     }
//     const username = this.shadowRoot.getElementById('username').value.trim();
//     const password = this.shadowRoot.getElementById('password').value;
//     if (!username || !password) {
//       alert('Please enter both username and password');
//       return;
//     }
//     const res = await authService.signup(username, password);
//     if (res.error) {
//       alert(res.error);
//     } else {
//       alert('Signup successful! Please log in.');
//     }
//   }

//   async _onLogin(e) {
//     e.preventDefault();
//     const username = this.shadowRoot.getElementById('username').value.trim();
//     const password = this.shadowRoot.getElementById('password').value;
//     const token = this.shadowRoot.getElementById('loginToken').value;
//     if (!username || !password) {
//       alert('Please enter both username and password');
//       return;
//     }
//     const res = await authService.login(username, password, token);
//     if (res.error) {
//       alert(res.error);
//       if (res.requiresToken) {
//         this.shadowRoot.getElementById('tokenSection').classList.remove('hidden');
//       }
//     } else {
//       this._loggedInUser = username;
//       localStorage.setItem('loggedInUser', username);
//       this._updateLoginStatus(username);
//       this.shadowRoot.getElementById('tokenSection').classList.add('hidden');
//       alert('Login successful!');
//       this._check2FAStatus();
//     }
//   }

//   async _onGoogleLogin(e) {
//     e.preventDefault();
//     await authService.googleLogin();
//   }

//   async _onLogout(e) {
//     e.preventDefault();
//     if (!this._loggedInUser) {
//       alert('No user is logged in.');
//       return;
//     }
//     const res = await authService.logout(this._loggedInUser);
//     if (res.error) {
//       alert(res.error);
//     } else {
//       this._loggedInUser = null;
//       localStorage.removeItem('loggedInUser');
//       this._updateLoginStatus(null);
//       this.shadowRoot.getElementById('authenticatorSection').classList.add('hidden');
//       alert('Logout successful');
//     }
//   }

//   async _check2FAStatus() {
//     const res = await authService.check2FAStatus(this._loggedInUser);
//     if (res.error) {
//       alert(res.error);
//       return;
//     }
//     if (res.has2FA) {
//       this.shadowRoot.getElementById('tokenSection').classList.add('hidden');
//       this.shadowRoot.getElementById('verifyTokenSection').classList.add('hidden');
//       this.shadowRoot.getElementById('generateSecretSection').classList.add('hidden');
//       this.shadowRoot.getElementById('authenticatorSection').classList.add('hidden');
//     } else {
//       this.shadowRoot.getElementById('tokenSection').classList.add('hidden');
//       this.shadowRoot.getElementById('generateSecretSection').classList.remove('hidden');
//       this.shadowRoot.getElementById('verifyTokenSection').classList.remove('hidden');
//       this.shadowRoot.getElementById('authenticatorSection').classList.remove('hidden');
//     }
//   }

//   async _onGenerateSecret(e) {
//     e.preventDefault();
//     if (!this._loggedInUser) {
//       alert('You must be logged in to generate a secret.');
//       return;
//     }
//     const res = await authService.generateSecret(this._loggedInUser);
//     if (res.error) {
//       alert(res.error);
//     } else {
//       this.shadowRoot.getElementById('qrCode').src = res.qrCodeUrl;
//       this.shadowRoot.getElementById('secret').textContent = `Secret: ${res.secret}`;
//     }
//   }

//   async _onVerifyToken(e) {
//     e.preventDefault();
//     if (!this._loggedInUser) {
//       alert('You must be logged in to verify a token.');
//       return;
//     }
//     const token = this.shadowRoot.getElementById('verifyToken').value;
//     if (!token) {
//       alert('Please enter a token.');
//       return;
//     }
//     const res = await authService.verifyToken(this._loggedInUser, token);
//     if (res.error) {
//       alert(res.error);
//     } else {
//       alert(res.message);
//       this.shadowRoot.getElementById('verifyTokenSection').classList.add('hidden');
//       this.shadowRoot.getElementById('authenticatorSection').classList.add('hidden');
//     }
//   }

//   async _fetchUsers() {
//     const users = await authService.fetchUsers();
//     const userList = this.shadowRoot.getElementById('userList');
//     userList.innerHTML = '';
//     users.forEach(user => {
//       const li = document.createElement('li');
//       li.textContent = `ID: ${user.id}, Username: ${user.username}, Password: ${user.password}, Secret: ${user.secret}, Google ID: ${user.google_id || 'N/A'}, Email: ${user.email || 'N/A'}`;
//       userList.appendChild(li);
//     });
//   }

//   _updateLoginStatus(username) {
//     const loginStatus = this.shadowRoot.getElementById('loginStatus');
//     loginStatus.textContent = username ? `Logged in as: ${username}` : '';
//   }
// }

// customElements.define('user-login', UserLogin);

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

export class UserLogin extends HTMLElement {
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

customElements.define('user-login', UserLogin);