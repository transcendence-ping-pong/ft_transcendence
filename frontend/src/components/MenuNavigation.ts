import { state } from '@/state.js';
import { t } from '@/locales/Translations.js'
import emojiFlags from 'emoji-flags';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    nav {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
      margin: 1.5rem 0;
    }
    .menu-item {
      flex: 1;
      text-align: center;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      background: var(--accent);
      color: var(--body);
      font-size: 1.15rem;
      font-weight: 600;
      cursor: pointer;
      transition:
        background 0.2s,
        color 0.2s, 
        border-color 0.2s, 
        transform 0.18s cubic-bezier(.4,2,.6,1), 
        box-shadow 0.18s;
      box-shadow: 0 2px 8px #0002;
      margin: 0;
      outline: none;
      display: block;
    }
    .menu-item:hover, .menu-item:focus {
      transform: scale(1.08);
      background: var(--border);
      color: var(--body);
      box-shadow: 0 4px 16px #0004;
    }
    .menu-logout {
      background: var(--border);
      border-color: transparent;
      color: var(--body);
      font-weight: bold;
    }
    .menu-logout:hover, .menu-logout:focus {
      background: var(--warning);
      color: var(--body);
      box-shadow: 0 4px 16px #ff4f4f44;
    }
    label {
      font-size: 0.9rem;
      color: var(--border);
      margin-top: 1.2rem;
    }
    select {
      margin-left: 0.5rem;
      font-size: 1rem;
      border-radius: 0;
      background: var(--body);
      color: var(--border);
      outline: none;
    }
    select:focus {
      border-color: var(--border);
    }
  </style>

  <nav>
    <a href="/" id="home" class="menu-item"></a>
    <a href="/game" id="game" class="menu-item"></a>
    <button id="logout" class="menu-item menu-logout"></button>
    <label>
      <span id="labelText"></span>
      <select id="selectLanguages"></select>
      <img src="logo" alt="Description">
    </label>
  </nav>
`;

export class MenuNavigation extends HTMLElement {
  languages: string[] = [];

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const homeAnchor = this.shadowRoot?.getElementById('home') as HTMLAnchorElement;
    const gameAnchor = this.shadowRoot?.getElementById('game') as HTMLAnchorElement;
    const button = this.shadowRoot?.getElementById('logout') as HTMLButtonElement;
    const label = this.shadowRoot?.getElementById('labelText') as HTMLLabelElement;
    const selectLanguages = this.shadowRoot?.getElementById('selectLanguages') as HTMLSelectElement;

    if (homeAnchor) homeAnchor.textContent = t('nav.home');
    if (gameAnchor) gameAnchor.textContent = t('nav.game');
    if (button) button.textContent = t('auth.logout');
    if (label) label.textContent = t('nav.languages');

    // populate select array of languages
    this.languages = state.availableLanguages;

    if (selectLanguages) {
      selectLanguages.innerHTML = '';
      this.languages.forEach((lang: string) => {
        const flag = emojiFlags[lang]?.emoji || '';
        const country = emojiFlags[lang]?.name || lang.toUpperCase();
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = `${country} ${flag}`;
        selectLanguages.appendChild(option);
      });
      selectLanguages.value = state.language;

      // listen for language change
      selectLanguages.addEventListener('change', async (e) => {
        const newLang = (e.target as HTMLSelectElement).value;
        this.dispatchEvent(new CustomEvent('languagechange', {
          detail: { language: newLang },
          bubbles: true,
          composed: true
        }));
      });
    }
  }
}

customElements.define('menu-navigation', MenuNavigation);