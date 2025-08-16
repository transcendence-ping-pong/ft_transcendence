import { t } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import * as authService from '@/services/authService.js';
import { state } from '@/state.js';
import '@/components/CustomTag.js';
import { state } from '@/state';
import { makeAuthenticatedRequest } from '@/main.js';

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
    .profile-form__auth-btn {
      padding: 0.5rem 1.2rem;
      font-size: var(--main-font-size);
      font-weight: bold;
      border: none;
      border-radius: 0.3rem;
      background: var(--accent-secondary);
      color: var(--body);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      margin-left: 0;
    }
    .profile-form__auth-btn:disabled {
      background: var(--success);
      color: #fff;
      cursor: not-allowed;
      opacity: 0.85;
    }

    .profile-form__footer {
      display: flex;
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

    <section class="profile-form__auth">
      <h2 class="profile-form__auth-title">${t('profile.authentication')}</h2>
      <div class="profile-form__auth-checkbox--label">
        <button id="enable2fa" class="profile-form__auth-btn" type="button"></button>
      </div>
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
  private errorText: HTMLParagraphElement;
  private viewBtn: HTMLSpanElement;
  private saveBtn: HTMLButtonElement;
  private deleteBtn: HTMLButtonElement;
  private isEditMode = false;
  private pendingAvatarFile: File | null = null;

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
    this.enable2fa = shadowRoot.getElementById('enable2fa') as HTMLButtonElement;
    this.errorText = shadowRoot.getElementById('error') as HTMLParagraphElement;
    this.viewBtn = shadowRoot.getElementById('viewBtn') as HTMLSpanElement;
    this.saveBtn = shadowRoot.getElementById('saveBtn') as HTMLButtonElement; // Fix: properly initialize saveBtn
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

    this.enable2fa.addEventListener('click', (e: Event) => {
      e.preventDefault();
      if (!this.enable2fa.disabled) {
        window.dispatchEvent(new CustomEvent('enable2fa', { bubbles: true, composed: true }));
      }
    });

    // Save button event listener
    this.saveBtn.addEventListener('click', async (e: Event) => {
        e.preventDefault();
        await this.saveChanges();
    });

    this.deleteBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('delete-profile', { bubbles: true, composed: true }));
    });

    // Listen for avatar changes from AvatarBadge
    window.addEventListener('avatar-changed', (e: CustomEvent) => {
        this.pendingAvatarFile = e.detail.file;
        
        // Enable edit mode when avatar is changed
        if (e.detail.enableEditMode && !this.isEditMode) {
            this.isEditMode = true;
            this.editButton.style.backgroundColor = 'var(--accent-secondary)';
            this.toggleEditMode();
        }
        
        console.log('Avatar changed, edit mode enabled');
    });
    
    // Listen for profile data updates and avatar updates
    window.addEventListener('profile-loaded', () => {
        console.log('Profile loaded event received, re-rendering form');
        this.renderForm();
    });

    // Add listener for avatar updates to refresh display
    window.addEventListener('avatar-updated', () => {
        console.log('Avatar updated, refreshing profile display');
        this.renderForm();
    });

    window.addEventListener('modal-dismiss', () => {
      setTimeout(() => this.renderForm(), 0);
    });

    this.toggleEditMode();
    this.renderForm();
  }

  private renderForm() {
    console.log('=== RENDER FORM DEBUG ===');
    console.log('state.userData:', state.userData);
    console.log('localStorage items:', {
        accessToken: !!localStorage.getItem('accessToken'),
        loginMethod: localStorage.getItem('loginMethod'),
        loggedInUser: localStorage.getItem('loggedInUser'),
        userEmail: localStorage.getItem('userEmail')
    });
    console.log('========================');
    
    this.usernameInput.value = state.userData?.username || '';
    this.emailInput.value = state.userData?.email || '';
    this.passwordInput.value = ''; // Don't show password - not safe
    
    // Disable password and 2FA fields for Google accounts
    this.disableGoogleAccountFields();
  }

  private disableGoogleAccountFields() {
    const isGoogleAccount = this.isGoogleAccount();
    
    if (isGoogleAccount) {
        // Disable password fields
        this.passwordInput.disabled = true;
        this.confirmPasswordInput.disabled = true;
        
        // Disable 2FA checkbox
        const enable2faCheckbox = this.shadowRoot.getElementById('enable2fa') as HTMLInputElement;
        if (enable2faCheckbox) {
            enable2faCheckbox.disabled = true;
        }
    }
  }

  private isGoogleAccount(): boolean {
    // Check if user logged in via Google
    const loginMethod = localStorage.getItem('loginMethod');
    return loginMethod === 'google';

    authService.check2FAStatus(state.userData?.email || '').then((status) => {
      const enabled = !!status.has2FA;
      if (enabled) {
        this.enable2fa.disabled = true;
        this.enable2fa.textContent = t('profile.success2FA');
        this.enable2fa.classList.add('profile-form__auth-btn--success');
      } else {
        this.enable2fa.disabled = false;
        this.enable2fa.textContent = t('profile.enable2FA');
      }
    }).catch((error) => {
      console.error('Error checking 2FA status:', error);
      this.enable2fa.disabled = false;
      this.enable2fa.textContent = t('profile.enable2FA');
    });
  }

  private toggleEditMode() {
    const editable = this.isEditMode;
    const isGoogleAccount = this.isGoogleAccount();
    
    this.usernameInput.disabled = !editable;
    this.emailInput.disabled = true; // Always disable email
    
    if (!isGoogleAccount) {
        this.passwordInput.disabled = !editable;
        this.confirmPasswordInput.disabled = !editable;
    }
    
    if (this.saveBtn) this.saveBtn.disabled = !editable;
  }

private async updateUsername(newUsername: string): Promise<void> {
    const response = await makeAuthenticatedRequest('/api/change-username', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newUsername })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update username');
    }

    // Update state with new username
    if (state.userData) {
        state.userData.username = newUsername;
    }
    localStorage.setItem('loggedInUser', newUsername);
}

private async updatePassword(newPassword: string): Promise<void> {
    const response = await makeAuthenticatedRequest('/api/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update password');
    }
}

// Add this method to your UserProfileForm class:

private updateAvatarDisplay(avatarUrl: string): void {
    // Update the state with new avatar
    if (state.userData) {
        state.userData.avatar = avatarUrl;
    }
    
    // Dispatch an event to update other components that might display the avatar
    window.dispatchEvent(new CustomEvent('avatar-updated', {
        bubbles: true,
        composed: true,
        detail: { avatarUrl }
    }));
    
    console.log('Avatar display updated with URL:', avatarUrl);
}

// Also modify your saveChanges method to handle avatar upload:
private async saveChanges() {
    try {
        const isGoogleAccount = this.isGoogleAccount();
        let hasChanges = false;

        // Upload avatar if there's a pending file
        if (this.pendingAvatarFile) {
            await this.uploadAvatar(this.pendingAvatarFile);
            this.pendingAvatarFile = null;
            hasChanges = true;
        }

        // For regular accounts, check and update other profile data
        if (!isGoogleAccount) {
            const newUsername = this.usernameInput.value.trim();
            const newPassword = this.passwordInput.value;
            const confirmPassword = this.confirmPasswordInput.value;
            
            // Update username if changed
            if (newUsername && newUsername !== state.userData.username) {
                await this.updateUsername(newUsername);
                hasChanges = true;
            }
            
            // Update password if provided
            if (newPassword && newPassword.length > 6) {
                if (newPassword !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                await this.updatePassword(newPassword);
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            // Dispatch events to update other components
            window.dispatchEvent(new CustomEvent('username-updated'));
            window.dispatchEvent(new CustomEvent('profile-loaded')); // Add this to refresh profile display
            
            alert("Profile updated successfully!");
            this.passwordInput.value = '';
            this.confirmPasswordInput.value = '';
            this.isEditMode = false;
            this.editButton.style.backgroundColor = 'var(--accent)';
            this.toggleEditMode();
        } else {
            alert("No changes to save.");
        }
        
    } catch (error) {
        console.error('Error saving profile:', error);
        alert(`Error updating profile: ${error.message}`);
    }
}

// Replace your uploadAvatar method:
private async uploadAvatar(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await makeAuthenticatedRequest('/api/upload-avatar', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    if (result.avatarUrl) {
        this.updateAvatarDisplay(result.avatarUrl);
    }
}
};

customElements.define('user-profile-form', UserProfileForm);

export { makeAuthenticatedRequest };