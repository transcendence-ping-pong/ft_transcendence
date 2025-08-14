import { t } from '@/locales/Translations';
import { actionIcons } from '@/utils/Constants';
import '@/components/CustomTag.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .profile-form__section {
      margin-bottom: 2rem;
    }
    .profile-form__section-title {
      font-size: 1.2rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }

    .profile-form__checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      color: var(--text);
    }
    .profile-form__checkbox {
      width: 1.5rem;
      height: 1.5rem;
      background-color: var(--body);
      border: 2px solid var(--border);
      border-radius: 0;
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      cursor: pointer;
      position: relative;
      transition: box-shadow 0.2s;
    }
    .profile-form__checkbox:checked {
      background-color: var(--accent);
      border-color: var(--accent);
    }
    .profile-form__checkbox:checked::before,
    .profile-form__checkbox:checked::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 0.8rem;
      height: 2px;
      background: var(--text);
      border-radius: 1px;
      transform: translate(-50%, -50%) rotate(45deg);
      display: block;
    }
    .profile-form__checkbox:checked::after {
      transform: translate(-50%, -50%) rotate(-45deg);
    }
    .profile-form__checkbox:focus {
      box-shadow: 0 0 0 2px var(--accent-secondary);
    }

    .profile-form__table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    .profile-form__table th,
    .profile-form__table td {
      border: 1px solid var(--border);
      padding: 0.5em;
      text-align: left;
    }
    .profile-form__table th {
      background: var(--accent);
    }
    .actions {
      text-align: right;
    }
    button {
      padding: 0.7em 2em;
      font-size: 1rem;
      font-weight: bold;
    }
  </style>

  <h1>${t('profile.personalInfo')}</h1>
  <form id="profileForm" autocomplete="off">
    <div class="profile-form__section">
      <h2 class="profile-form__section-title">${t('profile.authentication')}</h2>
      <div class="profile-form__checkbox-label">
        <input id="enable2fa" name="enable2fa" class="profile-form__checkbox" type="checkbox" />
        <label>${t('profile.enable2FA')}</label>
      </div>
    </div>
    <div class="profile-form__section">
      <h2 class="profile-form__section-title">${t('profile.matchesHistory')}</h2>
      <table class="profile-form__table">
        <thead>
          <tr>
            <th>${t('profile.day')}</th>
            <th>${t('profile.time')}</th>
            <th>${t('profile.score')}</th>
            <th>${t('profile.matchId')}</th>
            <th>${t('profile.opponent')}</th>
            <th>${t('profile.mode')}</th>
            <th>${t('profile.winLoss')}</th>
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

  mockMatches = [
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
    }
  ];

  connectedCallback() {
    // fetch and render matches here
    this.renderMatches(this.mockMatches);
  }

  renderMatches(matches: Array<{ day: string, time: string, score: string, matchId: string, opponent: string, winLoss: string, mode: string }>) {
    const tbody = this.shadowRoot?.getElementById('matchesBody');
    if (!tbody) return;
    tbody.innerHTML = matches.map(m => `
      <tr>
        <td>${m.day}</td>
        <td>${m.time}</td>
        <td>${m.score}</td>
        <td>${m.matchId}</td>
        <td><custom-tag text="${m.opponent}" size="s" button></custom-tag></td>
        <td>${m.mode}</td>
        <td><custom-tag text="${m.winLoss.toUpperCase()}" size="s" color="${m.winLoss}"></custom-tag></td>
      </tr>
    `).join('');
  }
};

customElements.define('user-profile-form', UserProfileForm);

/*
 <div class="section">
      <div class="section-title">${t('profile.personalInfo')}</div>
      <input id="username" name="username" type="text" required autocomplete="username" placeholder="${t('auth.username')}" />
      <input id="email" name="email" type="email" required autocomplete="email" placeholder="${t('auth.email')}" />
      <input id="password" name="password" type="password" minlength="7" required autocomplete="current-password" placeholder="${t('auth.password')}" />
    </div>
*/
