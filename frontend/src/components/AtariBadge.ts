import { t } from '@/locales/Translations';

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
      <img class="avatar" />
      <h2 class="badge-username"></h2>
      <div class="badge__container--row">
        <hr class="badge-hr" />
      </div>
      <span class="username-label">${t("auth.username")}</span>
      <span class="visitor-number">#042</span>
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
  static get observedAttributes() {
    return ['username'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const username = this.getAttribute('username') || '';
    const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`;
    const avatar = this.shadowRoot.querySelector('.avatar') as HTMLImageElement;
    const h2 = this.shadowRoot.querySelector('.badge-username');
    avatar.src = avatarUrl;
    avatar.alt = "Avatar";
    if (h2) h2.textContent = username;
  }
}

customElements.define('atari-badge', AtariBadge);
