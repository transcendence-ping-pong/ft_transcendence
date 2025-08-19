import { state } from '@/state.js';
import emojiFlags from 'emoji-flags';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .select-locale {
      width: 100%;
      min-height: var(--select-height);
      min-width: var(--button-min-width);
      padding: var(--component-padding);
      cursor: pointer;
      background: var(--body);
      box-shadow: 0 2px 12px #0002;
      border: 0;
      border-radius: 0;
      font-size: var(--main-font-size);
      font-weight: bold;
      color: var(--text);
      text-align: center;
      border: 2px solid var(--border);
      box-shadow: var(--shadow-soft);
    }
    .select-locale:focus {
      background: var(--accent);
    }
    label {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>

  <label>
    <select class="select-locale" id="selectLanguages"></select>
  </label>
`;

const LANGUAGE_NAMES: Record<string, string> = {
  EN: 'English',
  GB: 'English',
  FR: 'Français',
  PT: 'Português',
  JP: '日本語'
};

export class LanguagesDropdown extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const select = this.shadowRoot?.getElementById('selectLanguages') as HTMLSelectElement;
    if (!select) return;

    select.innerHTML = '';
    state.availableLanguages.forEach(lang => {
      const flag = emojiFlags[lang]?.emoji || '';
      const name = LANGUAGE_NAMES[lang.toUpperCase()] || lang;
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = `${flag} ${name}`;
      select.appendChild(option);
    });
    select.value = state.language;

    select.addEventListener('change', (e) => {
      const newLang = (e.target as HTMLSelectElement).value;
      this.dispatchEvent(new CustomEvent('languagechange', {
        detail: { language: newLang },
        bubbles: true,
        composed: true
      }));
    });
  }
}

customElements.define('languages-dropdown', LanguagesDropdown);
