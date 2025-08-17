import { t } from "@/locales/Translations";
import { state, TournamentData } from "@/state";
import { actionIcons } from '@/utils/Constants';
import { createTournament } from '@/services/matchService';


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
      border: 1.5px solid var(--accent);
      font-size: 1rem;
      background: var(--body);
      color: var(--border);
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: var(--border);
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
      box-shadow: 0 1px 2px #0002;
    }
    .tournament__form-btn span img {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      filter: invert(var(--invert));
    }
    .tournament__form-btn:hover {
      background: var(--accent-secondary);
      cursor: pointer;
    }
    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 1rem 0 1rem 0;
    }

    .tournament__tags {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin-bottom: 1rem;
      width: 100%;
    }
    .tournament__tag {
      background: var(--accent);
      border: 1px solid var(--border);
      padding: 0.18em 0.7em 0.18em 0.7em;
      font-size: 0.85em;
      cursor: pointer;
      color: var(--text);
      margin-bottom: 0.1em;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 0.2s, color 0.2s;
      font-weight: 500;
    }
    .tournament__tag-remove {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.3em 0.3em;
    }
    .tournament__tag-remove:hover {
      background: color-mix(in srgb, var(--hover), transparent 50%);
      border-radius: 50%;
      padding: 0.3em 0.3em;
    }
    .tournament__tag img,
    .tournament__tag-remove span img {
      width: 1rem;
      height: 1rem;
      display: block;
      filter: invert(var(--invert));
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

    .tournament__error {
      font-size: 0.75rem;
      color: var(--warning);
      text-align: start;
      margin-top: -0.5rem;
      min-height: 1.25rem;
      display: block;
    }
  </style>

  <h1 class="tournament__title">${t('game.startTournament')}</h1>
  <p class="tournament__description">${t('game.addPlayers')}</p>
  <div class="tournament__form">
    <input id="username" name="username" type="text" required placeholder="${t('auth.username')}" />
    <button class="tournament__form-btn" title="Add">
      <span>${actionIcons.accept}</span>
    </button>
  </div>
  <p class="tournament__error" id="error"></p>

  <hr/>
  <div class="tournament__tags"></div>
  <div class="tournament__footer">
    <button id="createBtn" class="tournament__footer-btn" type="button">${t('game.create')}</button>
  </div>
`;

export class CreateTournament extends HTMLElement {
  private players: string[] = [];
  private creatorId: number;
  private createBtn: HTMLButtonElement;
  #MAX_PLAYERS = 8;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const input = this.shadowRoot.querySelector<HTMLInputElement>('#username');
    const addBtn = this.shadowRoot.querySelector<HTMLButtonElement>('.tournament__form-btn');
    const tagsDiv = this.shadowRoot.querySelector<HTMLDivElement>('.tournament__tags');
    this.createBtn = this.shadowRoot.querySelector<HTMLButtonElement>('#createBtn');
    const errorText = this.shadowRoot.querySelector<HTMLParagraphElement>('#error');

    this.createBtn.disabled = this.players.length < 8;

    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = input.value.trim();
      errorText.textContent = '';
      if (name.length > 20) {
        errorText.textContent = t('game.maxNameLength');
        return;
      }

      if (name && !this.players.includes(name)) {
        if (this.players.length < this.#MAX_PLAYERS) {
          this.players.push(name.toUpperCase());
          input.value = '';
          this.renderTags(tagsDiv);
          this.createBtn.disabled = this.players.length < this.#MAX_PLAYERS;
        } else {
          errorText.textContent = t('game.maxPlayersReached');
        }
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });

    // TODO: Implement backend communication to create tournament sending this.players
    // If create is successful, reset players list, show loading, and then show next matches
    // THIS IS A MOCK, REPLACE IT WITH ACTUAL BACKEND LOGIC
    this.createBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      this.creatorId = state.userData.userId;
      
      const result = await createTournament(this.creatorId, this.players);
      
      state.tournamentData = {
        players: result.players,
        matches: {},
        currentMatchIndex: 0,
        stage: 1,
        tournamentId: result.id
      } as TournamentData;

      // START MOCK
      // shuffle and pair players
    //   const players = [...this.players];
    //   for (let i = players.length - 1; i > 0; i--) {
    //     const j = Math.floor(Math.random() * (i + 1));
    //     [players[i], players[j]] = [players[j], players[i]];
    //   }
    //   const matches = [
    //     { player1: players[0], player2: players[1] },
    //     { player1: players[2], player2: players[3] },
    //     { player1: players[4], player2: players[5] },
    //     { player1: players[6], player2: players[7] },
    //   ];
      // END MOCK

      // emit custom event with matches data
      const matches = state.tournamentData.players;

      this.dispatchEvent(new CustomEvent('tournament-stage', {
        detail: { matches },
        bubbles: true,
        composed: true
      }));

      // reset component state
      this.resetData();
    });

    this.renderTags(tagsDiv);
  }

  renderTags(tagsDiv: HTMLDivElement) {
    tagsDiv.innerHTML = '';
    this.players.forEach((player, idx) => {
      tagsDiv.insertAdjacentHTML(
        'beforeend',
        `
      <span class="tournament__tag" data-idx="${idx}">
        ${actionIcons.user} ${player}
        <button class="tournament__tag-remove" title="Remove" data-idx="${idx}">
          <span>${actionIcons.close}</span>
        </button>
      </span>
      `
      );
    });

    // event listeners for remove buttons
    tagsDiv.querySelectorAll('.tournament__tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-idx'));
        this.players.splice(idx, 1);
        this.createBtn.disabled = this.players.length < this.#MAX_PLAYERS;
        this.renderTags(tagsDiv);
      });
    });
  }

  resetData() {
    this.players = [];
    this.createBtn.disabled = true;
    this.shadowRoot.querySelector<HTMLInputElement>('#username').value = '';
    this.renderTags(this.shadowRoot.querySelector<HTMLDivElement>('.tournament__tags'));
  }
}

customElements.define('create-tournament', CreateTournament);
