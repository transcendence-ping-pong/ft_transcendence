import * as authService from '@/services/authService.js';
import { state } from '@/state';
import { err } from '@/locales/Translations.js';
import { navigate } from "@/main.js";
import { renderLoading } from '@/pages/loading';
import { actionIcons } from '@/utils/Constants.js';
import { t } from '@/locales/Translations.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: var(--topbar-height);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--video-transition-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 9999;
      box-shadow: 0 2px 12px #0002;
      box-sizing: border-box;
    }
    .top-bar__inner {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 auto;
      height: 100%;
    }
    .top-bar__left, .top-bar__right {
      display: flex;
      align-items: center;
      gap: var(--topbar-gap);
      height: 100%;
    }
    .top-bar__right {
      flex: 0 0 var(--sidebar-width, 25vh);
      min-width: var(--sidebar-width, 25vh);
      max-width: var(--sidebar-width, 25vh);
      justify-content: flex-end;
      padding-right: 2rem;
    }
    .top-bar__left {
      padding-left: 2rem;
    }
    .top-bar__center {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      width: auto;
      height: auto;
    }

    .top-bar__avatar {
      width: var(--avatar-size);
      height: var(--avatar-size);
      border-radius: 50%;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      box-shadow: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: 2px solid var(--border);
      box-shadow: var(--shadow-soft);
    }
    .top-bar__avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      background: #fff2;
    }

    .top-bar__logout {
      display: flex;
      padding: var(--component-padding);
      min-height: var(--toogle-height);
      min-width: var(--button-min-width);
      justify-content: center;
      align-items: center;
      gap: 0.5em;
      cursor: pointer;
      background: var(--body);
      border: none;
      color: var(--text);
      font-size: var(--main-font-size);
      font-weight: bold;
      border: 2px solid var(--border);
      box-shadow: var(--shadow-soft);
    }
    .top-bar__logout:hover {
      background: var(--accent);
    }
    .top-bar__logout img {
      filter: invert(var(--invert));
    }
    .top-bar__logout-icon {
      width: var(--icon-size);
      height: var(--icon-size);
      vertical-align: middle;
      margin-right: 0.25rem;
    }
    .hidden {
      display: none !important;
    }

    ::slotted([slot="logo"]),
    ::slotted([slot="logo-center"]) {
      height: var(--logo-size);
      display: flex;
      align-items: center;
    }

    ::slotted([slot="player1-avatar"]),
    ::slotted([slot="player1-username"]) {
      display: inline-flex;
      align-items: center;
      font-size: var(--main-font-size);
      color: var(--text);
    }

    .top-bar__left ::slotted([slot="player1-avatar"]) {
      margin-right: 0.5rem;
    }
    .top-bar__left ::slotted([slot="player1-username"]) {
      margin-left: 0;
    }

    .top-bar__right ::slotted([slot="player2-username"]) {
      margin-right: 0.5rem;
    }
    .top-bar__right ::slotted([slot="player2-avatar"]) {
      margin-left: 0;
    }

    ::slotted([slot="player1-avatar"]),
    ::slotted([slot="player2-avatar"]) {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      object-fit: cover;
      display: inline-block;
    }

    :host([mode="game"]) {
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }
  </style>

  <div class="top-bar__inner">
    <div class="top-bar__left">
      <slot name="logo"></slot>

      <slot name="player1-avatar"></slot>
      <slot name="player1-username"></slot>
    </div>

    <div class="top-bar__center">
      <slot name="logo-center"></slot>
    </div>

    <div class="top-bar__right">
      <button class="top-bar__avatar" id="avatar" type="button">
        <img src="" alt="Avatar" />
      </button>
      <slot name="toggle"></slot>
      <slot name="language"></slot>
      <button id="logout" class="top-bar__logout">
        <span class="top-bar__logout-icon">${actionIcons.logout}</span>
        <span class="top-bar__logout-text">${t('nav.logout')}</span>
      </button>

      <slot name="player2-username"></slot>
      <slot name="player2-avatar"></slot>
    </div>
  </div>
`;

export class TopBar extends HTMLElement {
  logoutButton: HTMLButtonElement | null = null;
  profileButton: HTMLButtonElement | null = null;

  static get observedAttributes() {
    return ['mode'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadow = this.shadowRoot;
    this.logoutButton = shadow?.getElementById('logout') as HTMLButtonElement;
    this.profileButton = shadow?.getElementById('avatar') as HTMLButtonElement;

    this.logoutButton.addEventListener('click', (e) => this.handleLogout(e));
    this.profileButton.addEventListener('click', (e) => this.handleProfile(e));

    // SIMPLIFIED: Just one listener
    window.addEventListener('username-updated', () => this.updateAvatar());

    this.updateAvatar();
    this.updateButtons();
  }

  private updateAvatar() {
    const avatarImg = this.shadowRoot?.querySelector('.top-bar__avatar img') as HTMLImageElement;
    if (!avatarImg) return;

    const username = state.userData?.username;
    const customAvatar = state.userData?.avatar;

    if (customAvatar) {
      // Use custom uploaded avatar
      avatarImg.src = `${customAvatar}?t=${Date.now()}`;
    } else if (username) {
      // Use generated avatar based on username
      avatarImg.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`;
    } else {
      // Fallback to default
      avatarImg.src = "https://api.dicebear.com/7.x/pixel-art/svg?seed=robot";
    }
  }

  private updateButtons() {
    const isGame = this.getAttribute('mode') === 'game';
    const loggedIn = !!state.userData?.accessToken;
    this.logoutButton?.classList.toggle('hidden', isGame || !loggedIn);
    this.profileButton?.classList.toggle('hidden', isGame || !loggedIn);
  }

  private async handleLogout(e: Event) {
    e.preventDefault();
    const res = await authService.logout(state.userData?.refreshToken);
    if (res?.error) {
      console.error(err(res.error));
      return;
    }

    state.userData = null;
    renderLoading('app');
    this.updateButtons();
    setTimeout(() => navigate('login'), 1200);
  }

  private handleProfile(e: Event) {
    e.preventDefault();
    const username = state.userData?.username;
    if (username) navigate(`/profile/${username}`);
  }
}

customElements.define('top-bar', TopBar);
