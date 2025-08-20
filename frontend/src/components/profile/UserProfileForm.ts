import { t } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import * as authService from '@/services/authService.js';
import * as friendsService from '@/services/friendsService.js';
import { state } from '@/state.js';
import { makeAuthenticatedRequest } from '@/main.js';
import { UserData } from '@/utils/playerUtils/types';
import '@/components/_templates/CustomTag.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
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
      padding: 0.75rem; /* increased */
      justify-content: center;
      background: var(--accent);
      border-radius: 50%;
      border: var(--border);
      width: var(--button-rounded-size);
      height: var(--button-rounded-size);
      box-shadow: 0 1px 2px #0002;
    }
    .profile-form__edit-btn span img {
      width: 2rem;
      height: 2rem;
      display: block;
      filter: invert(var(--invert));
    }
    .profile-form__edit-btn:hover {
      background: var(--accent-secondary);
      box-shadow: var(--shadow-soft);
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

    .profile-form__auth {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: 2px solid var(--accent);
      background: var(--body);
      padding: 1rem;
    }
    .profile-form__auth-title {
      font-size: 1.2rem;
      font-weight: bold;
      margin: 0;
    }
    .profile-form__auth-btn--success,
    .profile-form__auth-btn {
      padding: 0.5rem 1.2rem;
      font-size: var(--main-font-size);
      font-weight: bold;
      border: none;
      background: var(--accent-secondary);
      color: var(--body);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      margin-left: 0;
    }
    .profile-form__auth-btn:hover {
      box-shadow: var(--shadow-soft);
    }
    .profile-form__auth-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .profile-form__auth-btn--success:disabled {
      background: var(--success);
      color: #fff;
      cursor: not-allowed;
      opacity: 0.85;
    }

    .profile-form__footer {
      display: flex;
      gap: 2rem;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
    }
    .profile-form__footer-btn {
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
    .profile-form__footer-btn:hover, .profile-form__footer-btn:focus {
      background: var(--accent);
      color: var(--text);
      box-shadow: var(--shadow-soft);
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
      <input id="password" name="password" class="profile-form__input" type="password" minlength="7" required autocomplete="current-password" placeholder="${t('profile.newPassword')}" />
      <span id="viewBtn" class="profile-form__input--icon">${actionIcons.eye}</span>
    </div>
    <input id="confirm-password" name="password" class="profile-form__input confirm-password" type="password" minlength="7" required autocomplete="current-password" placeholder="${t('profile.rewriteNewPassword')}" />

    <p class="profile-form__error" id="error"></p>

    <section class="profile-form__auth">
      <h2 class="profile-form__auth-title">${t('profile.authentication')}</h2>
      <div class="profile-form__auth-checkbox--label">
        <button id="enable2fa" class="profile-form__auth-btn" type="button"></button>
      </div>
      <button id="disable2fa">Disable 2fa</button>

    </section>

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
  private enable2fa: HTMLButtonElement;
  private authSection: HTMLElement;
  private errorText: HTMLParagraphElement;
  private viewBtn: HTMLSpanElement;
  private saveBtn: HTMLButtonElement;
  private deleteBtn: HTMLButtonElement;
  private avatarOverlay: HTMLElement;
  private isEditMode = false;
  private pendingAvatarFile: File | null = null;
  private disable2fa : HTMLButtonElement;
  private userData: UserData = { email: '', username: '', userId: 0, avatar: '' };

  private boundHandleModalDismiss = this.handleModalDismiss.bind(this);
  private boundHandleAvatarChanged = this.handleAvatarChanged.bind(this);
  private boundHandleProfileLoaded = this.handleProfileLoaded.bind(this);
  private boundHandleAvatarUpdated = this.handleAvatarUpdated.bind(this);

  static get observedAttributes() {
    return ['userdata'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'userdata') {
      try {
        this.userData = JSON.parse(newValue);
      } catch {
        this.userData = { email: '', username: '', userId: 0, avatar: '' };
      }
    }
  }

  connectedCallback() {
    this.assignElements();
    this.addEventListeners();
    this.renderForm();
    this.toggleEditMode();
  }

  private assignElements() {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;

    this.editButton = shadowRoot.getElementById('editBtn') as HTMLButtonElement;
    this.usernameInput = shadowRoot.getElementById('username') as HTMLInputElement;
    this.emailInput = shadowRoot.getElementById('email') as HTMLInputElement;
    this.passwordInput = shadowRoot.getElementById('password') as HTMLInputElement;
    this.confirmPasswordInput = shadowRoot.getElementById('confirm-password') as HTMLInputElement;
    this.enable2fa = shadowRoot.getElementById('enable2fa') as HTMLButtonElement;
    this.authSection = shadowRoot.querySelector('.profile-form__auth') as HTMLElement;
    this.errorText = shadowRoot.getElementById('error') as HTMLParagraphElement;
    this.viewBtn = shadowRoot.getElementById('viewBtn') as HTMLSpanElement;
    this.saveBtn = shadowRoot.getElementById('saveBtn') as HTMLButtonElement;
    this.deleteBtn = shadowRoot.getElementById('deleteBtn') as HTMLButtonElement;
    this.avatarOverlay = shadowRoot.querySelector('.avatar-upload-overlay') as HTMLElement;
    this.disable2fa = shadowRoot.getElementById('disable2fa') as HTMLButtonElement;
  }

  private addEventListeners() {
    this.viewBtn?.addEventListener('click', this.handleViewBtnClick.bind(this));
    this.editButton?.addEventListener('click', this.handleEditBtnClick.bind(this));
    this.enable2fa?.addEventListener('click', this.handleEnable2faClick.bind(this));
    this.saveBtn?.addEventListener('click', this.handleSaveBtnClick.bind(this));
    this.deleteBtn?.addEventListener('click', this.handleDeleteBtnClick.bind(this));
    this.disable2fa?.addEventListener('click', this.handleDisable2fa.bind(this));

    window.addEventListener('avatar-changed', this.boundHandleAvatarChanged);
    window.addEventListener('profile-loaded', this.boundHandleProfileLoaded);
    window.addEventListener('avatar-updated', this.boundHandleAvatarUpdated);
    window.addEventListener('modal-dismiss', this.boundHandleModalDismiss);
  }

  // you do not call disconnectedCallback yourself...
  // it is called automatically when the element is removed from the DOM
  // it is used to clean up event listeners and prevent memory leaks
  disconnectedCallback() {
    window.removeEventListener('avatar-changed', this.boundHandleAvatarChanged);
    window.removeEventListener('profile-loaded', this.boundHandleProfileLoaded);
    window.removeEventListener('avatar-updated', this.boundHandleAvatarUpdated);
    window.removeEventListener('modal-dismiss', this.boundHandleModalDismiss);
  }

  // event handlers - track user interactions
  // removed from connectedCallback to keep it clean
  private handleViewBtnClick() {
    const isPasswordVisible = this.passwordInput.type === 'text';
    this.passwordInput.type = isPasswordVisible ? 'password' : 'text';
    this.viewBtn.innerHTML = isPasswordVisible ? actionIcons.eyeClosed : actionIcons.eye;
  }
private async handleDisable2fa() {
  try {
    const accessToken = state.userData?.accessToken;
    if (!accessToken) {
      alert('No access token found.');//
      return;
    }
    const response = await authService.disable2FA(accessToken);
    if (response.error) {
      alert(`Failed to disable 2FA: ${response.error}`);
    } else {
      alert('2FA disabled successfully!');
      window.dispatchEvent(new CustomEvent('profile-loaded'));
    }
  } catch (error: any) {
    alert(`Error disabling 2FA: ${error.message}`);
  }
}
  private handleEditBtnClick() {
    this.isEditMode = !this.isEditMode;
    this.editButton.style.backgroundColor = this.isEditMode ? 'var(--accent-secondary)' : 'var(--accent)';
    this.toggleEditMode();
  }

  private handleEnable2faClick(e: Event) {
    e.preventDefault();
    if (!this.enable2fa.disabled) {
      window.dispatchEvent(new CustomEvent('config-enable2fa', { bubbles: true, composed: true }));
    }
  }

  private async handleSaveBtnClick(e: Event) {
    e.preventDefault();
    await this.saveChanges();
  }

  private handleDeleteBtnClick(e: Event) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('delete-profile', { bubbles: true, composed: true }));
  }

  private handleAvatarChanged(e: CustomEvent) {
    this.pendingAvatarFile = e.detail.file;
    if (e.detail.enableEditMode && !this.isEditMode) {
      this.isEditMode = true;
      this.editButton.style.backgroundColor = 'var(--accent-secondary)';
      this.toggleEditMode();
    }
    console.log('Avatar changed, edit mode enabled');
  }

  private handleProfileLoaded() {
    console.log('Profile loaded event received, re-rendering form');
    this.renderForm();
  }

  private handleAvatarUpdated() {
    console.log('Avatar updated, refreshing profile display');
    this.renderForm();
  }

  // after closing a modal, update form data (maybe the user authenticated...
  // ...flag must be set and button/modal removed)
  private handleModalDismiss() {
    this.renderForm();
  }

  // rendering methods - display the form based on user data
  // reminder: check for main user and visitor is made in page...
  // so both avatar and userProfileForm components render accordingly...
  // ... and it is only needed to call BE once
  private async renderForm() {
    const mainUsername = state.userData?.username;
    if (this.userData && this.userData.username === mainUsername) {
      this.renderFormMain();
    } else {
      this.renderFormVisitor();
    }
  }

  private renderFormMain() {
    this.usernameInput.value = this.userData?.username || '';
    this.emailInput.value = this.userData?.email || '';
    this.emailInput.disabled = true;
    this.passwordInput.value = '';
    if (this.isGoogleAccount()) {
      this.passwordInput.disabled = true;
      this.confirmPasswordInput.disabled = true;
    }

    authService.check2FAStatus(this.userData?.email || '').then((status) => {
      const enabled = !!status.has2FA;
      if (enabled) {
        this.enable2fa.textContent = t('profile.success2FA');
        this.enable2fa.classList.add('profile-form__auth-btn--success');
        this.enable2fa.disabled = true;
        this.disable2fa.style.display = 'block';
        this.disable2fa.disabled = false;
      } else {
        this.enable2fa.disabled = this.isGoogleAccount();
        this.enable2fa.textContent = t('profile.enable2FA');
        this.enable2fa.classList.remove('profile-form__auth-btn--success');
        this.disable2fa.style.display = 'none';
        this.disable2fa.disabled = true;
      }
    }).catch((error) => {
      console.error('Error checking 2FA status:', error);
      this.enable2fa.disabled = false;
      this.enable2fa.textContent = t('profile.enable2FA');
      this.enable2fa.classList.remove('profile-form__auth-btn--success');
      this.disable2fa.style.display = 'none'; 
      this.disable2fa.disabled = true;
    });
  }

  private renderFormVisitor() {
    if (!this.usernameInput || !this.emailInput) return;
    this.usernameInput.value = this.userData?.username || '';
    this.usernameInput.disabled = true;
    this.emailInput.value = this.userData?.email || '';
    this.emailInput.disabled = true;

    // hide, show simplified profile form for visitors, i.e. no password fields, no delete profile
    // if more elements are needed to be hidden, add their id to the hiddenElements array
    const hiddenElements = ["passwordInput", "confirmPasswordInput", "viewBtn", "authSection", "editButton", "avatarOverlay", "deleteBtn", "saveBtn"];
    for (const element of hiddenElements) {
      if (this[element]) {
        this[element].style.display = 'none';
      }
    }
  }

  private isGoogleAccount(): boolean {
    const loginMethod = localStorage.getItem('loginMethod');
    return loginMethod === 'google';
  }

  private toggleEditMode() {
    const editable = this.isEditMode;
    this.usernameInput.disabled = !editable;
    this.emailInput.disabled = true; // always disable email
    this.passwordInput.disabled = !editable || this.isGoogleAccount();
    this.confirmPasswordInput.disabled = !editable || this.isGoogleAccount();
    if (this.saveBtn) this.saveBtn.disabled = !editable;
  }

  // TODO: services should be in another folder
  private async saveChanges() {
    try {
      const accessToken = state.userData?.accessToken;
      let hasChanges = false;

      if (this.pendingAvatarFile) {
        const avatarUrl = await authService.uploadAvatarAndUpdateState(this.pendingAvatarFile, accessToken);
        if (avatarUrl) {
          this.userData.avatar = avatarUrl;
        }
        this.pendingAvatarFile = null;
        hasChanges = true;
      }

      const newUsername = this.usernameInput.value.trim();
      const newPassword = this.passwordInput.value;
      const confirmPassword = this.confirmPasswordInput.value;
      if (newUsername && newUsername !== this.userData.username) {
        await authService.updateUsername(newUsername, accessToken);
        this.userData.username = newUsername;
        state.userData.username = newUsername;
        localStorage.setItem('loggedInUser', newUsername);
        hasChanges = true;
        window.location.href = `/profile/${newUsername}`;
      }

      //Only regular accounts can change password
      if (!this.isGoogleAccount()) {
        if (newPassword && newPassword.length > 6) {
          if (newPassword !== confirmPassword) {
              this.errorText.textContent=t("error.passwordsDoNotMatch");
              return;
          }
          await authService.updatePassword(newPassword, accessToken);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        window.dispatchEvent(new CustomEvent('username-updated'));
        window.dispatchEvent(new CustomEvent('profile-loaded'));
        this.passwordInput.value = '';
        this.confirmPasswordInput.value = '';
        this.isEditMode = false;
        this.viewBtn.style.display = 'none';// TODO disable it or hide it // not working 
        this.editButton.style.backgroundColor = 'var(--accent)';
        this.toggleEditMode();
      }

    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }
};

customElements.define('user-profile-form', UserProfileForm);

export { makeAuthenticatedRequest };