import { RemoteGameRoom } from '@/multiplayer/types.js';
import { t } from "@/locales/Translations";
import { state } from '@/state.js';
import '@/components/_templates/AuthFormLayout.js';

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
    <h3 slot="header" id="title" class="tournament__title">${t("game.listGames")}</h3>

  <div slot="content">
    <p id="players" class="tournament__description"></p>
    <div class="tournament__view"></div>
  </div>

  <div slot="footer" class="tournament__footer">
    <button id="startBtn" class="template__primary-button" type="button">${t('game.start')}</button>
  </div>
`;

export class RemoteGamesList extends HTMLElement {
  private _matches: Array<{ player1: string, player2: string }> = [];
  private _currentMatchIndex: number = state.tournamentData.currentMatchIndex;
  private stageTitle: HTMLHeadingElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.renderMatches();
    this.setPlayersDescription();
    const startBtn = this.shadowRoot.querySelector('#startBtn') as HTMLButtonElement;
    this.stageTitle = this.shadowRoot.querySelector<HTMLHeadingElement>('#title');

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

  private updateGamesListInModal(rooms: RemoteGameRoom[]) {
    // updates games list in the dom modal
    const gamesListContainer = document.querySelector('#remote-games-modal-content');
    if (!gamesListContainer) return;

    if (!rooms || rooms.length === 0) {
      gamesListContainer.innerHTML = `
        <div class="w-full max-w-xl text-center text-gray-300">
          <div class="mx-auto mb-4 w-14 h-14 rounded-full bg-gray-700/60 flex items-center justify-center">🎮</div>
          <h3 class="text-xl font-semibold text-white mb-1">No games available</h3>
          <p class="text-gray-400 mb-4">Be the first to create a room and invite a friend.</p>
          <button id="create-game-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Create Game</button>
        </div>
      `;
      const createBtn = document.querySelector('#create-game-btn') as HTMLButtonElement | null;
      if (createBtn) {
        createBtn.onclick = () => {
          const modal = document.querySelector('generic-modal');
          if (modal) modal.remove();
          this.createGame();
        };
      }
      return;
    }
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

customElements.define('view-tournament', RemoteGamesList);


// const template = document.createElement('template');
// template.innerHTML = `
//   <style>
//     :host {
//       display: block;
//       width: 100%;
//       max-width: 48rem;
//       margin: 0 auto;
//     }
//     .w-full { width: 100%; }
//     .max-w-3xl { max-width: 48rem; }
//     .max-w-xl { max-width: 36rem; }
//     .text-center { text-align: center; }
//     .text-white { color: #fff; }
//     .text-gray-300 { color: #d1d5db; }
//     .text-gray-400 { color: #9ca3af; }
//     .font-semibold { font-weight: 600; }
//     .mb-1 { margin-bottom: 0.25rem; }
//     .mb-3 { margin-bottom: 0.75rem; }
//     .mb-4 { margin-bottom: 1rem; }
//     .mx-auto { margin-left: auto; margin-right: auto; }
//     .w-14 { width: 3.5rem; }
//     .h-14 { height: 3.5rem; }
//     .rounded { border-radius: 0.25rem; }
//     .rounded-full { border-radius: 9999px; }
//     .rounded-lg { border-radius: 0.5rem; }
//     .border { border-width: 1px; }
//     .border-gray-700 { border-color: #374151; }
//     .bg-gray-700\\/60 { background: rgba(55,65,81,0.6); }
//     .bg-gray-800\\/60 { background: rgba(31,41,55,0.6); }
//     .bg-gray-800\\/70 { background: rgba(31,41,55,0.7); }
//     .bg-gray-800\\/90 { background: rgba(31,41,55,0.9); }
//     .bg-green-600 { background: #16a34a; }
//     .bg-green-700 { background: #15803d; }
//     .bg-green-900\\/40 { background: rgba(20,83,45,0.4); }
//     .bg-blue-900\\/40 { background: rgba(30,58,138,0.4); }
//     .bg-red-900\\/40 { background: rgba(127,29,29,0.4); }
//     .border-green-700 { border-color: #15803d; }
//     .border-blue-700 { border-color: #1e40af; }
//     .border-red-700 { border-color: #b91c1c; }
//     .text-green-300 { color: #6ee7b7; }
//     .text-blue-300 { color: #93c5fd; }
//     .text-red-300 { color: #fca5a5; }
//     .flex { display: flex; }
//     .items-center { align-items: center; }
//     .justify-center { justify-content: center; }
//     .justify-between { justify-content: space-between; }
//     .gap-3 { gap: 0.75rem; }
//     .gap-4 { gap: 1rem; }
//     .p-4 { padding: 1rem; }
//     .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
//     .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
//     .px-4 { padding-left: 1rem; padding-right: 1rem; }
//     .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
//     .shadow { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
//     .animate-pulse { animation: pulse 1.5s cubic-bezier(.4,0,.6,1) infinite; }
//     @keyframes pulse {
//       0%, 100% { opacity: 1; }
//       50% { opacity: .4; }
//     }
//     .transition { transition: background 0.2s; }
//     .hover\\:bg-green-700:hover { background: #15803d; }
//     .hover\\:bg-gray-800\\/90:hover { background: rgba(31,41,55,0.9); }
//   </style>

//   <div id="remote-games-modal-content"></div>
// `;

// export class RemoteGamesList extends HTMLElement {
//   private container: HTMLDivElement;

//   constructor() {
//     super();
//     this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
//     this.container = this.shadowRoot!.getElementById('remote-games-modal-content') as HTMLDivElement;
//     this.showLoading();
//   }

//   public showLoading() {
//     this.container.innerHTML = `
//       <div class="w-full max-w-3xl">
//         <div class="grid grid-cols-1 gap-3">
//           ${Array.from({ length: 4 }).map(() => `
//             <div class="animate-pulse bg-gray-800/60 border border-gray-700 rounded-lg h-20"></div>
//           `).join('')}
//         </div>
//       </div>
//     `;
//   }

//   public showEmpty() {
//     this.container.innerHTML = `
//       <div class="w-full max-w-xl text-center text-gray-300">
//         <div class="mx-auto mb-4 w-14 h-14 rounded-full bg-gray-700/60 flex items-center justify-center">🎮</div>
//         <h3 class="text-xl font-semibold text-white mb-1">No games available</h3>
//         <p class="text-gray-400 mb-4">Be the first to create a room and invite a friend.</p>
//         <button id="create-game-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Create Game</button>
//       </div>
//     `;
//     const btn = this.container.querySelector('#create-game-btn') as HTMLButtonElement | null;
//     if (btn) {
//       btn.onclick = () => this.dispatchEvent(new CustomEvent('create-game', { bubbles: true }));
//     }
//   }

//   public setRooms(rooms: RemoteGameRoom[]) {
//     if (!rooms || rooms.length === 0) {
//       this.showEmpty();
//       return;
//     }
//     this.container.innerHTML = `
//       <div class="w-full max-w-3xl">
//         <div class="grid grid-cols-1 gap-3">
//           ${rooms.map(room => `
//             <div class="flex items-center justify-between p-4 mb-3 rounded-lg border border-gray-700 bg-gray-800/70 hover:bg-gray-800/90 transition">
//               <div class="text-white flex items-center gap-4">
//                 <div class="text-xs px-2 py-1 rounded-full border ${this.getBadgeClass(room.difficulty)}">${(room.difficulty || 'MEDIUM').toUpperCase()}</div>
//                 <div>
//                   <div class="font-semibold">Room ${room.id.slice(-6)}</div>
//                   <div class="text-sm text-gray-300">Host: <span class="text-white">${room.hostUsername}</span> · Players: ${room.currentPlayers}/2</div>
//                 </div>
//               </div>
//               <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow" data-room="${room.id}">Join</button>
//             </div>
//           `).join('')}
//         </div>
//       </div>
//     `;
//     this.container.querySelectorAll('button[data-room]').forEach(btn => {
//       btn.addEventListener('click', (e) => {
//         const roomId = (e.currentTarget as HTMLElement).getAttribute('data-room');
//         this.dispatchEvent(new CustomEvent('join-room', { detail: { roomId }, bubbles: true }));
//       });
//     });
//   }

//   private getBadgeClass(diff?: string) {
//     switch ((diff || 'MEDIUM').toUpperCase()) {
//       case 'EASY': return 'bg-green-900/40 border-green-700 text-green-300';
//       case 'HARD': return 'bg-red-900/40 border-red-700 text-red-300';
//       default: return 'bg-blue-900/40 border-blue-700 text-blue-300';
//     }
//   }
// }

// customElements.define('remote-games-list', RemoteGamesList);
