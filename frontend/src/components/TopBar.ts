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
    .topbar-inner {
      width: 100%;
      max-width: 1440px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 auto;
      height: 100%;
    }
    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      height: 100%;
    }
    .topbar-left {
      gap: 0.7rem;
    }
    .topbar-title {
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
    .topbar-center {
      flex: 1;
      /* empty, for spacing */
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
    ::slotted([slot="logout"]) {
      margin-left: 0.5rem;
      cursor: pointer;
      background: none;
      border: none;
      color: #fff;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0 0.7rem;
      border-radius: 6px;
      transition: background 0.15s;
    }
    ::slotted([slot="logout"]:hover) {
      background: rgba(255,255,255,0.08);
    }
  </style>
  <div class="topbar-inner">
    <div class="topbar-left">
      <slot name="logo"></slot>
      <span class="topbar-title"><slot name="title">FOUR PING TWO PONG</slot></span>
    </div>
    <div class="topbar-center"></div>
    <div class="topbar-right">
      <slot name="avatar"></slot>
      <slot name="toggle"></slot>
      <slot name="language"></slot>
      <slot name="logout"></slot>
    </div>
  </div>
`;

export class TopBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }
}

customElements.define('top-bar', TopBar);