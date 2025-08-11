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
      user-select: none;
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
    .top-bar__title {
      font-size: var(--header-font-size);
      font-weight: 600;
      color: #fff;
      letter-spacing: 1px;
      text-shadow: 0 2px 8px #0008;
      user-select: none;
      pointer-events: none;
      white-space: nowrap;
      margin-left: 0.1rem;
    }
    .top-bar__center {
      flex: 1;
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
      height: var(--toogle-height);
      align-items: center;
      gap: 0.5em;
      cursor: pointer;
      background: var(--body);
      border-color: var(--border);
      color: var(--text);
      font-size: var(--main-font-size);
      font-weight: bold;
      padding: 0 1rem;
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

    ::slotted([slot="logo"]) {
      width: var(--logo-size);
      height: var(--logo-size);
      object-fit: contain;
      display: block;
    }
  </style>

  <div class="top-bar__inner">
    <div class="top-bar__left">
      <slot name="logo"></slot>
      <span class="top-bar__title"><slot name="title">FOUR PING TWO PONG</slot></span>
    </div>

    <div class="top-bar__center"></div>

    <div class="top-bar__right">
      <button class="top-bar__avatar" id="avatar" type="button">
        <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=robot" alt="Avatar" />
      </button>
      <slot name="toggle"></slot>
      <slot name="language"></slot>

      <button id="logout" class="top-bar__logout">
        <span class="top-bar__logout-icon">${actionIcons.logout}</span>
        ${t('nav.logout')}
      </button>
    </div>
  </div>
`;

export class TopBar extends HTMLElement {
  logoutButton: HTMLButtonElement | null = null;
  profileButton: HTMLButtonElement | null = null;

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

    // check logout visibility on mount
    this.showLogoutButton();
  }

  private showLogoutButton() {
    if (state.userData?.accessToken) {
      this.logoutButton?.classList.remove('hidden');
      this.profileButton?.classList.remove('hidden');
    } else {
      this.logoutButton?.classList.add('hidden');
      this.profileButton?.classList.add('hidden');
    }
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
    this.showLogoutButton();
    setTimeout(() => navigate('login'), 1200);
  }

  private handleProfile(e: Event) {
    e.preventDefault();
    const username = state.userData?.username;
    if (username) navigate(`/profile/${username}`);
  }
}

customElements.define('top-bar', TopBar);