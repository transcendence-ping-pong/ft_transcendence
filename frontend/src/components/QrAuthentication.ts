import { t, err } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import * as authService from '@/services/authService.js';
import { state } from '@/state.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }

    .qr-auth {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .qr-auth__title {
      color: var(--text);
      font-size: var(--title-font-size);
    }
    .qr-auth__auth {
      display: flex;
      width: 100%;
      justify-content: space-between;
    }
    .qr-auth__description {
      width: 100%;
      color: var(--border);
      font-size: var(--main-font-size);
    }
    .qr-auth__code-input {
      width: 100%;
      max-width: 180px;
      font-size: 1.4rem;
      letter-spacing: 0.4em;
      text-align: center;
      padding: 0.5em 0.5em;
      border: 1px solid var(--border);
      outline: none;
      background: var(--body);
      color: var(--text);
    }
    hr {
      border: none;
      border-top: 1px solid var(--border);
    }

    .qr-auth__content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .qr-auth__qr {
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;
    }
    .qr-auth__qr img {
      width: var(--qr-size);
      border: 10px solid var(--accent-secondary);
    }

    .qr-auth__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
    }
    .qr-auth__footer-btn {
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
    .qr-auth__footer-btn:hover, .qr-auth__footer-btn:focus {
      background: var(--accent);
      color: var(--text);
    }
    .qr-auth__footer-btn:disabled {
      background: var(--accent-secondary);
      color: var(--body);
      cursor: not-allowed;
      opacity: 0.35;
    }

    .input-error {
      border-color:var(--warning);
    }
    .error {
      font-size: 0.75rem;
      color: var(--warning);
      text-align: start;
      margin-top: -0.5rem;
      min-height: 1.25rem;
      display: block;
    }
    .verify-output {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text);
    }
    .verify-output__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      width: 4.5rem;
      height: 4.5rem;
      box-shadow: 0 1px 2px #0002;
    }
    .verify-output__icon img {
      width: 4rem;
      height: 4rem;
      display: block;
      filter: invert(var(--invert));
    }
    .verify-output__description {
      font-size: var(--main-font-size);
      color: var(--text);
    }

    .spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 12rem;
    }
    .qr-auth__spinner {
      display: inline-block;
      width: 3rem;
      height: 3rem;
      position: relative;
    }
    .qr-auth__spinner div {
      box-sizing: border-box;
      display: block;
      position: absolute;
      width: 3rem;
      height: 3rem;
      border: 8px solid var(--loading);
      border-top: 8px solid var(--accent-tertiary);
      border-radius: 50%;
      animation: qr-spin 1s linear infinite;
      top: 0;
      left: 0;
    }
    @keyframes qr-spin {
      0% { transform: rotate(0deg);}
      100% { transform: rotate(360deg);}
    }
  </style>

  <section class="qr-auth">
    <div class="qr-auth__header">
      <h1 class="qr-auth__title">${t('profile.2FA')}</h1>
      <hr/>
      <div class="qr-auth__auth">
        <p class="qr-auth__description">${t('profile.description2FA')}</p>
        <input id="codeInput" class="qr-auth__code-input" name="2fa" type="text" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" placeholder="------" required />
      </div>
      <p id="error" class="error"></p>
    </div>

    <div class="qr-auth__content">
      <div class="qr-auth__qr">
        <img id="qrImage" alt="QR Code for 2FA" />
      </div>
    </div>

    <div class="qr-auth__footer">
      <button id="cancelBtn" class="qr-auth__footer-btn" type="button">${t('profile.cancel')}</button>
      <button id="verifyBtn" class="qr-auth__footer-btn" type="button">${t('profile.verify')}</button>
    </div>
  </section>
`;

class QrAuthentication extends HTMLElement {
  private cancelBtn: HTMLButtonElement;
  private verifyBtn: HTMLButtonElement;
  private codeInput: HTMLInputElement;
  private qrImage: HTMLImageElement;
  private authData: {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.cancelBtn = this.shadowRoot.querySelector('#cancelBtn') as HTMLButtonElement;
    this.verifyBtn = this.shadowRoot.querySelector('#verifyBtn') as HTMLButtonElement;
    this.codeInput = this.shadowRoot.querySelector('#codeInput') as HTMLInputElement;
    this.qrImage = this.shadowRoot.querySelector('#qrImage') as HTMLImageElement;
    this.authData = {};

    this.cancelBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('modal-dismiss', { bubbles: true }));
    });

    this.getQrCode().then(data => {
      this.qrImage.src = data['qrCodeUrl'];
    });

    this.verifyBtn.addEventListener('click', () => {
      const code = this.codeInput.value.trim();
      if (!/^\d{6}$/.test(code)) {
        alert('Please enter a valid 6-digit code.');
        return;
      }
      this.showSpinner()
      setTimeout(() => { this.verifyToken(this.authData['email'], code); }, 600);
    });
  }

  private showSpinner() {
    this.qrImage.style.display = 'none';
    const content = this.shadowRoot.querySelector('.qr-auth__content') as HTMLDivElement;
    content.innerHTML = ''; // clear existing content
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.innerHTML = `
      <div class="qr-auth__spinner">
        <div></div>
      </div>
    `;
    content.appendChild(spinner);
  }

  private async getQrCode() {
    const email = state.userData?.email || '';
    const accessToken = state.userData?.accessToken || '';
    try {
      this.authData = await authService.generateSecret(email, accessToken);
      this.authData['email'] = email;
      this.authData['accessToken'] = accessToken;
    } catch (error) {
      console.error('Error fetching 2FA data:', error);
      this.authData = {};
    }
    return this.authData;
  }

  private async verifyToken(email: string, code: string) {
    const res = await authService.verifyToken(email, code);
    if (res.error) {
      this.codeInput.classList.add('input-error');
      this._setError(err(res.error));
      console.log('Error verifying token:', res.error);
      this._renderVerifyOutput('close', 'var(--warning)');
      return;
    }

    this._renderVerifyOutput('dino', 'var(--success)');
    this._clearError();
    this._setError('');
    // this.dispatchEvent(new CustomEvent('login-success', { bubbles: true, composed: true }));
  }

  _renderVerifyOutput(icon: string, color: string) {
    const content = this.shadowRoot.querySelector('.qr-auth__content') as HTMLDivElement;
    content.innerHTML = ''; // clear spinner
    const output = document.createElement('div');
    output.className = 'verify-output';
    output.innerHTML = `
      <span class="verify-output__icon" style="background-color: ${color};">
        ${actionIcons[icon]}
      </span>
    `;
    content.appendChild(output);
  }

  _setError(msg: string) {
    this.shadowRoot.getElementById('error').textContent = msg;
  }

  _clearError() {
    this._setError('');
    this.codeInput.classList.remove('input-error');
  }
};

customElements.define('qr-authentication', QrAuthentication);
