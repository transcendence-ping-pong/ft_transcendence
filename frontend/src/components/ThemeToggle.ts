// TODO: check light-dark() https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
// Tailwind utility classes do not work inside Shadow DOM by default
const template = document.createElement('template');
// :host style the outermost element from inside the shadow DOM, aka: <theme-toggle>
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
      width: 56px;
      height: 32px;
      vertical-align: middle;
    }
    button {
      width: 100%;
      height: 100%;
      border-width: 2px;
      display: flex;
      align-items: center;
      background: var(--body);
      border-color: var(--border);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      padding: 0;
      position: relative;
      outline: none;
    }
    .knob {
      width: 24px;
      height: 24px;
      background: var(--accent);
      position: absolute;
      top: 2px;
      left: 2px;
      transition: left 0.2s, background 0.2s;
      box-shadow: 0 1px 4px #0002;
    }
    :host([data-theme="secondary"]) .knob {
      left: 30px;
      background: var(--border);
    }
    .track {
      width: 100%;
      height: 100%;
      background: var(--accent);
      opacity: 0.15;
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      transition: background 0.2s;
    }
  </style>

  <button id="toggle" aria-pressed="false" title="Toggle theme">
    <span class="track"></span>
    <span class="knob"></span>
  </button>
`;

import { state } from '@/state.js';

export class ThemeToggle extends HTMLElement {
  // JS will construct the element whenever an instance is created
  constructor() {
    super(); // execute the base parent class constructor first
    const shadow = this.attachShadow({ mode: 'open' });
    // append child to shadow DOM tree, not light DOM
    shadow.appendChild(template.content.cloneNode(true));
  }

  // custom element added to the DOM, it is mounted here
  // opposite would be disconnectedCallback()
  connectedCallback() {
    const btn = this.shadowRoot?.getElementById('toggle');
    btn?.addEventListener('click', () => this.toggleTheme());
    this._applyTheme();
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
