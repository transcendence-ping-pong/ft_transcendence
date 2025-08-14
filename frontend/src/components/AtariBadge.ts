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
      border: 2px dashed green;
      left: 50%;
      top: 0;
      transform: translateX(-50%);
    }
    .badge-content-outer {
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${VIRTUAL_WIDTH}px;
      height: ${VIRTUAL_HEIGHT}px;
      transform: translate(-50%, -50%);
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
    .badge-hr {
      width: 80%;
      border: none;
      border-top: 2.5px solid var(--text);
      margin: 0.2em 0 0.7em 0;
    }
    .username-label {
      font-size: 0.95rem;
      color: var(--text);
      opacity: 0.7;
      margin-bottom: 1.2em;
      letter-spacing: 0.08em;
    }
    .visitor-row {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      width: 100%;
      margin-bottom: 1.2em;
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
      color: var(--text);
      opacity: 0.7;
      letter-spacing: 0.08em;
    }
    .visitor-line {
      flex: 1;
      border-bottom: 2px solid var(--text);
      margin-bottom: 0.7em;
    }
    .logo-row {
      margin-top: 1.5em;
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .logo-box {
      width: 80px;
      height: 32px;
      background: #fff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #111;
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
      <hr class="badge-hr" />
      <div class="username-label">${t("auth.username")}</div>
      <div class="visitor-row">
        <div class="visitor-info">
          <span class="visitor-number">#042</span>
          <span class="visitor-label">visitor no.</span>
        </div>
        <div class="visitor-line"></div>
      </div>
      <div class="logo-row">
        <div class="logo-box">LOGO</div>
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
