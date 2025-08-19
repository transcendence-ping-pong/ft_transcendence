import { t } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import '@/components/_templates/CustomTag.js';
import { state, Match } from '@/state';
import { getMatchHistory, getMatch, getTournament } from '@/services/matchService';
import { UserData } from '@/utils/playerUtils/types';


const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      margin: 0 auto;
      box-sizing: border-box;
      overflow: hidden; /* Prevent double scrollbars */
    }
    .matches-section {
      height: 90%;
      display: flex;
      flex-direction: column;
    }
    .matches-title {
      font-size: var(--title-font-size);
      font-weight: 600;
      margin-bottom: 0.5rem;
      letter-spacing: 0.01em;
      position: sticky;
      top: 0;
      z-index: 3;
      padding: 0.7em 0.5em;
      border-bottom: 1.5px solid var(--border);
      box-shadow: 0 2px 8px -6px rgba(0,0,0,0.12);
    }
    .timeline-outer {
      flex: 1 1 auto;
      height: 100%;
      overflow-y: auto;
      padding: 1.5rem 0;
      position: relative;
      /* Customize scrollbar color and size - Firefox */
      scrollbar-color: var(--accent-secondary, #b3b3b3) transparent;
      scrollbar-width: thin;
    }
    /* Customize scrollbar color and size - Chrome, Edge, Safari */
    .timeline-outer::-webkit-scrollbar {
      width: 8px;
      background: transparent;
    }
    .timeline-outer::-webkit-scrollbar-thumb {
      background: var(--accent-secondary, #b3b3b3);
      border-radius: 6px;
    }
    .timeline-outer::-webkit-scrollbar-thumb:hover {
      background: var(--accent, #888);
    }
    .timeline-outer::-webkit-scrollbar-track {
      background: transparent;
    }

    .timeline {
      position: relative;
      margin: 0 auto;
      width: 100%;
      max-width: 540px;
      padding-left: 32px;
      padding-right: 32px;
    }
    .timeline::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--border);
      transform: translateX(-50%);
      z-index: 0;
    }
    .timeline-event {
      display: flex;
      align-items: flex-start;
      margin-bottom: 2.5rem;
      position: relative;
      z-index: 1;
    }
    .timeline-event:last-child {
      margin-bottom: 0;
    }
    .timeline-dot {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 18px;
      height: 18px;
      background: var(--accent);
      border: 3px solid var(--border);
      border-radius: 50%;
      z-index: 2;
      top: 0.2em;
      cursor: pointer;
      box-shadow: 0 2px 8px -6px rgba(0,0,0,0.10);
    }
    .timeline-dot:hover {
      background: var(--accent-tertiary);
      border: 3px solid #fff;
    }
    .timeline-content {
      display: flex;
      width: 100%;
      justify-content: space-between;
      gap: 2.5rem;
    }
    .timeline-side {
      flex: 1 1 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
      padding-right: 2.5rem;
      min-width: 120px;
    }
    .timeline-side .date {
      font-size: 1.05rem;
      font-weight: 500;
      color: var(--text, #222);
    }
    .timeline-side .status {
      font-size: 0.95rem;
      font-weight: bold;
      margin-top: 0.2em;
      color: var(--accent-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .timeline-info {
      flex: 1 1 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
      padding-left: 2.5rem;
      min-width: 180px;
    }
    .timeline-info .score {
      font-size: 1.1rem;
      font-weight: bold;
      color: var(--text, #222);
    }
    .timeline-info .opponent {
      margin-top: 0.2em;
      font-size: 0.97rem;
      color: var(--text);
    }
    .timeline-info .meta {
      margin-top: 0.2em;
      font-size: 0.92rem;
      color: var(--accent-secondary, #888);
    }

    @media (max-width: 700px) {
      .timeline {
        max-width: 100%;
        padding-left: 8px;
        padding-right: 8px;
      }
      .timeline-side, .timeline-info {
        padding-left: 1rem;
        padding-right: 1rem;
      }
    }
  </style>

  <section class="matches-section">
    <div class="matches-title">${t('profile.matchesHistory')}</div>
    <div class="timeline-outer">
      <div class="timeline" id="timeline"></div>
    </div>
  </section>
`;

export class MatchesHistory extends HTMLElement {
  public matchObject: Match[] = [];
  private userData: UserData = { email: '', username: '', userId: 2000, avatar: '' };
 
  static get observedAttributes() {
    return ['userdata'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'userdata') {
      try {
        this.userData = JSON.parse(newValue);
      } catch {
        this.userData = { email: '', username: '', userId: 0, avatar: '' };
      }
    }
  }

  async connectedCallback() {
	console.log('UserData:', this.userData);
	await this.getMatches();
    this.renderTimeline(this.matchObject);
  }

  renderTimeline(matches: Match[]) {
    const timeline = this.shadowRoot?.getElementById('timeline');
    if (!timeline) return;
    timeline.innerHTML = matches.map(m => `
      <div class="timeline-event">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-side">
            <span class="date">${m.day} ${m.time}</span>
            <span class="status">Winner: ${m.winLoss.toUpperCase()}</span>
          </div>
          <div class="timeline-info">
            <span class="score">${m.scorePlayer1} vs ${m.scorePlayer2}</span>
            <span class="opponent"><custom-tag text="${m.player1} vs ${m.player2}" size="m" button></custom-tag></span>
            <span class="meta">${m.mode} ${m.tournId ? `&middot; #T${m.tournId}` : ''} &middot; #M${m.matchId}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  private async getMatches() {
	const rows = await getMatchHistory(this.userData.userId);
	console.log('UserId:', this.userData.userId);
	console.log('Rows:', rows);
	for (const row of rows) {

		const match = await getMatch(row.matchId);

		let mode;
		if (match.tournId) {
			const tourn =  await getTournament(match.tournId);
			switch (row.matchId) {
				case tourn.semiId1:
					mode = 'TOURNAMENT SEMIFINAL';
					break;
				case tourn.semiId2:
					mode = 'TOURNAMENT SEMIFINAL';
					break;
				case tourn.finalId:
					mode = 'TOURNAMENT FINAL';
					break;
				default:
					mode = 'TOURNAMENT QUARTERFINAL';
			}
		}
		else if (match.remoteId) {
			mode = 'REMOTE';
		}
		else
			mode = 'LOCAL';

		this.matchObject.push({
			day: match.date,
			time: match.time,
			scorePlayer1: match.scorep1,
			scorePlayer2: match.scorep2,
			matchId: row.matchId?.toString().padStart(3, "0"),
			tournId: match.tournId?.toString().padStart(2, "0"),
			player1: match.p1,
			player2: match.p2,
			winLoss: match.winner,
			mode: mode
		});

	};
  }
};

customElements.define('matches-history', MatchesHistory);

// TODO: this is a mock. Replace with real data fetching logic
const mockMatches = [
  {
    day: '2025-08-10',
    time: '15:30',
    score: '3-1',
    matchId: 'M001',
    opponent: 'PESTO SUPREME',
    winLoss: 'Win',
    mode: 'REMOTE'
  },
  {
    day: '2025-08-09',
    time: '18:00',
    score: '2-3',
    matchId: 'M002',
    opponent: 'WINE PLEASE',
    winLoss: 'Win',
    mode: 'TOURNAMENT'
  },
  {
    day: '2025-08-08',
    time: '12:45',
    score: '4-0',
    matchId: 'M003',
    opponent: 'SUPER PONG KILLER',
    winLoss: 'LOSS',
    mode: 'LOCAL'
  },
  {
    day: '2025-08-08',
    time: '12:45',
    score: '4-0',
    matchId: 'M003',
    opponent: 'SUPER PONG KILLER',
    winLoss: 'LOSS',
    mode: 'LOCAL'
  },
  {
    day: '2025-08-10',
    time: '15:30',
    score: '3-1',
    matchId: 'M001',
    opponent: 'PESTO SUPREME',
    winLoss: 'Win',
    mode: 'REMOTE'
  },
  {
    day: '2025-08-08',
    time: '12:45',
    score: '4-0',
    matchId: 'M003',
    opponent: 'SUPER PONG KILLER',
    winLoss: 'LOSS',
    mode: 'LOCAL'
  },
  // ...more mock data...
];