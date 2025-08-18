import { NotificationPayload, NotificationAction, notificationService } from "@/services/notificationService";
import { mapNotification, getWelcomeNotification } from "@/utils/Notifications.js";
import { t } from "@/locales/Translations.js";
import { state } from "@/state";
import "./NotificationCard.js";

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      right: 0;
      bottom: 0;
      top: 0;
      pointer-events: auto;
      z-index: 4000;
      background: none !important;
      box-shadow: none !important;
      display: block;
    }
    .notifications-stack {
      position: fixed;
      right: 0;
      bottom: 0;
      top: var(--topbar-height);
      width: var(--sidebar-width);
      max-width: 100vw;
      display: flex;
      gap: 0.25rem;
      flex-direction: column-reverse;
      pointer-events: auto;
      cursor: pointer;
      background: none;
    }
    .details-panel {
      position: fixed;
      top: var(--topbar-height);
      right: 0;
      width: var(--sidebar-width);
      max-width: 100vw;
      height: calc(100vh - var(--topbar-height));
      background: var(--video-transition-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: var(--text, #222);
      z-index: 4100;
      display: flex;
      flex-direction: column;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
      overflow: hidden;
      box-shadow: -2px 0 12px #0004;
      border-radius: 0;
      box-sizing: border-box;
    }
    .details-panel.open {
      opacity: 1;
      pointer-events: auto;
    }
    .details-header {
      padding: 1rem 1.2rem 0.5rem 1.2rem;
      font-size: 1.1rem;
      font-weight: bold;
      background: transparent;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .details-close {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #888;
      cursor: pointer;
      transition: color 0.2s;
    }
    .details-close:hover {
      color: #222;
    }
    .details-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.2rem;
      display: block;
      flex-direction: column;
      gap: 1rem;
    }
    .notif-tags {
      display: flex;
      gap: 0.3em;
      margin-bottom: 0.3em;
      flex-wrap: wrap;
      align-items: center;
    }
    .notif-tag {
      background: var(--accent);
      border: 1px solid var(--border);
      padding: 0.18em 0.7em 0.18em 0.7em;
      font-size: 0.85em;
      cursor: pointer;
      color: var(--text);
      margin-bottom: 0.1em;
      display: flex;
      align-items: center;
      gap: 0.3em;
      transition: background 0.2s, color 0.2s;
      font-weight: 500;
    }
    .notif-tag.selected {
      background: var(--hover);
      color: var(--text);
    }
    .notif-tag-count {
      background: var(--body);
      color: var(--text);
      border-radius: 50%;
      width: 1.3em;
      height: 1.3em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85em;
      margin-left: 0.3em;
      font-weight: bold;
    }
    .notif-divider {
      border: none;
      border-top: 1px solid var(--text);
      margin: 0.5em 0;
    }
    .removing {
      opacity: 0 !important;
      transform: translateY(-30px) scale(0.97) !important;
      transition: opacity 0.35s, transform 0.35s;
      pointer-events: none !important;
    }
    .move-up {
      transition: transform 0.35s;
    }
  </style>
  <div class="notifications-stack"></div>
  <div class="details-panel">
    <div class="details-header">
      <span class="details-title"></span>
      <button class="details-close" title="Close">&times;</button>
    </div>
    <div class="details-list"></div>
    <slot name="friends-list"></slot>
  </div>
`;

export class NotificationsBar extends HTMLElement {
  #all = [];
  #visible = [];
  #maxVisible = 4;
  #timer = null;
  #detailsOpen = false;
  #filterType = null;
  _notifListener;

  stack: HTMLElement;
  detailsPanel: HTMLElement;
  detailsList: HTMLElement;
  detailsClose: HTMLElement;
  detailsTitle: HTMLElement;

  username = state.userData?.username || 'GUEST';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.stack = this.shadowRoot.querySelector('.notifications-stack');
    this.detailsPanel = this.shadowRoot.querySelector('.details-panel');
    this.detailsList = this.shadowRoot.querySelector('.details-list');
    this.detailsClose = this.shadowRoot.querySelector('.details-close');
    this.detailsTitle = this.shadowRoot.querySelector('.details-title');
    if (this.detailsTitle) {
      this.detailsTitle.textContent = t("nav.notifications");
    }
    this.detailsClose.addEventListener('click', () => this.hideDetails());

    // show side bar details on notification click
    this.stack.addEventListener('click', (e) => {
      const target = e.target as Element;
      const notif = target.closest('notification-card');
      if (notif) this.showDetails();
    });

    // TODO: get username dynamically, here is a mock:
    const welcomeNotif = getWelcomeNotification(this.username);
    this.#all = [welcomeNotif];
    this.#visible = [welcomeNotif];
    this.renderDetails();
    this._showInitial();

    // listen for real-time notifications from notificationService
    this._notifListener = (payload) => {
      const notif = mapNotification(payload);
      if (notif) this.pushNotification(notif);
    }

    notificationService.listen(this._notifListener);
  }

  disconnectedCallback() {
    clearTimeout(this.#timer);
    // TODO SOCKET: remove listener from notificationService
  }

  pushNotification(notif) {
    this.#all.push(notif);
    // add new notification above welcome (at index 1)
    this.#visible.splice(1, 0, notif);
    if (this.#visible.length > this.#maxVisible) {
      this._fadeOldest();
    } else {
      this.renderNotifications();
    }
    this.renderDetails();
  }

  _showInitial() {
    // only show welcome at start
    // TODO: get username, this value is mocked for now
    this.#visible = [getWelcomeNotification(this.username)];
    this.renderNotifications();
    this._scheduleFade();
  }

  _fadeOldest() {
    // Fade out the oldest notification (topmost, never remove welcome)
    if (this.#visible.length <= 1) return;
    const toRemove = this.#visible[this.#visible.length - 1];
    const nodes = Array.from(this.stack.querySelectorAll('notification-card'));
    const idx = this.#visible.indexOf(toRemove);
    if (idx !== -1 && nodes[idx]) {
      nodes[idx].classList.add('removing');
      nodes[idx].addEventListener('transitionend', () => {
        this.#visible.splice(idx, 1);
        this.renderNotifications();
        this._scheduleFade();
      }, { once: true });
    } else {
      this.#visible.splice(this.#visible.length - 1, 1);
      this.renderNotifications();
      this._scheduleFade();
    }
  }

  _scheduleFade() {
    clearTimeout(this.#timer);
    if (this.#visible.length > 1 && !this.#detailsOpen) {
      this.#timer = setTimeout(() => this._fadeOldest(), 3000);
    }
  }

  renderNotifications() {
    this.stack.innerHTML = '';
    if (this.#detailsOpen) return;
    for (let i = 0; i < this.#visible.length; ++i) {
      const notif = this.#visible[i];
      const card = document.createElement('notification-card');
      card.setAttribute('title', notif.title);
      card.setAttribute('message', notif.message);
      if (notif.type) card.setAttribute('type', notif.type);
      if (notif.time) card.setAttribute('time', notif.time);
      if (notif.welcome) card.setAttribute('welcome', '');
      if (notif.action) card.setAttribute('action', JSON.stringify(notif.action));
      card.classList.add('notification');

      card.addEventListener('dismiss', (e) => {
        e.stopPropagation();
        this.removeNotificationWithStackAnimation(this.stack, card, notif, this.#visible, this.renderNotifications);
      });

      card.addEventListener('action', (e) => {
        e.stopPropagation();
        if (notif.actionFn) notif.actionFn();
      });

      this.stack.appendChild(card);
      if (!notif.welcome) setTimeout(() => card.classList.add('show'), 10 + i * 80);
      else card.classList.add('show');
    }
  }

  showDetails() {
    this.#detailsOpen = true;
    this.detailsPanel.classList.add('open');
    this.stack.innerHTML = '';
  }

  hideDetails() {
    this.#detailsOpen = false;
    this.detailsPanel.classList.remove('open');
    this.renderNotifications();
    this._scheduleFade();
  }

  removeNotificationWithStackAnimation(container: HTMLElement, el: HTMLElement, notif: NotificationPayload, arr: NotificationPayload[], rerenderFn: Function) {
    const cards = Array.from(container.children) as HTMLElement[];
    const idx = cards.indexOf(el);
    el.classList.add('removing');
    for (let i = idx + 1; i < cards.length; ++i) {
      cards[i].classList.add('move-up');
      cards[i].style.transform = 'translateY(-100%)';
    }
    el.addEventListener('transitionend', () => {
      const index = arr.indexOf(notif);
      if (index !== -1) arr.splice(index, 1);
      for (let i = idx + 1; i < cards.length; ++i) {
        cards[i].classList.remove('move-up');
        cards[i].style.transform = '';
      }
      rerenderFn.call(this);
    }, { once: true });
  }

  renderDetails() {
    this.detailsList.innerHTML = '';

    // --- FILTER TAGS ---
    const typeCounts = {};
    this.#all.forEach(n => {
      if (!n.type) return;
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'notif-tags';
    Object.entries(typeCounts).forEach(([type, count]) => {
      // Use already mapped title for the tag
      const tag = document.createElement('button');
      tag.className = 'notif-tag' + (this.#filterType === type ? ' selected' : '');
      // Find a notification of this type to get its title
      const sampleNotif = this.#all.find(n => n.type === type);
      tag.textContent = `${sampleNotif?.title || type} ${count}`;
      tag.addEventListener('click', () => {
        this.#filterType = this.#filterType === type ? null : type;
        this.renderDetails();
      });
      tagsDiv.appendChild(tag);
    });
    this.detailsList.appendChild(tagsDiv);

    // --- DIVIDER ---
    const divider = document.createElement('hr');
    divider.className = 'notif-divider';
    this.detailsList.appendChild(divider);

    // --- FILTERED NOTIFICATIONS ---
    let notifs = this.#all.slice().reverse();
    if (this.#filterType) {
      notifs = notifs.filter(n => n.type === this.#filterType);
    }

    notifs.forEach((notif) => {
      const card = document.createElement('notification-card');
      card.setAttribute('title', notif.title);
      card.setAttribute('message', notif.message);
      if (notif.type) card.setAttribute('type', notif.type);
      if (notif.time) card.setAttribute('time', notif.time);
      if (notif.welcome) card.setAttribute('welcome', '');
      if (notif.action) card.setAttribute('action', JSON.stringify(notif.action));
      card.classList.add('details-item');
      card.addEventListener('dismiss', (e) => {
        e.stopPropagation();
        this.removeNotificationWithStackAnimation(this.detailsList, card, notif, this.#all, this.renderDetails);
      });
      card.addEventListener('action', (e) => {
        e.stopPropagation();
        if (notif.actionFn) notif.actionFn();
      });
      this.detailsList.appendChild(card);
    });
  }
}

customElements.define('notifications-bar', NotificationsBar);