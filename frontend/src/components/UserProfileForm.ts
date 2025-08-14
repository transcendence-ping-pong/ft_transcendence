import { t } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import '@/components/CustomTag.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .profile-form__edit {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      height: 100%;
    }
    .profile-form__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .profile-form__header--title {
      font-size: var(--title-font-size);
      color: var(--text);
    }
    .profile-form__edit-btn {
      display: inline-flex;
      align-items: center;
      padding: 0.1em 0.3em;
      justify-content: center;
      background: var(--accent);
      border-radius: 50%;
      border: var(--border);
      width: var(--button-circle-size);
      height: var(--button-circle-size);
      box-shadow: 0 1px 2px #0002;
    }
    .profile-form__edit-btn span img {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }
    .profile-form__edit-btn:hover {
      background: var(--accent-secondary);
      cursor: pointer;
    }
    hr {
      border: none;
      border-top: 1px solid var(--border);
      padding-bottom: 1rem;
    }

    .profile-form__input {
      flex: 1;
      padding: 1rem;
      border: 1.5px solid var(--accent);
      font-size: 1rem;
      background: var(--body);
      color: var(--border);
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .profile-form__input:focus {
      border-color: var(--border);
    }
    .input-error:focus,
    .input-error {
      border-color:var(--warning);
    }
    .profile-form__input-wrapper {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }
    .profile-form__input--icon {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      z-index: 2;
      display: flex;
      align-items: center;
      background: transparent;
      border: none;
      padding: 0;
    }
    .profile-form__input--icon img {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }

    .profile-form__auth-title {
      font-size: 1.2rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
      margin-top: 2rem;
    }
    .profile-form__auth-checkbox--label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      color: var(--text);
    }
    .profile-form__auth-checkbox {
      width: 1.5rem;
      height: 1.5rem;
      background-color: var(--body);
      border: 2px solid var(--border);
      border-radius: 0;
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      cursor: pointer;
      position: relative;
      transition: box-shadow 0.2s;
    }
    .profile-form__auth-checkbox:checked {
      background-color: var(--accent-tertiary);
      border-color: var(--accent-tertiary);
    }
    .profile-form__auth-checkbox:checked::before,
    .profile-form__auth-checkbox:checked::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 0.8rem;
      height: 2px;
      background: #fff;
      border-radius: 1px;
      transform: translate(-50%, -50%) rotate(45deg);
      display: block;
    }
    .profile-form__auth-checkbox:checked::after {
      transform: translate(-50%, -50%) rotate(-45deg);
    }
    .profile-form__auth-checkbox:focus {
      box-shadow: 0 0 0 2px var(--accent-secondary);
    }

    .profile-form__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
    }
    .profile-form__footer-btn {
      padding: 1rem 0;
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
    .profile-form__footer-btn:hover, .profile-form__footer-btn:focus {
      background: var(--accent);
      color: var(--text);
    }
    .profile-form__footer-btn:disabled {
      background: var(--accent-secondary);
      color: var(--body);
      cursor: not-allowed;
      opacity: 0.35;
    }
    .delete-btn {
      background: var(--warning);
      color: var(--body);
    }
    .delete-btn:hover, .delete-btn:focus {
      background: var(--warning-secondary);
      color: #fff;
    }
    .confirm-password:disabled {
      opacity: 0.5;
    }
    .profile-form__error {
      font-size: 0.75rem;
      color: var(--warning);
      text-align: start;
      margin-top: -0.5rem;
      min-height: 1.25rem;
      display: block;
    }
  </style>

  <section class="profile-form__header">
    <h1 class="profile-form__header--title">${t('profile.personalInfo')}</h1>
    <button id="editBtn" class="profile-form__edit-btn" title="Edit">
      <span>${actionIcons.edit}</span>
    </button>
  </section>
  <hr/>

  <form id="profileForm" class="profile-form__edit" autocomplete="off">
    <input id="username" class="profile-form__input" name="username" type="text" required autocomplete="username" placeholder="${t('auth.username')}" />
    <input id="email" name="email" class="profile-form__input" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
    <div class="profile-form__input-wrapper">
      <input id="password" name="password" class="profile-form__input" type="password" minlength="7" required autocomplete="current-password" placeholder="${t('profile.currentPassword')}" />
      <span id="viewBtn" class="profile-form__input--icon">${actionIcons.eye}</span>
    </div>
    <input id="confirm-password" name="password" class="profile-form__input confirm-password" type="password" minlength="7" required autocomplete="current-password" placeholder="${t('profile.changePassword')}" />

    <p class="profile-form__error" id="error"></p>

    <h2 class="profile-form__auth-title">${t('profile.authentication')}</h2>
    <div class="profile-form__auth-checkbox--label">
      <input id="enable2fa" name="enable2fa" class="profile-form__auth-checkbox" type="checkbox" />
      <label>${t('profile.enable2FA')}</label>
    </div>

    <div class="profile-form__footer">
      <button id="deleteBtn" class="profile-form__footer-btn delete-btn" type="button">${t('profile.deleteAccount')}</button>
      <button id="saveBtn" class="profile-form__footer-btn" type="button">${t('profile.saveChanges')}</button>
    </div>
  </form>
`;

export class UserProfileForm extends HTMLElement {
  private editButton: HTMLButtonElement;
  private usernameInput: HTMLInputElement;
  private emailInput: HTMLInputElement;
  private passwordInput: HTMLInputElement;
  private confirmPasswordInput: HTMLInputElement;
  private errorText: HTMLParagraphElement;
  private viewBtn: HTMLSpanElement;
  private saveBtn: HTMLButtonElement;
  private deleteBtn: HTMLButtonElement;
  private isEditMode = false;

  private mockData = {
    username: 'mockuser',
    email: 'mock@email.com',
    password: '123456565',
    enable2fa: true,
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;

    this.editButton = shadowRoot.getElementById('editBtn') as HTMLButtonElement;
    this.usernameInput = shadowRoot.getElementById('username') as HTMLInputElement;
    this.emailInput = shadowRoot.getElementById('email') as HTMLInputElement;
    this.passwordInput = shadowRoot.getElementById('password') as HTMLInputElement;
    this.confirmPasswordInput = shadowRoot.getElementById('confirm-password') as HTMLInputElement;
    this.errorText = shadowRoot.getElementById('error') as HTMLParagraphElement;
    this.viewBtn = shadowRoot.getElementById('viewBtn') as HTMLSpanElement;
    this.saveBtn = shadowRoot.getElementById('saveBtn') as HTMLButtonElement;
    this.deleteBtn = shadowRoot.getElementById('deleteBtn') as HTMLButtonElement;

    this.viewBtn.addEventListener('click', () => {
      const isPasswordVisible = this.passwordInput.type === 'text';
      this.passwordInput.type = isPasswordVisible ? 'password' : 'text';
      this.viewBtn.innerHTML = isPasswordVisible ? actionIcons.eyeClosed : actionIcons.eye;
    });

    this.editButton.addEventListener('click', () => {
      this.isEditMode = !this.isEditMode;
      if (this.isEditMode) this.editButton.style.backgroundColor = 'var(--accent-secondary)';
      else this.editButton.style.backgroundColor = 'var(--accent)';
      this.toggleEditMode();
    });

    this.deleteBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('delete-profile', { bubbles: true, composed: true }));
    });

    this.saveBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();

      alert("Call BE and save information");
    });

    this.toggleEditMode();
    this.renderForm();
  }

  private renderForm() {
    this.usernameInput.value = this.mockData.username;
    this.emailInput.value = this.mockData.email;
    this.passwordInput.value = this.mockData.password;
  }

  private toggleEditMode() {
    const editable = this.isEditMode;
    this.usernameInput.disabled = !editable;
    this.emailInput.disabled = !editable;
    this.passwordInput.disabled = !editable;
    this.confirmPasswordInput.disabled = !editable;
    if (this.saveBtn) this.saveBtn.disabled = !editable;
  }
};

customElements.define('user-profile-form', UserProfileForm);
