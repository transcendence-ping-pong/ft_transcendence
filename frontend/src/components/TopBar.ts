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
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--video-transition-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 9999;
      box-shadow: 0 2px 12px #0002;
      padding: 0 2rem;
      box-sizing: border-box;
      user-select: none;
    }
    .top-bar__inner {
      width: 100%;
      max-width: 1440px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 auto;
      height: 100%;
    }
    .top-bar__left, .top-bar__right {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      height: 100%;
    }
    .top-bar__left {
      gap: 0.7rem;
    }
    .top-bar__title {
      font-size: 1.05rem;
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

    .top-bar__logout {
      display: flex;
      height: 32px;
      align-items: center;
      gap: 0.5em;
      cursor: pointer;
      background: var(--body);
      border-color: var(--border);
      color: var(--text);
      font-size: 0.75rem;
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
      width: 22px;
      height: 22px;
      vertical-align: middle;
      margin-right: 0.25rem;
    }

    ::slotted([slot="logo"]) {
      width: 40px;
      height: 40px;
      object-fit: contain;
      display: block;
    }
    ::slotted([slot="toggle"]),
    ::slotted([slot="language"]),
    ::slotted([slot="avatar"]),
    ::slotted([slot="logout"]) {
      // height: 40px;
    }
    ::slotted([slot="avatar"]) {
      width: 40px;
      border-radius: 50%;
      object-fit: cover;
      background: #fff2;
      margin-left: 0.5rem;
    }
  </style>

  <div class="top-bar__inner">
    <div class="top-bar__left">
      <slot name="logo"></slot>
      <span class="top-bar__title"><slot name="title">FOUR PING TWO PONG</slot></span>
    </div>
    <div class="top-bar__center"></div>
    <div class="top-bar__right">
      <slot name="avatar"></slot>
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

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const shadow = this.shadowRoot;
    this.logoutButton = shadow?.getElementById('logout') as HTMLButtonElement;
    this.logoutButton.onclick = this._onLogout.bind(this);
  }

  _showLogoutButton() {
    if (state.userData?.accessToken) {
      this.logoutButton?.classList.remove('hidden');
      return;
    }

    this.logoutButton?.classList.add('hidden');
  }

  async _onLogout(e: Event) {
    e.preventDefault();
    const res = await authService.logout(state.userData.refreshToken);
    if (res.error) console.error(err(res.error));

    state.userData = null; // clear user data in state
    renderLoading('app'); // render loading state, transition between pages
    setTimeout(() => {
      navigate('login');
    }, 1200);
  };
}

customElements.define('top-bar', TopBar);