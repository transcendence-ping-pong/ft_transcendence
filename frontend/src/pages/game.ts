// import { gameOrchestrator } from '@/game/gameOrchestrator.js';
// import '@/components/TopBar.js';
// import '@/components/GenericModal.js';
// import '@/components/CreateTournament.js';
// import '@/components/ViewTournament.js';

// // TODO: THIS IS A MOCK, pass player names and avatars dynamically
// const PLAYER_1 = { name: '', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=alice' };
// const PLAYER_2 = { name: '', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=bob' };

// // TODO FIX: use scale-100 if want to scale down border image
// // remove 20px margin bottom from the border image?
// export function renderGame(containerId: string) {
//   document.body.classList.add('overflow-hidden'); // prevent scrolling

//   const container = document.getElementById(containerId);
//   if (!container) return;

//   function renderTopBar() {
//     return (PLAYER_1.name && PLAYER_2.name)
//       ? `
//         <top-bar mode="game">
//           <img slot="player1-avatar" src="${PLAYER_1.avatar}" alt="${PLAYER_1.name}" />
//           <p slot="player1-username">${PLAYER_1.name}</p>
//           <img slot="logo-center" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=octopus" alt="Logo" />
//           <span slot="title-center">FOUR PING TWO PONG</span>
//           <p slot="player2-username">${PLAYER_2.name}</p>
//           <img slot="player2-avatar" src="${PLAYER_2.avatar}" alt="${PLAYER_2.name}" />
//         </top-bar>
//       `
//       : `
//         <top-bar mode="game">
//           <img slot="logo-center" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=octopus" alt="Logo" />
//           <span slot="title-center">FOUR PING TWO PONG</span>
//         </top-bar>
//       `;
//   }

//   container.innerHTML = `
//     ${renderTopBar()}

//     <div class="game-area relative w-screen h-screen">
//       <div id="game-screen" class="absolute z-10"></div>
//       <img 
//         src="/public/game-border.png" 
//         alt="TV Frame"
//         class="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
//       />
//     </div>
//   `;

//   const orchestrator = new gameOrchestrator('game-screen');

//   // insertAdjacentHTML method uses specified input as HTML...
//   // ...and inserts the resulting nodes into the DOM tree at a specified position
//   window.addEventListener('openTournamentConfig', () => {
//     container.insertAdjacentHTML('beforeend', `
//       <generic-modal dismissible="false" appear-delay="500">
//         <div slot="body" class="w-full h-full min-h-full flex justify-center items-center" id="tournament-modal-content"></div>
//       </generic-modal>
//     `);

//     const content = container.querySelector('#tournament-modal-content');
//     if (!content) return;

//     showTournamentConfig();

//     function showTournamentConfig() {
//       content.innerHTML = '';
//       const el = document.createElement('create-tournament');
//       el.addEventListener('tournament-created', (e: CustomEvent) => {
//         showSpinner();
//         setTimeout(() => showTournamentView(e.detail.matches), 1200);
//       });
//       content.appendChild(el);
//     }

//     function showSpinner() {
//       content.innerHTML = `
//         <div class="w-12 h-12 border-8 border-[var(--loading)] border-t-[var(--accent-tertiary)] rounded-full animate-spin"></div>
//       `;
//     }

//     function showTournamentView(matches: Array<{ player1: string, player2: string }>) {
//       content.innerHTML = '';
//       const view = document.createElement('view-tournament');
//       (view as any).matchesData = matches;
//       content.appendChild(view);

//       // listen for the start-tournament-match event
//       // this means all config FE-BE was done successfully...
//       view.addEventListener('start-tournament-match', (e: CustomEvent) => {

//         alert("Received event");
//         // ...if a modal is opened, remove
//         const modal = container.querySelector('generic-modal');
//         if (modal) {
//           modal.remove();
//         } else {
//           // ...however, if it is closed, it means the user is in the next round
//           // so, create a new modal and show next matches
//           container.insertAdjacentHTML('beforeend', `
//             <generic-modal dismissible="false" appear-delay="500">
//               <view-tournament slot="body"></view-tournament>
//             </generic-modal>
//           `);
//         }

//         // ...set players names
//         PLAYER_1.name = e.detail.player1;
//         PLAYER_2.name = e.detail.player2;

//         // ...re-render top bar with player info
//         container.querySelector('top-bar').outerHTML = renderTopBar();

//         // ...finally, start the game
//         orchestrator.startGame();
//       });
//     }
//   });
// }

import { gameOrchestrator } from '@/game/gameOrchestrator.js';
import '@/components/TopBar.js';
import '@/components/GenericModal.js';
import '@/components/CreateTournament.js';
import '@/components/ViewTournament.js';

const PLAYER_1 = { name: '', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=alice' };
const PLAYER_2 = { name: '', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=bob' };

export function renderGame(containerId: string) {
  document.body.classList.add('overflow-hidden');
  const container = document.getElementById(containerId);
  if (!container) return;

  function renderTopBar() {
    return (PLAYER_1.name && PLAYER_2.name)
      ? `
        <top-bar mode="game">
          <img slot="player1-avatar" src="${PLAYER_1.avatar}" alt="${PLAYER_1.name}" />
          <p slot="player1-username">${PLAYER_1.name}</p>
          <img slot="logo-center" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=octopus" alt="Logo" />
          <span slot="title-center">FOUR PING TWO PONG</span>
          <p slot="player2-username">${PLAYER_2.name}</p>
          <img slot="player2-avatar" src="${PLAYER_2.avatar}" alt="${PLAYER_2.name}" />
        </top-bar>
      `
      : `
        <top-bar mode="game">
          <img slot="logo-center" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=octopus" alt="Logo" />
          <span slot="title-center">FOUR PING TWO PONG</span>
        </top-bar>
      `;
  }

  container.innerHTML = `
    ${renderTopBar()}
    <div class="game-area relative w-screen h-screen">
      <div id="game-screen" class="absolute z-10"></div>
      <img 
        src="/public/game-border.png" 
        alt="TV Frame"
        class="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
      />
    </div>
  `;

  const orchestrator = new gameOrchestrator('game-screen');

  // Listen for tournament-created globally, so it works for every round
  window.addEventListener('tournament-created', (e: CustomEvent) => {
    // Remove any existing modal
    const oldModal = container.querySelector('generic-modal');
    if (oldModal) oldModal.remove();

    // Show the modal with the tournament view
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

      view.addEventListener('start-tournament-match', (e: CustomEvent) => {
        const modal = container.querySelector('generic-modal');
        if (modal) modal.remove();

        PLAYER_1.name = e.detail.player1;
        PLAYER_2.name = e.detail.player2;
        container.querySelector('top-bar').outerHTML = renderTopBar();
        orchestrator.startGame();
      });
    }
  });

  // The rest of your openTournamentConfig logic for the first time
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
}
