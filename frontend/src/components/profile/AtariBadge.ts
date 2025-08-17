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
    
    this.avatar.addEventListener('click', () => {
        this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
        this.handleFileSelect(e);
    });

    // SIMPLIFIED: Just listen for username updates
    window.addEventListener('username-updated', () => {
        console.log('Username updated, re-rendering badge');
        this.render();
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

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

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

    // Dispatch event to UserProfileForm to handle the actual upload
    window.dispatchEvent(new CustomEvent('avatar-changed', {
        bubbles: true,
        composed: true,
        detail: { 
            file,
            enableEditMode: true
         }
    }));
}
  render() {
    const username = state.userData?.username || this.getAttribute('username') || '';
    
    const h2 = this.shadowRoot.querySelector('.badge-username');
    if (h2) {
        const displayName = this.printFirstName(username).toUpperCase();
        h2.textContent = displayName;
    }
    
    const visitorNumber = this.shadowRoot.querySelector('.visitor-number');
    if (visitorNumber) {
        const visitorNum = state.userData?.userId?.toString() || '';
        visitorNumber.textContent = visitorNum;
    }
    
    const usernameLabel = this.shadowRoot.querySelector('.username-label');
    if (usernameLabel) {
        usernameLabel.textContent = username;
    }
    
    // Handle avatar
    const customAvatar = state.userData?.avatar;
    let avatarUrl;
    
    if (customAvatar) {
        const baseUrl = customAvatar.split('?')[0];
        avatarUrl = `${baseUrl}?t=${Date.now()}`;
    } else {
        avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}&t=${Date.now()}`;
    }
    
    if (this.avatar) {
        this.avatar.src = avatarUrl;
        this.avatar.alt = "Avatar";
    }
}
}

customElements.define('atari-badge', AtariBadge);
