import { t, err } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import * as authService from '@/services/authService.js';
import { state } from '@/state.js';
import '@/components/_templates/AuthFormLayout.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      max-width: var(--auth-form-max-width, 400px);
      margin: 0 auto;
    }
    .qr-auth__auth {
      display: flex;
      width: 100%;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
      align-items: flex-start;
    }
    .qr-auth__description {
      width: 100%;
      color: var(--border);
      font-size: var(--main-font-size);
      padding: 0;
      margin: 0;
    }
    .qr-auth__code-input {
      width: 100%;
      max-width: 180px;
      max-height: var(--button-height);
      font-size: 1.4rem;
      letter-spacing: 0.4em;
      text-align: center;
      padding: 0.5em 0.5em;
      border: 1px solid var(--border);
      outline: none;
      background: var(--body);
      color: var(--text);
    }
    .qr-auth__qr {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(var(--qr-size, 180px) + 2rem);
      width: 100%;
      box-sizing: border-box;
      transition: min-height 0.2s;
    }
    .qr-auth__qr-inner {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(var(--qr-size, 180px) + 2rem);
    }
    .qr-auth__qr img#qrImage {
      width: var(--qr-size, 180px);
      border: 10px solid var(--accent-secondary);
      display: block;
    }
    .spinner,
    .verify-output {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      min-height: calc(var(--qr-size, 180px) + 2rem);
      height: auto;
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
      filter: invert(1);
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
    .input-success {
      border-color:var(--success);
    }
  </style>

  <auth-form-layout>
    <span slot="header">${t('profile.2FA')}</span>

    <div slot="content">
      <div class="qr-auth__auth">
        <p class="qr-auth__description">${t('profile.description2FA')}</p>
        <input id="codeInput" class="qr-auth__code-input" name="2fa" type="text" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" placeholder="------" required />
      </div>
      <div class="qr-auth__qr" id="qrContainer">
        <div class="qr-auth__qr-inner" id="qrInner">
          <img id="qrImage" alt="QR Code for 2FA" />
        </div>
      </div>
    </div>

    <div slot="error" id="error"></div>

    <div slot="footer" style="display:flex;justify-content:space-between;align-items:center;">
      <button id="cancelBtn" class="qr-auth__footer-btn" type="button">${t('profile.cancel')}</button>
      <button id="verifyBtn" class="qr-auth__footer-btn" type="button">${t('profile.verify')}</button>
    </div>
  </auth-form-layout>
`;

class QrAuthentication extends HTMLElement {
  private cancelBtn: HTMLButtonElement;
  private verifyBtn: HTMLButtonElement;
  private codeInput: HTMLInputElement;
  private qrImage: HTMLImageElement;
  private authData: {};

  private boundCancelClick = () => {
    window.dispatchEvent(new CustomEvent('modal-dismiss', { bubbles: true, composed: true }));
  };

  private boundVerifyClick = () => {
    this._clearError();
    const code = this.codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      this._setError(t("profile.invalidCode"));
      return;
    }
    this._showSpinner();
    const secret = this.authData['secret'] || '';
    const email = this.authData['email'] || '';
    if (!email || !secret) return;
    setTimeout(() => { this.verifyToken(email, code, secret); }, 600);
  };

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

    this.cancelBtn.addEventListener('click', this.boundCancelClick);
    this.verifyBtn.addEventListener('click', this.boundVerifyClick);

    this.getQrCode().then(data => {
      this.qrImage.src = data['qrCodeUrl'];
    });
  }

  disconnectedCallback() {
    if (this.cancelBtn) this.cancelBtn.removeEventListener('click', this.boundCancelClick);
    if (this.verifyBtn) this.verifyBtn.removeEventListener('click', this.boundVerifyClick);
  }

  _showSpinner() {
    const qrInner = this.shadowRoot.querySelector('#qrInner') as HTMLDivElement;
    qrInner.innerHTML = `
      <div class="spinner">
        <div class="qr-auth__spinner">
          <div></div>
        </div>
      </div>
    `;
  }

  _renderVerifyOutput(icon: string, color: string) {
    const qrInner = this.shadowRoot.querySelector('#qrInner') as HTMLDivElement;
    qrInner.innerHTML = `
      <div class="verify-output">
        <span class="verify-output__icon" style="background-color: ${color};">
          ${actionIcons[icon]}
        </span>
      </div>
    `;
  }

  private async getQrCode() {
    const email = state.userData?.email || '';
    const accessToken = state.userData?.accessToken || '';
    if (this.authData['qrCodeUrl']) return this.authData;

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

  private async verifyToken(email: string, code: string, secret: string) {
    const res = await authService.verifyToken(email, code, secret);

    if (res.error) {
      this.codeInput.classList.add('input-error');
      this._setError(err(res.error));
      this._renderVerifyOutput('close', 'var(--warning)');
      return;
    }

    this._renderVerifyOutput('check', 'var(--success)');
    this.codeInput.classList.remove('input-error');
    this.codeInput.classList.add('input-success');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('modal-dismiss', { bubbles: true }));
    }, 400);
  }

  _setError(msg: string) {
    const errorSlot = this.shadowRoot.querySelector('auth-form-layout')?.shadowRoot?.getElementById('error');
    if (errorSlot) errorSlot.textContent = msg;
    this.codeInput.classList.add('input-error');
  }

  _clearError() {
    this._setError('');
    this.codeInput.classList.remove('input-error');
  }
};

customElements.define('qr-authentication', QrAuthentication);
