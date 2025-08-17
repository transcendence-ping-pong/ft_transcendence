const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: bloc;
      height: var(--logo-size);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.25rem;
      cursor: pointer;
      border: none;
      background: none;
      box-sizing: border-box;
      font-weight: bold;
      font-family: var(--main-font);
    }
    .logo__img {
      width: auto;
      height: var(--logo-size);
      object-fit: contain;
      display: block;
    }
    .logo__img--background {
      width: var(--avatar-size);
      height: var(--avatar-size);
      background: var(--avatar-bg);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo__img--background {
      width: var(--avatar-size);
      height: var(--avatar-size);
      background: var(--avatar-bg);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo__title {
      font-size: var(--header-font-size);
      font-weight: 600;
      color: #fff;
      letter-spacing: 1px;
      text-shadow: 0 2px 8px #0008;
      /*prevent text selection, text cant be highlighted or copied*/
      user-select: none;
      pointer-events: none;
      white-space: nowrap;
    }

    .logo:hover {
      box-shadow: 0 6px 32px 12px rgba(0, 0, 0, 0.10);
    }
    .logo:disabled {
      cursor: not-allowed;
    }
  </style>
  <button class="logo">
    <span class="logo__img--background">
      <img class="logo__img" src="/public/logo.png" alt="Logo" />
    </span>
    <h1 class="logo__title">FOUR PING TWO PONG</h1>
  </button>
`;

export class Logo extends HTMLElement {
  private logo: HTMLButtonElement;

  static get observedAttributes() {
    return ['login'];
  }
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  private handleLogoClick = () => {
    window.location.href = '/';
  };

  connectedCallback() {
    this.logo = this.shadowRoot.querySelector('.logo');

    if (this.hasAttribute('login')) {
      this.logo.disabled = true;
      this.logo.removeEventListener('click', this.handleLogoClick);
    } else {
      this.logo.addEventListener('click', this.handleLogoClick);
    };
  }
}

customElements.define('pong-logo', Logo);
