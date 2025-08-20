import { t } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import '@/components/_templates/CustomTag.js';
import { state, Match } from '@/state';
import { getMatchHistory, getMatch, getTournament, getMatchStats } from '@/services/matchService';
import { UserData } from '@/utils/playerUtils/types';
import '@/components/navigation/StartGameButton.js';


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

    .no-matches__wrapper--visible {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      background: var(--placeholder-bg);
    }
    .no-matches__button {
      display: flex;
      align-items: center;
      justify-content: center;
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
      <div class="no-matches__wrapper" id="no-matches">
        <h3 class="no-matches__description">${t('profile.noMatches')}</h3>
        <start-game-button class="no-matches__button"></start-game-button>
      </div>
    </div>
  </section>
`;

export class MatchesHistory extends HTMLElement {
  public matchObject: Match[] = [];
  private userData: UserData = { email: '', username: '', userId: 2000, avatar: '' };
  private timeline: HTMLElement | null = null;
  private noMatchesWrapper: HTMLElement | null = null;

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
    this.timeline = this.shadowRoot?.getElementById('timeline');
    this.noMatchesWrapper = this.shadowRoot?.getElementById('no-matches');

    if (!this.timeline) return;

    await this.getMatches();
    if (this.matchObject.length === 0) {
      this.noMatchesWrapper!.classList.add('no-matches__wrapper--visible');
      return;
    }

    this.noMatchesWrapper!.classList.remove('no-matches__wrapper--visible');
    this.noMatchesWrapper!.style.display = 'none';
    this.renderTimeline(this.matchObject);
  }

  renderTimeline(matches: Match[]) {
    this.timeline.innerHTML = matches.map(m => `
      <div class="timeline-event">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-side">
            <span class="date">${m.day} ${m.time}</span>
            <span class="status">${t('profile.winner')}: ${m.winLoss?.toUpperCase()}</span>
          </div>
          <div class="timeline-info">
            <span class="score">${m.scorePlayer1 ? `${m.scorePlayer1}` : '---'} vs ${m.scorePlayer2 ? `${m.scorePlayer2}` : '---'}</span>
            <span class="opponent"><custom-tag text="${m.player1} vs ${m.player2}" size="m" button></custom-tag></span>
            <span class="meta">${m.mode} ${m.tournId ? `&middot; #T${m.tournId}` : ''} &middot; #M${m.matchId}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  private async getMatches() {
    const rows = await getMatchHistory(this.userData.userId);
    for (const row of rows) {

      const match = await getMatch(row.matchId);

      let mode;
      if (match.tournId) {
        const tourn = await getTournament(match.tournId);
        switch (row.matchId) {
          case tourn.semiId1:
            mode = `${t('profile.semifinal').toUpperCase()}`;
            break;
          case tourn.semiId2:
            mode = `${t('profile.semifinal').toUpperCase()}`;
            break;
          case tourn.finalId:
            mode = `${t('profile.final').toUpperCase()}`;
            break;
          default:
            mode = `${t('profile.quarterfinal').toUpperCase()}`;
        }
      }
      else if (match.remoteId) {
        mode = `${t('game.mode2').toUpperCase()}`;
      }
      else
        mode = `${t('game.mode1').toUpperCase()}`;

      this.matchObject.push({
        day: match.date,
        time: match.time,
        scorePlayer1: match.scorep1?.toString(),
        scorePlayer2: match.scorep2?.toString(),
        matchId: row.matchId?.toString().padStart(3, "0"),
        tournId: match.tournId?.toString().padStart(2, "0"),
        player1: match.p1,
        player2: match.p2,
        winLoss: (match.winner ? match.winner : '---'),
        mode: mode
      });

    };
  }
};

customElements.define('matches-history', MatchesHistory);
