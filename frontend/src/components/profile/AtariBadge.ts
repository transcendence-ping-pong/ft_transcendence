import { t } from '@/locales/Translations';
import { UserData } from '@/utils/playerUtils/types';

const VIRTUAL_WIDTH = 725;
const VIRTUAL_HEIGHT = 1080;
const VIRTUAL_MARGIN_Y = 40;
const VIRTUAL_MARGIN_X = 40;

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      max-width: 700px;
      margin: 0;
      background: none;
    }
    .badge-virtual-container {
      position: relative;
      width: 100%;
      aspect-ratio: ${(VIRTUAL_WIDTH + VIRTUAL_MARGIN_X * 2) / (VIRTUAL_HEIGHT + VIRTUAL_MARGIN_Y * 2)};
      max-width: ${VIRTUAL_WIDTH + VIRTUAL_MARGIN_X * 2}px;
      margin: 0 auto;
      background: none;
    }
    .badge-border-img {
      position: absolute;
      height: 100%;
      z-index: 20;
      pointer-events: none;
    }
    .badge-content-outer {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      background: none;
    }
    .profile-card.atari-badge {
      position: relative;
      width: 340px;
      height: 420px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem 1.5rem 1.5rem;
      gap: var(--avatar-badge-gap);
      pointer-events: auto;
      border-radius: 0;
      background: var(--accent);
      box-shadow: 0 0 80px 40px rgba(0,0,0,0.45) inset;
    }
    .avatar-container {
      position: relative;
    }
    .avatar {
      width: var(--avatar-badge-size);
      height: var(--avatar-badge-size);
      border-radius: 50%;
      background: #222;
      border: 3px solid #fff;
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
    .avatar-container:hover .avatar-upload-overlay {
      opacity: 1;
    }
    .hidden-file-input {
      display: none;
    }

    .badge__container--username {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      gap: 0.3rem;
    }
    .badge-username {
      font-size: var(--avatar-badge-username-size);
      font-weight: bold;
      padding: 0;
      margin: 0;
      letter-spacing: 0.08em;
      color: var(--text);
      text-transform: uppercase;
    }
    .badge__container--username .badge-username {
      margin-bottom: 0;
    }
    .badge__container--username .badge-hr {
      width: 80%;
      margin: 0.2rem 0;
    }
    .badge__container--username .username-label {
      margin-bottom: 0;
    }
    .badge-hr {
      flex: 1 1 auto;
      border: none;
      border-top: 2.5px solid var(--text);
    }

    .badge__container--visitor {
      display: flex;
      flex-direction: row;
      align-items: flex-end;
      gap: 0.5rem;
      justify-content: center;
    }
    .visitor-number-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.1rem;
    }
    .visitor-number-col .visitor-number {
      margin-bottom: 0;
    }
    .visitor-number-col .badge-hr {
      margin: 0;
    }

    .visitor-label,
    .username-label {
      font-size: var(--secondary-text-size);
      color: var(--text);
      opacity: 0.7;
      letter-spacing: 0.08em;
    }
    .visitor-number {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--text);
      line-height: 1;
    }

    .logo-row {
      width: 100%;
      display: flex;
      justify-content: center;
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

  <div class="badge-virtual-container">
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
        <input type="file" class="hidden-file-input" accept="image/*" style="display: none;" />

        <div class="badge__container--username">
          <h2 class="badge-username"></h2>
          <hr class="badge-hr" />
          <span class="username-label"></span>
        </div>

        <div class="badge__container--visitor">
          <span class="visitor-label">${t("profile.visitorNo")}</span>
          <div class="visitor-number-col">
            <span class="visitor-number"></span>
            <hr class="badge-hr" />
          </div>
        </div>

        <div class="logo-row">
          <img class="logo-box" src="/public/logo.png" alt="Logo" />
        </div>
      </div>
    </div>
  </div>
`;

export class AtariBadge extends HTMLElement {
  private fileInput!: HTMLInputElement;
  private avatar!: HTMLImageElement;
  private userData: UserData = { email: '', username: '', userId: 0, avatar: '' };

  private boundAvatarClick = () => this.fileInput.click();
  private boundFileInputChange = (e: Event) => this.handleFileSelect(e);

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
    this.avatar = this.shadowRoot!.querySelector('.avatar') as HTMLImageElement | null;
    this.fileInput = this.shadowRoot!.querySelector('.hidden-file-input') as HTMLInputElement | null;

    if (this.avatar) this.avatar.addEventListener('click', this.boundAvatarClick);
    if (this.fileInput) this.fileInput.addEventListener('change', this.boundFileInputChange);

    this.render();
  }

  disconnectedCallback() {
    if (this.avatar) this.avatar.removeEventListener('click', this.boundAvatarClick);
    if (this.fileInput) this.fileInput.removeEventListener('change', this.boundFileInputChange);
  }

  private printFirstName(username: string = ''): string {
    return username.split(' ')[0];
  }

  private handleFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (this.avatar) this.avatar.src = result;
    };
    reader.readAsDataURL(file);

    window.dispatchEvent(new CustomEvent('avatar-changed', {
      bubbles: true,
      composed: true,
      detail: {
        file,
        enableEditMode: true
      }
    }));
  }

  private setVisitorMode(isVisitor: boolean) {
    const avatarOverlay = this.shadowRoot!.querySelector('.avatar-upload-overlay') as HTMLElement;
    if (avatarOverlay) avatarOverlay.style.display = isVisitor ? 'none' : 'flex';

    if (this.avatar) {
      this.avatar.style.pointerEvents = isVisitor ? 'none' : 'auto';
      this.avatar.style.cursor = isVisitor ? 'default' : 'pointer';
      if (isVisitor) {
        this.avatar.removeEventListener('click', this.boundAvatarClick);
      } else {
        this.avatar.addEventListener('click', this.boundAvatarClick);
      }
    }
    if (this.fileInput) {
      this.fileInput.disabled = isVisitor;
    }
  }

  render() {
    const user = this.userData || { username: '', userId: 0, avatar: '' };
    const username = user.username || '';
    const userId = user.userId || '';
    const avatarUrl = user.avatar
      ? `${user.avatar.split('?')[0]}?t=${Date.now()}`
      : `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}&t=${Date.now()}`;

    const h2 = this.shadowRoot!.querySelector('.badge-username');
    if (h2) h2.textContent = this.printFirstName(username).toUpperCase();

    const visitorNumber = this.shadowRoot!.querySelector('.visitor-number');
    if (visitorNumber) visitorNumber.textContent = userId.toString();

    const usernameLabel = this.shadowRoot!.querySelector('.username-label');
    if (usernameLabel) usernameLabel.textContent = username;

    if (this.avatar) {
      this.avatar.src = avatarUrl;
      this.avatar.alt = "Avatar";
    }

    const mainUsername = state?.userData?.username;
    const isVisitor = !(this.userData && this.userData.username === mainUsername);
    this.setVisitorMode(isVisitor);
  }
}

customElements.define('atari-badge', AtariBadge);
