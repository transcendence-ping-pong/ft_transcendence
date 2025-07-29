import { getPlaySummary } from '@/services/api';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .summary-container {
      display: flex;
      justify-content: space-around;
      align-items: center;
      gap: 2rem;
      padding: 1rem;
    }
    .player-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 255, 255, 0.25);
      padding: 1rem;
      min-width: 160px;
      box-shadow: 0 2px 8px #0002;
    }
    .player-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 0.5rem;
    }
    .winner {
      border: 4px solid var(--success);
    }
    .score {
      font-size: 2rem;
      font-weight: bold;
      margin: 1rem 0;
    }
    .info {
      text-align: center;
      margin-top: 0.5rem;
      font-size: 0.95rem;
      color: #555;
    }
  </style>
  <div class="summary-container">
    <div class="player-card" id="player1-card">
      <img class="player-avatar" id="player1-img" />
      <h3 id="player1-name"></h3>
      <div class="info" id="player1-placement"></div>
    </div>
    <div class="score" id="score"></div>
    <div class="player-card" id="player2-card">
      <img class="player-avatar" id="player2-img" />
      <h3 id="player2-name"></h3>
      <div class="info" id="player2-placement"></div>
    </div>
  </div>
  <div class="info" id="game-info"></div>
`;

export class PlaySummary extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this._renderSummary();
  }

  async _renderSummary() {
    const summary = await getPlaySummary('game_789');
    const shadow = this.shadowRoot;

    // Player 1
    (shadow?.getElementById('player1-img') as HTMLImageElement).src = summary.player1.avatar;
    (shadow?.getElementById('player1-name') as HTMLElement).textContent = summary.player1.username;
    (shadow?.getElementById('player1-placement') as HTMLElement).textContent = `Placement: ${summary.player1.tournamentPlacement}`;

    // Player 2
    (shadow?.getElementById('player2-img') as HTMLImageElement).src = summary.player2.avatar;
    (shadow?.getElementById('player2-name') as HTMLElement).textContent = summary.player2.username;
    (shadow?.getElementById('player2-placement') as HTMLElement).textContent = `Placement: ${summary.player2.tournamentPlacement}`;

    // Score
    (shadow?.getElementById('score') as HTMLElement).textContent = `${summary.score.player1} : ${summary.score.player2}`;

    // Highlight winner
    if (summary.winner === summary.player1.username) {
      (shadow?.getElementById('player1-card') as HTMLElement).classList.add('winner');
    } else if (summary.winner === summary.player2.username) {
      (shadow?.getElementById('player2-card') as HTMLElement).classList.add('winner');
    }

    // Game info
    (shadow?.getElementById('game-info') as HTMLElement).textContent =
      `Game Type: ${summary.gameType} | Duration: ${summary.duration}`;
  }
};

customElements.define('play-summary', PlaySummary);