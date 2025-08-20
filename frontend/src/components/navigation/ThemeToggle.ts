import { state } from '@/state.js';

const BUTTON_HEIGHT_WITH_PADDING = 'calc(var(--toogle-height) + var(--component-padding))';
const BUTTON_WIDTH_WITH_PADDING = 'calc(var(--toogle-width) + var(--component-padding))';
const KNOB_SIZE_WITH_PADDING = 'calc(var(--toogle-knob-height) + var(--component-padding))';

// TODO: check light-dark() https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
// Tailwind utility classes do not work inside Shadow DOM by default
const template = document.createElement('template');
// :host style the outermost element from inside the shadow DOM, aka: <theme-toggle>
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
      width: ${BUTTON_WIDTH_WITH_PADDING};
      height: ${BUTTON_HEIGHT_WITH_PADDING};
      vertical-align: middle;
      box-shadow: var(--shadow-soft);
    }
    button {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--body);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      border: 2px solid var(--border);
      padding: var(--component-padding);
      position: relative;
      outline: none;
    }
    .knob {
      width: ${KNOB_SIZE_WITH_PADDING};
      height: ${KNOB_SIZE_WITH_PADDING};
      background: var(--accent-secondary);
      position: absolute;
      top: 50%;
      left: 0.2rem;
      transform: translateY(-50%);
      transition: left 0.2s, background 0.2s;
    }
    :host([data-theme="secondary"]) .knob {
      left: calc(100% - ${KNOB_SIZE_WITH_PADDING} - 0.2rem);
      background: var(--border);
    }
  </style>

  <button id="toggle" aria-pressed="false" title="Toggle theme">
    <span class="knob"></span>
  </button>
`;

export class ThemeToggle extends HTMLElement {
  private _onToggleClick?: (e: Event) => void;

  // JS will construct the element whenever an instance is created
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const btn = this.shadowRoot?.getElementById('toggle');
    this._onToggleClick = () => this.toggleTheme();
    btn?.addEventListener('click', this._onToggleClick);
    this._applyTheme();
  }

  disconnectedCallback() {
    const btn = this.shadowRoot?.getElementById('toggle');
    if (btn && this._onToggleClick) {
      btn.removeEventListener('click', this._onToggleClick);
    }
  }

  toggleTheme() {
    state.theme = state.theme === 'primary' ? 'secondary' : 'primary';
    this._applyTheme();
    this.dispatchEvent(new CustomEvent('themechange', { detail: { theme: state.theme } }));
  }

  private _applyTheme() {
    document.body.classList.toggle('theme-primary', state.theme === 'primary');
    document.body.classList.toggle('theme-secondary', state.theme === 'secondary');
    this.setAttribute('data-theme', state.theme);
  }
}

// define the custom html tag. It must have at least two strings separated by a dash
// goal: don't override builtin elements
// "hey JS, whenever you detect <theme-toggle> in the DOM, create an instance of ThemeToggle"
customElements.define('theme-toggle', ThemeToggle);
