import { t } from "@/locales/Translations";
import { actionIcons } from '@/utils/Constants';
import { createPBRClearCoatPlugin, QuadraticErrorSimplification } from "@babylonjs/core";

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      margin: 0 auto;
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
      gap: 0.5rem;
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

// flex-wrap: wrap;

export class CreateTournament extends HTMLElement {
  private players: string[] = [];
  private count: number = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const input = this.shadowRoot.querySelector<HTMLInputElement>('#username');
    const addBtn = this.shadowRoot.querySelector<HTMLButtonElement>('.tournament__form-btn');
    const tagsDiv = this.shadowRoot.querySelector<HTMLDivElement>('.tournament__tags');
    const createBtn = this.shadowRoot.querySelector<HTMLButtonElement>('#createBtn');
    const errorText = this.shadowRoot.querySelector<HTMLParagraphElement>('#error');

    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (name && !this.players.includes(name)) {
        if (this.players.length < 8) {
          this.players.push(name.toUpperCase());
          input.value = '';
          this.renderTags(tagsDiv);
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

    createBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert("Send to Backend list of players");
      // TODO: Implement backend communication to create tournament sending this.players
      // If create is successful, reset players list, show loading, and then show next matches
    });

    this.renderTags(tagsDiv);
    createBtn.disabled = this.players.length < 8;
  }

  renderTags(tagsDiv: HTMLDivElement) {
    tagsDiv.innerHTML = '';
    this.players.forEach((player, idx) => {
      tagsDiv.insertAdjacentHTML(
        'beforeend',
        `
      <span class="tournament__tag" data-idx="${idx}">
        ${player}
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
        this.renderTags(tagsDiv);
      });
    });
  }
}

customElements.define('create-tournament', CreateTournament);
