const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      max-width: var(--auth-form-max-width, 400px);
      margin: 0 auto;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    }
    .auth-form__header {
      text-align: center;
      font-size: var(--title-modal-font-size);
      font-weight: bold;
      margin: 0;
      padding: 0;
    }
    hr {
      border: none;
      border-top: 1.5px solid var(--border);
    }
    .auth-form__content {
      width: 100%;
    }
    .auth-form__error {
      min-height: 1.25rem;
      color: var(--warning);
      font-size: var(--secondary-font-size);
      text-align: start;
    }
    .auth-form__footer {
      margin-top: 1rem;
      text-align: center;
      font-size: var(--main-font-size);
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
  </style>

  <div class="auth-form">
    <div class="auth-form__header">
      <slot name="header"></slot>
      <hr/>
    </div>
    <div class="auth-form__content">
      <slot name="content"></slot>
    </div>
    <div class="auth-form__error" id="error">
      <slot name="error"></slot>
    </div>
    <div class="auth-form__footer">
      <slot name="footer"></slot>
    </div>
  </div>
`;

/*
  * AuthFormLayout is a custom element that provides a reusable layout for authentication forms.
  * It includes slots for header, content, error messages, and footer.
  * The component can be used to create consistent authentication forms across the application.
  * It also provides methods to set and clear error messages.
*/
export class AuthFormLayout extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  setError(message: string) {
    const errorSlot = this.shadowRoot?.getElementById('error');
    if (errorSlot) errorSlot.textContent = message;
  }

  /*
    * Clears the error message and executes an optional callback.
    * @param {Function} onClear - Optional callback to execute after clearing the error.
    * This can be used to remove error styles from input fields or perform other actions.
    * Example usage:
    * clearError(() => {
    *   this.shadowRoot.getElementById('email')?.classList.remove('input-error');
    *   this.shadowRoot.getElementById('password')?.classList.remove('input-error');
    * });
  */
  clearError(onClear?: () => void) {
    this.setError('');
    onClear?.();
  }
}
customElements.define('auth-form-layout', AuthFormLayout);