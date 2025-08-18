import { t } from "@/locales/Translations";
import { actionIcons } from '@/utils/Constants';
import { currentMatches, state } from '@/state.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .tournament__title {
      color: var(--text);
      font-size: var(--header-font-size);
    }
    .tournament__description {
      color: var(--border);
      font-size: var(--secondary-font-size);
      margin-bottom: 2rem;
    }

    .tournament__view {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .match__current {
      box-shadow: var(--shadow-soft);
    }
    .match__current,
    .match {
      background: var(--accent);
      border: 1px solid var(--border);
      height: var(--button-height);
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text);
      font-size: var(--main-font-size);
    }
    .match {
      opacity: 0.5;
    }
    .match__current span,  
    .match span {
      font-weight: bold;
    }
    .match__number {
      background: var(--body);
      border-radius: 50%;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: var(--main-font-size);
    }

    .tournament__footer {
      position: absolute;
      bottom: 2rem;
      right: 2rem;
    }
    .tournament__footer-btn {
      padding: 1rem 0;
      border: none;
      background: var(--accent-secondary);
      color: var(--body);
      font-size: var(--main-font-size);
      font-weight: bold;
      min-height: var(--button-height);
      min-width: var(--button-min-width);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .tournament__footer-btn:hover, .tournament__footer-btn:focus {
      background: var(--accent);
      color: var(--text);
    }
    .tournament__footer-btn:disabled {
      background: var(--accent-secondary);
      color: var(--body);
      cursor: not-allowed;
      opacity: 0.35;
    }
  </style>

  <h1 class="tournament__title">${t('game.tournamentCreated')}</h1>
  <p class="tournament__description">${t('game.nextMatch', { players: "Banana" })}</p>
  <div class="tournament__view"></div>
  <div class="tournament__footer">
    <button id="startBtn" class="tournament__footer-btn" type="button">${t('game.start')}</button>
  </div>
`;

export class ViewTournament extends HTMLElement {
  private _matches: Array<{ player1: string, player2: string }> = [];
  // TODO: THIS IS A MOCK currentMatch is hardcoded for now, should be set dynamically via state (?)
  private _currentMatchIndex: number = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.renderMatches();
    const startBtn = this.shadowRoot.querySelector('#startBtn') as HTMLButtonElement;

    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const match = this._matches[this._currentMatchIndex];
      this.dispatchEvent(new CustomEvent('start-tournament-match', {
        detail: {
          player1: match.player1,
          player2: match.player2
        }, // TODO: decide what should be passed here
        bubbles: true,
        composed: true
      }));
    });
  }

  set matchesData(data: Array<{ player1: string, player2: string }>) {
    this._matches = data;
    this.renderMatches();
  }

  renderMatches() {
    const container = this.shadowRoot.querySelector('.tournament__view');
    container.innerHTML = '';
    if (!this._matches || this._matches.length === 0) {
      container.innerHTML = `<p>No matches available.</p>`;
      return;
    }

    this._matches.forEach((match, idx) => {
      const currentClass = idx === this._currentMatchIndex ? 'match__current' : 'match';
      container.insertAdjacentHTML(
        'beforeend',
        `<div class="${currentClass}">
          <span class="match__number">${idx + 1}</span>
          <span>${match.player1} vs ${match.player2}</span>
        </div>`
      );
    });
  }
}

customElements.define('view-tournament', ViewTournament);
