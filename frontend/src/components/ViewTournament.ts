import { t } from "@/locales/Translations";
import { actionIcons } from '@/utils/Constants';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
    .tournament-view {
      width: 100%;
      height: 100%;
      padding: 2rem;
      box-sizing: border-box;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .match {
      background: var(--accent);
      border: 1px solid var(--border);
      height: var(--button-height);
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text, #fff);
      font-size: 1.1rem;
    }
    .match span {
      font-weight: bold;
    }
  </style>

  <div class="tournament-view"></div>
  <div class="tournament__footer">
    <button id="createBtn" class="tournament__footer-btn" type="button">${t('game.create')}</button>
  </div>
`;

export class ViewTournament extends HTMLElement {
  private _matches: Array<{ player1: string, player2: string }> = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.renderMatches();
  }

  set matchesData(data: Array<{ player1: string, player2: string }>) {
    this._matches = data;
    this.renderMatches();
  }

  renderMatches() {
    const container = this.shadowRoot.querySelector('.tournament-view');
    container.innerHTML = '';
    if (!this._matches || this._matches.length === 0) {
      container.innerHTML = `<p>No matches available.</p>`;
      return;
    }
    this._matches.forEach((match, idx) => {
      container.insertAdjacentHTML(
        'beforeend',
        `<div class="match">
          <span>Match ${idx + 1}:</span>
          <span>${match.player1} vs ${match.player2}</span>
        </div>`
      );
    });
  }
}

customElements.define('view-tournament', ViewTournament);
