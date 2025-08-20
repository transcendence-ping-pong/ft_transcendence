import { gameOrchestrator } from '@/game/gameOrchestrator.js';
import '@/components/navigation/TopBar.js';
import '@/components/navigation/Logo.js';
import '@/components/_templates/GenericModal.js';
import '@/components/game/CreateTournament.js';
import '@/components/game/ViewTournament.js';
import '@/components/notification/ToogleChatBox.js';
import { state } from '@/state';

// TODO: THIS IS A MOCK, pass player names and avatars dynamically
const PLAYER_1 = { name: '', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=alice' };
const PLAYER_2 = { name: '', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=bob' };

// // TODO FIX: use scale-100 if want to scale down border image
// // remove 20px margin bottom from the border image?
export function renderGame(containerId: string) {
  document.body.classList.add('overflow-hidden'); // prevent scrolling during the game
  const container = document.getElementById(containerId);
  if (!container) return;

  //  ${renderTopBar()} -- TODO: render player names and avatars dynamically
  // function renderTopBar() {
  //   return (PLAYER_1.name && PLAYER_2.name)
  //     ? `
  //       <top-bar mode="game">
  //         <img slot="player1-avatar" src="${PLAYER_1.avatar}" alt="${PLAYER_1.name}" />
  //         <p slot="player1-username">${PLAYER_1.name}</p>
  //         <pong-logo slot="logo-center"></logo>
  //         <p slot="player2-username">${PLAYER_2.name}</p>
  //         <img slot="player2-avatar" src="${PLAYER_2.avatar}" alt="${PLAYER_2.name}" />
  //       </top-bar>
  //     `
  //     : `
  //       <top-bar mode="game">
  //         <pong-logo slot="logo-center"></logo>
  //       </top-bar>
  //     `;
  // }

  container.innerHTML = `
    <top-bar mode="game">
      <pong-logo slot="logo-center"></logo>
    </top-bar>

    <div class="game-area relative w-screen h-screen">
      <div id="game-screen" class="absolute z-10"></div>
      <img 
        src="/public/game-border.png" 
        alt="TV Frame"
        class="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
      />
    </div>
    <toggle-chat-box></toggle-chat-box>
  `;

  const orchestrator = new gameOrchestrator('game-screen');

  // listen for tournament-created globally, so it works for every round
  // this is important because in the case of a TOURNAMENT, the view modal will be triggered many times
  window.addEventListener('tournament-stage', (e: CustomEvent) => {
    // remove any existing modal
    const oldModal = container.querySelector('generic-modal');
    if (oldModal) oldModal.remove();

    // show the modal with the tournament view
    container.insertAdjacentHTML('beforeend', `
      <generic-modal dismissible="false" appear-delay="500">
        <div slot="body" class="w-full h-full min-h-full flex justify-center items-center" id="tournament-modal-content"></div>
      </generic-modal>
    `);

    const content = container.querySelector('#tournament-modal-content');
    if (!content) return;

    showTournamentView(e.detail.matches);

    function showTournamentView(matches: Array<{ player1: string, player2: string }>) {
      content.innerHTML = '';
      const view = document.createElement('view-tournament');
      (view as any).matchesData = matches;
      content.appendChild(view);

      // listen for the start-tournament-match event
      // this means all config FE-BE was done successfully...
      view.addEventListener('start-tournament-match', (e: CustomEvent) => {
        const modal = container.querySelector('generic-modal');
        if (modal) modal.remove();

        // ...set players names, it comes from event detail
        PLAYER_1.name = e.detail.player1;
        PLAYER_2.name = e.detail.player2;

        // ...re-render top bar with player info
        // container.querySelector('top-bar').outerHTML = renderTopBar();
        // ...finally, start the game
        // this is an exception, as the game start is usually triggered by the gameOrchestrator
        state.players = { p1: e.detail.player1, p2: e.detail.player2 }
        orchestrator.startGame();
      });
    }
  });

  window.addEventListener('openTournamentConfig', () => {
    container.insertAdjacentHTML('beforeend', `
      <generic-modal dismissible="false" appear-delay="500">
        <div slot="body" class="w-full h-full min-h-full flex justify-center items-center" id="tournament-modal-content"></div>
      </generic-modal>
    `);

    const content = container.querySelector('#tournament-modal-content');
    if (!content) return;

    showTournamentConfig();

    function showTournamentConfig() {
      content.innerHTML = '';
      const el = document.createElement('create-tournament');
      content.appendChild(el);
    }
  });

  // listen for remote games modal
  window.addEventListener('openRemoteGamesModal', () => {
    container.insertAdjacentHTML('beforeend', `
      <generic-modal dismissible="true" appear-delay="500">
        <div slot="body" class="w-full h-full min-h-full flex flex-col justify-center items-center p-8" id="remote-games-modal-content">
          <div class="flex items-center justify-between w-full mb-6">
            <h2 class="text-2xl font-bold text-white">Available Games</h2>
            <button id="refresh-games-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              🔄 Refresh
            </button>
          </div>
          <div class="text-center text-gray-400">Loading games...</div>
        </div>
      </generic-modal>
    `);

    // add refresh button functionality
    const refreshBtn = container.querySelector('#refresh-games-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // dispatch refresh event that RemoteMultiplayerUI can listen to
        window.dispatchEvent(new CustomEvent('refreshRemoteGames'));
      });
    }
  });

  // Listen for remote multiplayer events from invite system
  // keep page listener minimal; don't override the manager's flow to avoid duplicate state churn
  window.addEventListener('roomCreated', (e: CustomEvent) => {
    console.log('Game page: Room created event received', e.detail);
    setupInviteGame(e.detail.room, true);
  });

  window.addEventListener('playerJoined', (e: CustomEvent) => {
    console.log('Game page: Player joined event received', e.detail);
    // only set names/top bar; do not call setInviteRoom again
    const room = e.detail.room;
    PLAYER_1.name = room.hostUsername;
    PLAYER_2.name = room.guestUsername;
    container.querySelector('top-bar').outerHTML = renderTopBar();
  });

  // Set up invite game - just set up the room, let multiplayer flow handle the rest
  function setupInviteGame(room: any, isHost: boolean) {
    // Set the room in the existing RemoteMultiplayerManager ONCE
    const remoteMultiplayerManager = (window as any).remoteMultiplayerManager;
    if (remoteMultiplayerManager && !remoteMultiplayerManager.isInRoom()) {
      remoteMultiplayerManager.setInviteRoom(room, isHost);
    }
    // Set player names for the game
    PLAYER_1.name = room.hostUsername;
    PLAYER_2.name = room.guestUsername;

    // Re-render top bar with player info
    container.querySelector('top-bar').outerHTML = renderTopBar();
  }
}
