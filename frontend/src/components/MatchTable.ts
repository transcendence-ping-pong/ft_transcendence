import { t } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import '@/components/CustomTag.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .matches-section {
      height: 100%;
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
      background: var(--body, #fff);
      border-bottom: 1.5px solid var(--border, #e0e0e0);
      box-shadow: 0 2px 8px -6px rgba(0,0,0,0.12);
    }
    .timeline-outer {
      flex: 1 1 auto;
      height: 100%;
      overflow-y: auto;
      padding: 1.5rem 0;
      position: relative;
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
      background: var(--border, #e0e0e0);
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
      background: var(--accent, #f4f4f4);
      border: 3px solid var(--border, #e0e0e0);
      border-radius: 50%;
      z-index: 2;
      top: 0.2em;
      box-shadow: 0 2px 8px -6px rgba(0,0,0,0.10);
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
      color: var(--accent-secondary, #888);
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
      color: var(--text, #444);
    }
    .timeline-info .meta {
      margin-top: 0.2em;
      font-size: 0.92rem;
      color: var(--accent-secondary, #888);
    }
    /* Responsive */
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

  <div class="matches-section">
    <div class="matches-title">${t('profile.matchesHistory')}</div>
    <div class="timeline-outer">
      <div class="timeline" id="timeline"></div>
    </div>
  </div>
`;

export class MatchTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.renderTimeline(mockMatches);
  }

  renderTimeline(matches: Array<{ day: string, time: string, score: string, matchId: string, opponent: string, winLoss: string, mode: string }>) {
    const timeline = this.shadowRoot?.getElementById('timeline');
    if (!timeline) return;
    timeline.innerHTML = matches.map(m => `
      <div class="timeline-event">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-side">
            <span class="date">${m.day} ${m.time}</span>
            <span class="status">${m.winLoss.toUpperCase()}</span>
          </div>
          <div class="timeline-info">
            <span class="score">${m.score}</span>
            <span class="opponent"><custom-tag text="${m.opponent}" size="s" button></custom-tag></span>
            <span class="meta">${m.mode} &middot; #${m.matchId}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
};

customElements.define('match-table', MatchTable);

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
  // ...more mock data...
];