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

    .top-bar__chat-button {
      background: var(--video-transition-bg, rgba(0, 0, 0, 0.8));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 50px;
      color: white;
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      user-select: none;
      margin-left: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .top-bar__chat-button:hover {
      background: var(--video-transition-bg, rgba(0, 0, 0, 0.9));
      border-color: rgba(255, 255, 255, 0.4);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .top-bar__chat-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .top-bar__chat-button:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.6);
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
    }

    .top-bar__chat-icon {
      width: 16px;
      height: 16px;
      filter: brightness(0) invert(1);
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

    .top-bar__center .top-bar__chat-button {
      pointer-events: all;
      margin-left: 1rem;
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

    /* Position chat button for game mode */
    :host([mode="game"]) .top-bar__chat-button {
      position: absolute;
      left: calc(50% + 120px); /* Position to the right of centered title */
      top: 50%;
      transform: translateY(-50%);
      margin-left: 0;
    }

    :host([mode="game"]) {
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }
  </style>

  <div class="top-bar__inner">
    <div class="top-bar__left">
      <slot name="logo"></slot>
      <span class="top-bar__title"><slot name="title"></slot></span>
      
      <button class="top-bar__chat-button" id="chatButton" type="button">
        <svg class="top-bar__chat-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
        Chat
      </button>

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
        ${t('nav.logout')}
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
    const chatButton = shadow?.getElementById('chatButton') as HTMLButtonElement;

    this.logoutButton.addEventListener('click', (e) => this.handleLogout(e));
    this.profileButton.addEventListener('click', (e) => this.handleProfile(e));
    chatButton.addEventListener('click', (e) => this.handleChat(e));

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
    
    // Hide chat button in game mode
    const chatButton = this.shadowRoot?.getElementById('chatButton') as HTMLButtonElement;
    if (chatButton) {
      chatButton.style.display = isGame ? 'none' : 'flex';
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
    this.updateButtons();
    setTimeout(() => {
      navigate('/login');
    }, 1200);
  }

  private handleProfile(e: Event) {
    e.preventDefault();
    const username = state.userData?.username;
    if (username) navigate(`/profile/${username}`);
  }

  private handleChat(e: Event) {
    e.preventDefault();
    console.log('Chat button clicked!');
    
    // only open chat panel, don't toggle
    const chatPanel = document.querySelector('chat-panel');
    console.log('Found chat panel:', chatPanel);
    
    if (chatPanel) {
      chatPanel.setAttribute('visible', '');
      this.updateChatButtonState(true);
      console.log('Chat panel shown');
    } else {
      console.error('Chat panel not found in DOM');
    }
  }

  private updateChatButtonState(isOpen: boolean) {
    const chatButton = this.shadowRoot?.getElementById('chatButton');
    if (chatButton) {
      if (isOpen) {
        chatButton.style.background = 'rgba(255, 255, 255, 0.3)';
        chatButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
      } else {
        chatButton.style.background = 'var(--video-transition-bg, rgba(0, 0, 0, 0.8))';
        chatButton.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      }
    }
  }
}

customElements.define('top-bar', TopBar);

// .top-bar__player1,
//     .top-bar__player2 {
//       display: flex;
//       align-items: center;
//       gap: 0.5rem;
//       background: var(--body);
//       padding: 0.5rem;
//       border: 2px solid var(--border);
//       min-width: var(--button-min-width);
//     }
