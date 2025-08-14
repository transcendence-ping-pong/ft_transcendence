import { t } from '@/locales/Translations';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .section { margin-bottom: 2rem; }
    .section-title { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
    .matches-table { width: 100%; border-collapse: collapse; }
    .matches-table th, .matches-table td { border: 1px solid #ccc; padding: 0.5em; text-align: left; }
    .matches-table th { background: #f5f5f5; }
    .actions { text-align: right; }
    button { padding: 0.7em 2em; font-size: 1rem; font-weight: bold; }
  </style>
  <form id="profileForm" autocomplete="off">
    <div class="section">
      <div class="section-title">${t('profile.personalInfo')}</div>
      <input id="username" name="username" type="text" required autocomplete="username" placeholder="${t('auth.username')}" />
      <input id="email" name="email" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
      <input id="password" name="password" type="password" minlength=7 required autocomplete="current-password" placeholder="${t('auth.password')}" />
    </div>
    <div class="section">
      <div class="section-title">${t('profile.authentication')}</div>
      <label>
        <input id="enable2fa" name="enable2fa" type="checkbox" />
        ${t('profile.enable2fa')}
      </label>
    </div>
    <div class="section">
      <div class="section-title">${t('profile.matchesHistory')}</div>
      <table class="matches-table">
        <thead>
          <tr>
            <th>${t('profile.day')}</th>
            <th>${t('profile.time')}</th>
            <th>${t('profile.score')}</th>
            <th>${t('profile.tournamentId')}</th>
            <th>${t('profile.opponent')}</th>
            <th>${t('profile.opponentScore')}</th>
          </tr>
        </thead>
        <tbody id="matchesBody">
          <!-- Matches will be rendered here -->
        </tbody>
      </table>
    </div>
    <div class="actions">
      <button type="submit">${t('profile.save')}</button>
    </div>
  </form>
`;

export class UserProfileForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  const mockMatches = [
    {
      day: '2025-08-10',
      time: '15:30',
      score: '3-1',
      tournamentId: 'T001',
      opponent: 'Alice',
      opponentScore: '1'
    },
    {
      day: '2025-08-09',
      time: '18:00',
      score: '2-3',
      tournamentId: 'T002',
      opponent: 'Bob',
      opponentScore: '3'
    },
    {
      day: '2025-08-08',
      time: '12:45',
      score: '4-0',
      tournamentId: 'T003',
      opponent: 'Charlie',
      opponentScore: '0'
    }
  ];

  connectedCallback() {
    // fetch and render matches here
    // Example: this.renderMatches([{ day: '2025-08-11', time: '14:00', score: '3-2', tournamentId: 'T123', opponent: 'Alice', opponentScore: '2' }]);
    this.renderMatches(this.mockMatches);
  }

  renderMatches(matches: Array<{ day: string, time: string, score: string, tournamentId: string, opponent: string, opponentScore: string }>) {
    const tbody = this.shadowRoot?.getElementById('matchesBody');
    if (!tbody) return;
    tbody.innerHTML = matches.map(m => `
      <tr>
        <td>${m.day}</td>
        <td>${m.time}</td>
        <td>${m.score}</td>
        <td>${m.tournamentId}</td>
        <td>${m.opponent}</td>
        <td>${m.opponentScore}</td>
      </tr>
    `).join('');
  }
};

customElements.define('user-profile-form', UserProfileForm);