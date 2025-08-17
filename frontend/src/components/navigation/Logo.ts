const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: var(--logo-size);
      height: var(--logo-size);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
    }
    .logo__img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .logo__title {
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
  </style>
  <span class="logo">
    <img class="logo__img" src="/public/logo.png" alt="Logo" />
    <h1 class="logo__title">FOUR PING TWO PONG</h1>
  </span>
`;

export class Logo extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.shadowRoot.querySelector('.logo').addEventListener('click', () => {
      window.location.href = '/';
    });
  }
}

customElements.define('pong-logo', Logo);
