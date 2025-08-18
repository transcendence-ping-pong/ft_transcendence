import { actionIcons } from '@/utils/Constants';
import { t } from '@/locales/Translations.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      margin: 0 auto;
      box-sizing: border-box;
      box-shadow: var(--shadow-soft);
    }
    .template__primary-button {
      padding: var(--component-padding);
      border: none;
      background: var(--accent-secondary);
      color: var(--body);
      font-size: var(--main-font-size);
      font-weight: bold;
      min-height: var(--select-height);
      min-width: var(--button-min-width);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
      border: 2px solid var(--border);
    }
    .template__primary-button:hover, .template__primary-button:focus {
      background: var(--accent);
      color: var(--text);
    }
    .start-game-button--icon {
      display: flex;
      align-items: center;
    }
    .start-game-button--icon img, .start-game-button--icon svg {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }
  </style>

  <button class="template__primary-button">
    <span class="start-game-button--icon">${actionIcons.game}</span>
    ${t("game.start")}
  </button>
`;

export class StartGameButton extends HTMLElement {
  private startGameBtn: HTMLButtonElement;

  private handleStartGameClick = () => {
    window.location.href = '/game';
  };

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.startGameBtn = this.shadowRoot!.querySelector('.template__primary-button') as HTMLButtonElement;
    this.startGameBtn.addEventListener('click', this.handleStartGameClick);
  }
}

customElements.define('start-game-button', StartGameButton);
