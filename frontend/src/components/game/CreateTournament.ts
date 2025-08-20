import { t } from "@/locales/Translations";
import { state, TournamentData } from "@/state";
import { actionIcons } from '@/utils/Constants';
import { createTournament } from '@/services/matchService';
import '@/components/_templates/AuthFormLayout.js';
import '@/components/_templates/CustomTag.js';

/*
  * CreateTournament is a custom element for creating a tournament.
  * It provides a form to add players, displays tags for each player,
  * and emits a custom event with the tournament data on creation.
  * The component uses AuthFormLayout for consistent modal layout.
*/

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .tournament__description {
      color: var(--border);
      font-size: var(--main-font-size);
      text-align: center;
    }
    .tournament__content {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      background: var(--placeholder-bg);
      padding: 0.5rem;
      min-height: 300px;
    }
    .tournament__form {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      width: 100%;
    }
    input {
      flex: 1;
      padding: 1rem;
      border: 1.5px solid var(--border);
      font-size: 1rem;
      background: var(--body);
      color: var(--border);
      outline: none;
      transition: border-color 0.2s;
    }
    .input-error:focus,
    .input-error {
      border-color:var(--warning);
    }
    .tournament__form-btn {
      display: inline-flex;
      align-items: center;
      padding: 0.1em 0.3em;
      justify-content: center;
      background: var(--accent);
      border-radius: 50%;
      border: var(--border);
      width: var(--button-circle-size);
      height: var(--button-circle-size);
    }
    .tournament__form-btn span img {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }
    .tournament__form-btn:hover {
      background: var(--accent-secondary);
      box-shadow: var(--shadow-soft);
      cursor: pointer;
    }
    .tournament__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
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
    .template__primary-button:disabled {
      background: var(--accent-secondary);
      color: var(--body);
      cursor: not-allowed;
      opacity: 0.35;
    }
  </style>

  <auth-form-layout>
    <span slot="header">
      <h3 class="tournament__title">${t('game.startTournament')}</h3>
    </span>
    <span slot="content">
      <div class="tournament__content">
        <p class="tournament__description">${t('game.addPlayers')}</p>
        <form class="tournament__form" autocomplete="off">
          <input id="username" name="username" type="text" placeholder="${t('auth.username')}" />
          <button class="tournament__form-btn" title="Add" type="button">
            <span>${actionIcons.accept}</span>
          </button>
        </form>
        <div class="tournament__tags"></div>
      </div>
    </span>
    <span slot="error" id="error"></span>
    <span slot="footer">
      <button id="createBtn" class="template__primary-button" type="button">${t('game.create')}</button>
    </span>
  </auth-form-layout>
`;

export class CreateTournament extends HTMLElement {
  private players: string[] = [];
  private creatorId: number;
  private createBtn: HTMLButtonElement;
  #MAX_PLAYERS = 8;

  private input: HTMLInputElement;
  private addBtn: HTMLButtonElement;
  private tagsDiv: HTMLDivElement;
  private errorText: HTMLSpanElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
    this.handleAdd = this.handleAdd.bind(this);
    this.handleInputKeydown = this.handleInputKeydown.bind(this);
    this.handleCreate = this.handleCreate.bind(this);
  }

  connectedCallback() {
    this.input = this.shadowRoot.querySelector<HTMLInputElement>('#username');
    this.addBtn = this.shadowRoot.querySelector<HTMLButtonElement>('.tournament__form-btn');
    this.tagsDiv = this.shadowRoot.querySelector<HTMLDivElement>('.tournament__tags');
    this.createBtn = this.shadowRoot.querySelector<HTMLButtonElement>('#createBtn');
    this.errorText = this.shadowRoot.querySelector<HTMLSpanElement>('#error');

    this.createBtn.disabled = this.players.length < this.#MAX_PLAYERS;

    this.addBtn.addEventListener('click', this.handleAdd);
    this.input.addEventListener('keydown', this.handleInputKeydown);
    this.createBtn.addEventListener('click', this.handleCreate);

    this.renderTags();
  }

  disconnectedCallback() {
    this.addBtn?.removeEventListener('click', this.handleAdd);
    this.input?.removeEventListener('keydown', this.handleInputKeydown);
    this.createBtn?.removeEventListener('click', this.handleCreate);
  }

  private handleAdd(e: Event) {
    e.preventDefault();
    const name = this.input.value.trim().toUpperCase();
    this.errorText.textContent = '';
    if (name.length > 20) {
      this.errorText.textContent = t('game.maxNameLength');
      return;
    }
    if (name && !this.players.includes(name)) {
      if (this.players.length < this.#MAX_PLAYERS) {
        this.players.push(name.toUpperCase());
        this.input.value = '';
        this.renderTags();
        this.createBtn.disabled = this.players.length < this.#MAX_PLAYERS;
      } else {
        this.errorText.textContent = t('game.maxPlayersReached');
      }
    } else {
      this.errorText.textContent = t('game.dupName');
    }
  }

  private handleInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addBtn.click();
    }
  }

  private async handleCreate(e: Event) {
    e.preventDefault();
    this.creatorId = state.userData.userId;
    try {
      const result = await createTournament(this.creatorId, this.players);
      state.tournamentData = {
        players: result.players,
        matches: {},
        currentMatchIndex: 0,
        stage: 1,
        tournamentId: result.id
      } as TournamentData;
      const matches = state.tournamentData.players;
      this.dispatchEvent(new CustomEvent('tournament-stage', {
        detail: { matches },
        bubbles: true,
        composed: true
      }));
      this.resetData();
    } catch (err: any) {
      this.errorText.textContent = err?.message || t('game.createTournamentError');
    }
  }

  private renderTags() {
    this.tagsDiv.innerHTML = '';
    this.players.forEach((player, idx) => {
      const tag = document.createElement('custom-tag');
      tag.setAttribute('text', player);
      tag.setAttribute('closable', '');
      tag.setAttribute('size', 'm');
      tag.setAttribute('data-idx', idx.toString());
      tag.addEventListener('close', (e) => {
        e.stopPropagation();
        this.errorText.textContent = '';
        this.players.splice(idx, 1);
        this.createBtn.disabled = this.players.length < this.#MAX_PLAYERS;
        this.renderTags();
      });
      this.tagsDiv.appendChild(tag);
    });
  }

  private resetData() {
    this.players = [];
    this.createBtn.disabled = true;
    this.input.value = '';
    this.renderTags();
  }
}

customElements.define('create-tournament', CreateTournament);
