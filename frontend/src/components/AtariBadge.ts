import { t } from '@/locales/Translations';
import { state } from '@/state';

// VIRTUAL_WIDTH and VIRTUAL_HEIGHT define the "design" size of the badge.
// The badge and all its content will always render at these dimensions (in px).
// To scale or move the badge, wrap <atari-badge> in a container and use CSS transform:
// Example:
// <div style="width:500px;height:500px;transform:scale(0.7) translateX(120px);transform-origin:top left;">
//   <atari-badge username="yourname"></atari-badge>
// </div>
const VIRTUAL_WIDTH = 500;
const VIRTUAL_HEIGHT = 500;
const VIRTUAL_MARGIN_Y = 220;
const VIRTUAL_MARGIN_X = 80;

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      position: relative;
    }

    .badge-border-img {
      position: absolute;
      height: 100%;
      z-index: 20;
      pointer-events: none;
      left: 0;
      top: 0;
    }
    .badge-content-outer {
      position: relative;
      top: ${VIRTUAL_MARGIN_Y}px;
      left: ${VIRTUAL_MARGIN_X}px;
      width: ${VIRTUAL_WIDTH}px;
      height: ${VIRTUAL_HEIGHT}px;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      background: var(--accent);
      box-shadow: 0 0 80px 40px rgba(0,0,0,0.45) inset;
    }
    .profile-card.atari-badge {
      width: 340px;
      height: 420px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 2.5rem 1.5rem 1.5rem 1.5rem;
      pointer-events: auto;
      position: relative;
      background: none;
      border-radius: 0;
      box-shadow: none;
    }
    .avatar {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: #222;
      border: 3px solid #fff;
      margin-bottom: 0.7em;
      cursor: pointer;
      transition: opacity 0.2s ease;
    }
    .avatar:hover {
      opacity: 0.8;
    }
    .avatar-upload-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
      color: white;
      font-size: 0.8rem;
    }
    .avatar-container {
      position: relative;
    }
    .avatar-container:hover .avatar-upload-overlay {
      opacity: 1;
    }
    .hidden-file-input {
      display: none;
    }
    .badge-username {
      font-size: 2.1rem;
      font-weight: bold;
      letter-spacing: 0.08em;
      color: var(--text);
      margin-bottom: 0.2em;
      text-transform: uppercase;
    }
    .badge__container--row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      width: 80%;
    }
    .badge-hr {
      flex: 1 1 auto;
      border: none;
      border-top: 2.5px solid var(--text);
    }
    .username-label {
      font-size: 0.95rem;
      color: var(--text);
      opacity: 0.7;
      margin-bottom: 1.2em;
      letter-spacing: 0.08em;
    }
    .visitor-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 1.5em;
    }
    .visitor-number {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--text);
      line-height: 1;
    }
    .visitor-label {
      font-size: 0.8rem;
      margin-right: 0.5em;
      color: var(--text);
      opacity: 0.7;
      letter-spacing: 0.08em;
    }
    .logo-row {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-top: 1.5rem;
    }
    .logo-box {
      width: 64px;
      height: 64px;
      background: var(--avatar-bg);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>

  <img 
    src="/public/badge-border1.png"
    alt="Badge profile image"
    class="badge-border-img"
  />
  <div class="badge-content-outer">
    <div class="profile-card atari-badge">
      <div class="avatar-container">
        <img class="avatar" />
        <div class="avatar-upload-overlay">
          📷 Change
        </div>
      </div>
      <input type="file" class="hidden-file-input" accept="image/*" />
      <h2 class="badge-username"></h2>
      <div class="badge__container--row">
        <hr class="badge-hr" />
      </div>
      <span class="username-label">${t("auth.username")}</span>
      <span class="visitor-number">${t("auth.userID")}</span>
      <div class="badge__container--row">
        <span class="visitor-label">${t("profile.visitorNo")}</span>
        <hr class="badge-hr" />
      </div>

      <div class="logo-row">
        <img class="logo-box" src="/public/logo.png" alt="Logo" />
      </div>
    </div>
  </div>
`;

export class AtariBadge extends HTMLElement {
  private fileInput: HTMLInputElement;
  private avatar: HTMLImageElement;

  static get observedAttributes() {
    return ['username'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.avatar = this.shadowRoot.querySelector('.avatar') as HTMLImageElement;
    this.fileInput = this.shadowRoot.querySelector('.hidden-file-input') as HTMLInputElement;
    
    // Add click handler for avatar
    this.avatar.addEventListener('click', () => {
      this.fileInput.click();
    });

    // Add file change handler
    this.fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e);
    });

    // Listen for avatar updates from upload
    window.addEventListener('avatar-updated', (e: CustomEvent) => {
        console.log('Avatar updated event received:', e.detail);
        if (this.avatar && e.detail.avatarUrl) {
            // Force immediate update with cache busting
            this.avatar.src = e.detail.avatarUrl;
            // Also trigger a re-render to update state
            this.render();
        }
    });

    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }
  private printFirstName(username: string): string {
    return username.split(' ')[0];
  }
  private handleFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.avatar.src = result;
    };
    reader.readAsDataURL(file);

    // Trigger the actual upload to server
    this.uploadAvatarToServer(file);
}

private async uploadAvatarToServer(file: File) {
    try {
        console.log('Starting upload for file:', file.name, 'Size:', file.size);
        
        const formData = new FormData();
        formData.append('avatar', file);

        const token = localStorage.getItem('accessToken');
        if (!token) {
            throw new Error('No access token available. Please log in again.');
        }

        console.log('Sending request to /api/upload-avatar');
        
        const response = await fetch('/api/upload-avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload failed:', response.status, errorText);
            throw new Error(`Failed to upload avatar: ${response.status}`);
        }

        const result = await response.json();
        console.log('Upload result:', result);
        
        // Check what we got back
        if (!result.avatarUrl) {
            console.error('No avatarUrl in response:', result);
            throw new Error('Invalid response from server');
        }
        
        // Save clean URL to state (without cache-busting)
        state.userData.avatar = result.avatarUrl;
        console.log('Updated state.userData.avatar to:', state.userData.avatar);

        // Update display with cache-busting
        const avatarUrl = `${result.avatarUrl}?t=${Date.now()}`;
        this.avatar.src = avatarUrl;
        
        console.log('Avatar uploaded successfully, reloading page...');

        // Reload the page to show updated values everywhere
        setTimeout(() => {
            window.location.reload();
        }, 1000); // Increased delay to see console logs

    } catch (error) {
        console.error('Error uploading avatar:', error);
        alert(`Failed to upload avatar: ${error.message}`);
        
        // Revert to original avatar on error
        this.render();
    }
}
  render() {
    const username = this.getAttribute('username') || '';
    console.log('AtariBadge render() called for username:', username);
    console.log('Current state.userData.avatar:', state.userData.avatar);
    
    // Check if user has custom avatar in state, otherwise use generated one
    const customAvatar = state.userData.avatar;
    let avatarUrl;
    
    if (customAvatar) {
        // Remove any existing cache-busting parameters before adding new ones
        const baseUrl = customAvatar.split('?')[0];
        avatarUrl = `${baseUrl}?t=${Date.now()}`;
        console.log('Using custom avatar:', avatarUrl);
    } else {
        avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`;
        console.log('Using generated avatar:', avatarUrl);
    }
    
    if (this.avatar) {
      this.avatar.src = avatarUrl;
      this.avatar.alt = "Avatar";
      console.log('Set avatar.src to:', avatarUrl);
    }
    
    const h2 = this.shadowRoot.querySelector('.badge-username');
    if (h2) h2.textContent = this.printFirstName(username);
    
    // Update other elements with values from state
    const visitorNumber = this.shadowRoot.querySelector('.visitor-number');
    if (visitorNumber) visitorNumber.textContent = state.userData.userId?.toString() || '';
    
    const usernameLabel = this.shadowRoot.querySelector('.username-label');
    if (usernameLabel) usernameLabel.textContent = state.userData.username || '';
}
}

customElements.define('atari-badge', AtariBadge);
