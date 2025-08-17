import { actionIcons } from '@/utils/Constants';

const colorMapping = {
  WIN: 'var(--success)',
  LOSS: 'var(--warning)',
  DEFAULT: 'var(--accent)',
};

/*
  Usage:
  <custom-tag text="Player 1"></custom-tag>
  <custom-tag text="Player 2" icon='...' closable></custom-tag>
  <custom-tag text="Clickable Tag" button></custom-tag>
  <custom-tag text="Winner" color="WIN"></custom-tag>
  <custom-tag text="Custom" color="#ff00ff"></custom-tag>
*/
const template = document.createElement('template');
template.innerHTML = `
  <style>
    .tournament__tag {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      background: var(--accent);
      border: 1px solid var(--border);
      padding: 0.18em 0.7em 0.18em 0.7em;
      font-size: 0.85em;
      cursor: pointer;
      color: var(--text);
      margin-bottom: 0.1em;
      transition: background 0.2s, color 0.2s;
      font-weight: 500;
      outline: none;
      min-width: 0;
      user-select: none;
    }
    .tournament__tag.size-m {
      font-size: 1.1em;
      padding: 0.32em 1em 0.32em 1em;
    }
    .tournament__tag[role="button"]:focus {
      box-shadow: 0 0 0 2px var(--accent-secondary);
    }
    .tournament__tag-remove {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.3em 0.3em;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tournament__tag-remove:hover {
      background: color-mix(in srgb, var(--hover), transparent 50%);
      border-radius: 50%;
    }
    .tournament__tag img,
    .tournament__tag-remove span img {
      width: 1rem;
      height: 1rem;
      display: block;
      filter: invert(var(--invert));
    }
    .tournament__tag.size-m img,
    .tournament__tag.size-m .tournament__tag-remove span img {
      width: 1.3rem;
      height: 1.3rem;
    }
    .tournament__tag[role="button"]:hover {
      background: var(--accent-secondary);
      color: var(--body);
      transition: background 0.2s, color 0.2s;
    }
    .tournament__tag-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5em;
      flex: 1;
      text-align: center;
    }
  </style>

  <span class="tournament__tag" tabindex="0">
    <span class="tournament__tag-content">
      <span class="tag-icon"></span>
      <span class="tag-text"></span>
    </span>
    <button class="tournament__tag-remove" title="Remove" style="display:none;">
      <span class="tag-close"></span>
    </button>
  </span>
`;

export class CustomTag extends HTMLElement {
  static get observedAttributes() {
    return ['text', 'icon', 'closable', 'button', 'size', 'color'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.render();
    this.setupEvents();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const text = this.getAttribute('text') || '';
    const icon = this.getAttribute('icon') || '';
    const closable = this.hasAttribute('closable');
    const button = this.hasAttribute('button');
    const size = this.getAttribute('size') || 's';
    const colorAttr = this.getAttribute('color');
    let bgColor = colorMapping.DEFAULT;

    if (colorAttr) {
      if (colorMapping[colorAttr.toUpperCase()]) {
        bgColor = colorMapping[colorAttr.toUpperCase()];
      } else {
        bgColor = colorAttr;
      }
    }

    const tag = this.shadowRoot.querySelector('.tournament__tag') as HTMLSpanElement;
    const tagText = this.shadowRoot.querySelector('.tag-text') as HTMLSpanElement;
    const tagIcon = this.shadowRoot.querySelector('.tag-icon') as HTMLSpanElement;
    const closeBtn = this.shadowRoot.querySelector('.tournament__tag-remove') as HTMLButtonElement;
    const closeIcon = this.shadowRoot.querySelector('.tag-close') as HTMLSpanElement;

    tagText.textContent = text;
    tagIcon.innerHTML = icon;
    closeBtn.style.display = closable ? '' : 'none';
    closeIcon.innerHTML = actionIcons.close; // Always use actionIcons.close

    // Size
    tag.classList.toggle('size-m', size === 'm');

    // Color
    tag.style.background = bgColor;

    // Accessibility and button-like behavior
    if (button) {
      tag.setAttribute('role', 'button');
      tag.setAttribute('tabindex', '0');
      tag.style.cursor = 'pointer';
    } else {
      tag.removeAttribute('role');
      tag.setAttribute('tabindex', '-1');
      tag.style.cursor = 'default';
    }
  }

  setupEvents() {
    const tag = this.shadowRoot.querySelector('.tournament__tag') as HTMLSpanElement;
    const closeBtn = this.shadowRoot.querySelector('.tournament__tag-remove') as HTMLButtonElement;

    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    };

    tag.onclick = (e) => {
      if (this.hasAttribute('button')) {
        this.dispatchEvent(new CustomEvent('tag-click', { bubbles: true, composed: true }));
      }
    };

    tag.onkeydown = (e: KeyboardEvent) => {
      if (this.hasAttribute('button') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('tag-click', { bubbles: true, composed: true }));
      }
    };
  }
}

customElements.define('custom-tag', CustomTag);
