import { t } from "@/locales/Translations";
import { state } from '@/state.js';
import '@/components/_templates/AuthFormLayout.js';

/*
  * ViewTournament is a custom element for viewing a tournament's matches.
  * It uses AuthFormLayout for consistent modal layout and styling.
  * Displays the current and upcoming matches, and emits an event to start the next match.
*/

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
    .tournament__description {
      color: var(--border);
      font-size: var(--main-font-size);
      text-align: center;
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

    .template__primary-button {
      padding: 1rem 0;
      border: none;
      background: var(--accent-secondary);
      color: var(--body);
      font-size: calc(var(--main-font-size) * 1.25);
      font-weight: bold;
      min-height: var(--button-height, 59px);
      width: 100%;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .template__primary-button:hover, .template__primary-button:focus {
      background: var(--accent);
      color: var(--text);
    }
  </style>

  <auth-form-layout>
    <h3 slot="header" id="title" class="tournament__title"></h3>

  <div slot="content">
    <p id="players" class="tournament__description"></p>
    <div class="tournament__view"></div>
  </div>

  <div slot="footer" class="tournament__footer">
    <button id="startBtn" class="template__primary-button" type="button">${t('game.start')}</button>
  </div>
`;

export class ViewTournament extends HTMLElement {
  private _matches: Array<{ player1: string, player2: string }> = [];
  private _currentMatchIndex: number = state.tournamentData.currentMatchIndex;
  private stageTitle: HTMLHeadingElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  private setStageTitle(idx: number) {
    switch (idx) {
      case 2:
        return t("game.semifinal");
      case 3:
        return t("game.final");
      default:
        return t("game.quarterfinal");
    }
  }

  connectedCallback() {
    this.renderMatches();
    this.setPlayersDescription();
    const startBtn = this.shadowRoot.querySelector('#startBtn') as HTMLButtonElement;
    this.stageTitle = this.shadowRoot.querySelector<HTMLHeadingElement>('#title');

    this.stageTitle.textContent = '';
    this.stageTitle.textContent = this.setStageTitle(state.tournamentData.stage);

    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const match = this._matches[this._currentMatchIndex];
      state.tournamentData.currentMatchIndex++;
      this.dispatchEvent(new CustomEvent('start-tournament-match', {
        detail: {
          player1: match.player1,
          player2: match.player2
        },
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

  private setPlayersDescription() {
    this.shadowRoot.getElementById("players").textContent = t('game.nextMatch', { players: `${this._matches[this._currentMatchIndex].player1} and ${this._matches[this._currentMatchIndex].player2}` })
  }
}

customElements.define('view-tournament', ViewTournament);
