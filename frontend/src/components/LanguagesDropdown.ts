import { state } from '@/state.js';
import { t } from '@/locales/Translations.js'
import emojiFlags from 'emoji-flags';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    label {
      display: flex;
      gap: 1rem;
      align-items: center;
      font-size: 1em;
      color: var(--text-color);
    }
    select {
      width: 100%;
      padding: 0.5em;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      background-color: var(--background-color);
      color: var(--text-color);
    }

    // select:focus {
    //   outline: none;
    //   border-color: var(--accent-color);
    // }
  </style>

  <label>
    <span id="labelText"></span>
    <select id="selectLanguages"></select>
  </label>
`;

export class LanguagesDropdown extends HTMLElement {
  languages: string[] = [];

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const label = this.shadowRoot?.getElementById('labelText') as HTMLLabelElement;
    const selectLanguages = this.shadowRoot?.getElementById('selectLanguages') as HTMLSelectElement;

    // if (label) label.textContent = t('nav.languages');
    // populate select array of languages
    this.languages = state.availableLanguages;

    // TODO FIX: improve this. It is messy and a bit redundant
    if (selectLanguages) {
      selectLanguages.innerHTML = '';
      this.languages.forEach((lang: string) => {
        const flag = emojiFlags[lang]?.emoji || '';
        const option = document.createElement('option');
        option.value = lang;
        const language = lang.toUpperCase() === 'GB' ? 'EN' : lang.toUpperCase();

        option.textContent = `${language} ${flag}`;
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

customElements.define('languages-dropdown', LanguagesDropdown);
