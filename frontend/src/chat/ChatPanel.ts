import { websocketService as wss } from '@/services/websocketService.js';
import { state } from '../state.js';
import { actionIcons } from '@/utils/Constants.js';
import { t } from '@/locales/Translations.js'
import { getUserProfile, postAddFriend, patchAcceptFriend, deleteFriend, getFriends, getReceivedRequests, getSentRequests } from '@/services/friendsService.js';

export default class ChatPanel extends HTMLElement {
  private panel: HTMLDivElement;
  private header: HTMLDivElement;
  private closeButton: HTMLButtonElement;
  private content: HTMLDivElement;

  private isVisible: boolean = false;
  private requestedOnlineUsers: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private messageHistory: Array<{ sender: string, message: string, type: 'user' | 'system' | 'other', category: 'global' | 'direct', timestamp: number }> = [];
  private isLoadingMessages: boolean = false;
  private currentUsername: string = '';
  private lastInvite: any = null;
  private hasRenderedHistory: boolean = false;
  private shownSystemMessages: Set<string> = new Set();
  private lastSystemMessageKey: string = '';
  private lastSystemMessageAt: number = 0;
  private _lastUserMessageKey: string = '';
  private _lastUserMessageAt: number = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.setupStyles();
    this.createPanel();
    this.setupEventListeners();

    this.initializeWebSocket();

    this.observeVisibility();
  }

  // load messages when chat becomes visible
  private observeVisibility() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'visible') {
          if (this.hasAttribute('visible')) {
            // chat opened - render history once without duplicating
            if (!this.hasRenderedHistory) {
              this.renderHistoryOnce();
              this.hasRenderedHistory = true;
            }
            // on open: pick up any pending system messages added while closed
            try {
              const saved = localStorage.getItem('chatMessages');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > this.messageHistory.length) {
                  // render only the new tail
                  const newOnes = parsed.slice(this.messageHistory.length);
                  this.loadSavedMessagesToUI(newOnes);
                  this.messageHistory = parsed;
                }
              }
            } catch { }
          }
        }
      });
    });

    observer.observe(this, { attributes: true });
  }

  // init WebSocket connection
  private initializeWebSocket() {
    try {
      const websocketService = (window as any).websocketService;

      if (websocketService) {
        // check if already connected
        if (websocketService.isConnected()) {
          this.updateConnectionStatus('Connected', 'rgba(0,255,0,0.7)');
          this.setupWebSocketListeners();
          this.authenticateUser();
        } else {
          this.updateConnectionStatus('Connecting...', 'rgba(255,255,0,0.7)');
          window.addEventListener('websocketConnected', () => {
            this.updateConnectionStatus('Connected', 'rgba(0,255,0,0.7)');
            this.setupWebSocketListeners();
            this.authenticateUser();
          });
        }

        window.addEventListener('websocketConnected', () => {
          this.updateConnectionStatus('Connected', 'rgba(0,255,0,0.7)');
        }, { once: true });

        window.addEventListener('websocketDisconnected', () => {
          this.updateConnectionStatus('Disconnected', 'rgba(255,255,0,0.7)');
          this.addMessage('', '⚠️ WebSocket disconnected. Trying to reconnect...', 'system', 'global');
          this.attemptReconnection();
        }, { once: true });

        window.addEventListener('websocketError', () => {
          this.updateConnectionStatus('Error', 'rgba(255,0,0,0.7)');
          this.addMessage('', '⚠️ WebSocket connection error. Check your connection.', 'system', 'global');
        }, { once: true });
      } else {
        console.error('WebSocket service not available');
        this.updateConnectionStatus('Service not found', 'rgba(255,0,0,0.7)');
        this.addMessage('', '⚠️ WebSocket service not available. Please refresh the page.', 'system', 'global');
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.updateConnectionStatus('Init failed', 'rgba(255,0,0,0.7)');
      this.addMessage('', '⚠️ Failed to initialize WebSocket connection.', 'system', 'global');
    }
  }

  private authenticateUser() {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        const usernameFromState = state.userData?.username || localStorage.getItem('loggedInUser') || '';
        if (!usernameFromState || usernameFromState === 'Anonymous') {
          return;
        }
        websocketService.authenticate(usernameFromState);

        window.addEventListener('websocketAuthenticated', (event: CustomEvent) => {
          const { success, username } = event.detail as any;
          if (success) {
            this.updateConnectionStatus('Authenticated', 'rgba(0,255,0,0.7)');
            if (username) {
              try {
                this.currentUsername = username;
                localStorage.setItem('loggedInUser', username);
              } catch { }
            }
          } else {
            this.updateConnectionStatus('Auth failed', 'rgba(255,0,0,0.7)');
          }
        }, { once: true });
      }
    } catch (error) {
      console.error('Failed to authenticate user:', error);
    }
  }

  connectedCallback() {
    window.addEventListener('login-success', (e: any) => {
      try {
        const websocketService = (window as any).websocketService;
        if (!websocketService || !websocketService.isConnected()) return;
        const username = e?.detail?.username || state.userData?.username || localStorage.getItem('loggedInUser');
        if (!username || username === 'Anonymous') return;
        websocketService.authenticate(username);
        this.currentUsername = username;
        localStorage.setItem('loggedInUser', username);
      } catch { }
    }, { once: true });
  }

  // setup WebSocket event listeners
  private setupWebSocketListeners() {
    const websocketService = (window as any).websocketService;
    if (!websocketService || !websocketService.socket || (this as any)._wsHandlersAttached) {
      return;
    }
    // prevent duplicate handler registration across open/close cycles
    (this as any)._wsHandlersAttached = true;

    websocketService.socket.on('chatMessage', (data: any) => {
      if (data && data.type === 'global' && data.senderUsername && data.message) {
        this.addMessage(data.senderUsername, data.message, 'other', 'global', undefined, undefined, data.timestamp);
      }
    });

    websocketService.socket.on('directMessage', (data: any) => {
      if (data && data.type === 'direct' && data.senderUsername && data.message) {
        this.addMessage(data.senderUsername, data.message, 'other', 'direct', data.receiverUsername);
      }
    });

    websocketService.socket.on('onlineUsers', (data: any) => {
      this.handleOnlineUsersUpdate(data);
    });

    websocketService.socket.on('chatError', (data: any) => {
      const errorMessage = data.message || 'Unknown error';

      if (errorMessage.includes('timed out') || errorMessage.includes('spam')) {
        this.handleTimeoutError(errorMessage);
      } else {
        this.addMessage('', `Error: ${errorMessage}`, 'system', 'global');
      }
    });

    const onGameInvite = (e: any) => {
      const data = e.detail;
      if (data && data.type === 'invite' && data.senderUsername && data.message) {
        this.lastInvite = data;
        this.addMessage(data.senderUsername, data.message, 'other', 'direct', data.receiverUsername, data);
      }
    };
    window.addEventListener('gameInvite', onGameInvite);

    const onTournMatch = (e: CustomEvent) => {
      const matches = e.detail.matches;
      const current = matches[state.tournamentData.currentMatchIndex];
      if (current && current.player1 && current.player2) {
        this.addMessage('', t("game.nextMatch", { players: `${current.player1} ${t("game.and")} ${current.player2}` }), 'system', 'global');
      }
    };
    window.addEventListener('tournament-stage', onTournMatch);

    const onInviteSent = (e: any) => {
      const data = e.detail || {};
      if (data && data.targetUsername) {
        this.addMessage('', `✅ Invite sent to ${data.targetUsername}`, 'system', 'global');
      }
    };
    window.addEventListener('inviteSent', onInviteSent);

    websocketService.socket.on('inviteAccepted', (_data: any) => {
      // disabled
    });

    websocketService.socket.on('inviteDeclined', (data: any) => {
      this.addMessage('', data.message, 'system', 'global');
    });

    // room created
    const onRoomCreated = () => {
      this.addMessage('', '🎮 Game room created!', 'system', 'global');
    };
    window.addEventListener('roomCreated', onRoomCreated);

    // navigate to game on server instruction (both host/guest)
    window.addEventListener('navigateToGame', (e: any) => {
      const data = e.detail;
      try { localStorage.setItem('inviteRoom', JSON.stringify({ room: data.room, isHost: data.role === 'host' })); } catch { }
      try { localStorage.setItem('inviteRoomId', data.room?.id || data.roomId || ''); } catch { }
      try { localStorage.setItem('openRemoteUI', '1'); } catch { }
      // close chat if open
      try {
        const panel = document.querySelector('chat-panel');
        if (panel && panel.hasAttribute('visible')) {
          panel.removeAttribute('visible');
        }
      } catch { }
      try {
        window.history.pushState({}, '', '/game');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch { }
    });

    // fallback: accept/decline using lastInvite from localStorage if present
    window.addEventListener('login-success', () => {
      try {
        const raw = localStorage.getItem('lastInvite');
        if (raw) this.lastInvite = JSON.parse(raw);
      } catch { }
    });
  }

  // handle online users updates
  private handleOnlineUsersUpdate(data: any) {
    if (this.requestedOnlineUsers) {
      if (data && Array.isArray(data)) {
        const currentUsername = this.getCurrentUsername();
        const otherUsers = data.filter((user: any) => user.username !== currentUsername);

        if (otherUsers.length === 0) {
          this.addMessage('', 'No other users online', 'system', 'global');
        } else {
          const userList = data.map((user: any) => {
            const isCurrentUser = user.username === currentUsername;
            return isCurrentUser ? `${user.username} (You)` : user.username;
          }).join(', ');

          this.addMessage('', `Online: ${userList}`, 'system', 'global');
        }
      } else {
        this.addMessage('', 'Failed to get online users', 'system', 'global');
      }
      this.requestedOnlineUsers = false;
    }
  }

  private handleUserStatusUpdate(data: any) {
    if (data.type === 'joined' && data.username) {
      this.addMessage('', `${data.username} joined the chat`, 'system', 'global');
    } else if (data.type === 'left' && data.username) {
      this.addMessage('', `${data.username} left the chat`, 'system', 'global');
    }
  }

  private handleTimeoutError(errorMessage: string) {
    this.addMessage('', `⚠️ ${errorMessage}`, 'system', 'global');

    const input = this.shadowRoot?.querySelector('.chat-input') as HTMLInputElement;
    const sendButton = this.shadowRoot?.querySelector('.send-button') as HTMLButtonElement;

    if (input && sendButton) {
      input.disabled = true;
      sendButton.disabled = true;
      input.placeholder = 'Chat temporarily disabled due to spam...';

      setTimeout(() => {
        input.disabled = false;
        sendButton.disabled = false;
        input.placeholder = 'Type your message...';
        this.addMessage('', 'Chat re-enabled. Please be mindful of message frequency.', 'system', 'global');
      }, 120000); // 2 min
    }
  }

  private attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.addMessage('', '⚠️ Max reconnection attempts reached. Please refresh the page.', 'system', 'global');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    if (this.reconnectAttempts === 1) {
      this.addMessage('', `⚠️ WebSocket disconnected. Attempting to reconnect...`, 'system', 'global');
    }

    setTimeout(() => {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('Connected', 'rgba(0,255,0,0.7)');
        this.addMessage('', '✅ Reconnected successfully!', 'system', 'global');
        this.setupWebSocketListeners();
        this.authenticateUser();
      } else {
        this.attemptReconnection();
      }
    }, delay);
  }

  private getCurrentUsername(): string {
    return state.userData?.username || localStorage.getItem('loggedInUser') || 'Anonymous';
  }

  private updateConnectionStatus(status: string, color: string) {
    const connectionBall = this.shadowRoot?.querySelector('.connection-ball') as HTMLElement;
    if (connectionBall) {
      connectionBall.style.background = color;
      connectionBall.title = status;
    }
  }

  // save messages to localStorage
  private saveMessages() {
    try {
      if (this.messageHistory.length > 0) {
        localStorage.setItem('chatMessages', JSON.stringify(this.messageHistory));
      }
    } catch (error) {
      console.error('Failed to save chat messages:', error);
      // try to clear localStorage if it's full
      try {
        localStorage.removeItem('chatMessages');
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }

  // render message history once when chat is first opened
  private renderHistoryOnce() {
    try {
      let messages: any[] = [];
      if (this.messageHistory && this.messageHistory.length > 0) {
        messages = this.messageHistory;
      } else {
        const saved = localStorage.getItem('chatMessages');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            messages = parsed;
            this.messageHistory = parsed;
          }
        }
      }
      const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
      if (messagesContainer) messagesContainer.innerHTML = '';
      if (messages && messages.length) {
        this.loadSavedMessagesToUI(messages);
      }
    } catch (error) {
      console.error('Failed to render chat history:', error);
    }
  }

  // load saved messages to UI without triggering save
  private loadSavedMessagesToUI(messages: any[]) {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (!messagesContainer) return;

    messages.forEach((msg: any) => {
      try {
        if (msg.type === 'system' && msg.message !== 'Welcome to Pong Live Chat!' && msg.message !== 'Use /help to see available commands') {
          const key = `${msg.message}`;
          if (!this.shownSystemMessages.has(key)) {
            this.renderMessageToUI('', msg.message, 'system', msg.category || 'global', undefined, undefined, msg.timestamp);
            this.shownSystemMessages.add(key);
          }
        } else if ((msg.type === 'user' || msg.type === 'other') && msg.sender && msg.message) {
          const messageType = msg.sender === this.getCurrentUsername() ? 'user' : 'other';
          this.renderMessageToUI(msg.sender, msg.message, messageType, msg.category || 'global', undefined, undefined, msg.timestamp);
        }
      } catch (msgError) {
        console.warn('Failed to load individual message:', msgError, msg);
      }
    });
  }

  // render message to UI without saving 
  private renderMessageToUI(sender: string, message: string, type: 'user' | 'system' | 'other', category: 'global' | 'direct' = 'global', receiverUsername?: string, inviteData?: any, timestampOverride?: number) {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (messagesContainer) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type} ${category}`;

      if (type === 'system') {
        messageDiv.style.cssText = `
          margin: 0.5rem 0;
          padding: 0.5rem 0.75rem;
          background: var(--video-transition-bg);
          border-left: 3px solid var(--accent);
          font-size: var(--secondary-font-size);
          color: var(--border);
          font-style: italic;
        `;

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageDiv.appendChild(messageSpan);
      } else {
        const isOwnMessage = sender === this.getCurrentUsername();

        messageDiv.style.cssText = `
          margin: 0.2rem 0;
          padding: 0.3rem 0.5rem;
          background: var(--placeholder-bg);
          border: 2px solid var(--video-transition-bg);
        `;

        // how sender and message are displayed for global vs direct
        const senderDiv = document.createElement('div');
        senderDiv.style.cssText = 'color: var(--border); font-size: var(--secondary-font-size); margin-bottom: 0.15rem; font-weight: 500;';

        if (category === 'direct') {
          // sender -> receiver
          const displayReceiver = receiverUsername || this.getCurrentUsername();
          senderDiv.textContent = `${sender} -> ${displayReceiver}`;
          messageDiv.style.background = 'rgba(100,150,255,0.15)';
          messageDiv.style.borderColor = 'rgba(100,150,255,0.3)';
        } else {
          // sender -> global
          senderDiv.textContent = `${sender} -> global`;
        }

        const messageDiv2 = document.createElement('div');
        messageDiv2.style.cssText = 'color: var(--border); font-size: var(--secondary-font-size); line-height: 1.2;';
        messageDiv2.textContent = message;

        const timestampDiv = document.createElement('div');
        timestampDiv.style.cssText = 'color: var(--border); font-size: var(--secondary-font-size); margin-top: 0.15rem; text-align: right;';
        const ts = timestampOverride || Date.now();
        timestampDiv.textContent = new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // store invite metadata on the DOM node so /accept and /decline can find it
        if (inviteData && inviteData.type === 'invite' && inviteData.id) {
          messageDiv.setAttribute('data-invite-type', 'true');
          messageDiv.setAttribute('data-invite-id', String(inviteData.id));
          if (inviteData.senderUsername) messageDiv.setAttribute('data-sender', String(inviteData.senderUsername));
          if (inviteData.receiverUsername) messageDiv.setAttribute('data-receiver', String(inviteData.receiverUsername));
          if (inviteData.difficulty) messageDiv.setAttribute('data-difficulty', String(inviteData.difficulty));
        }
        // add invite info if this is an invite message
        if (inviteData && inviteData.type === 'invite') {
          // store real invite data in the message DOM for later extraction
          messageDiv.setAttribute('data-invite-id', inviteData.id?.toString() || '');
          messageDiv.setAttribute('data-sender', inviteData.senderUsername || '');
          messageDiv.setAttribute('data-receiver', inviteData.receiverUsername || '');
          messageDiv.setAttribute('data-difficulty', inviteData.difficulty || 'MEDIUM');
          messageDiv.setAttribute('data-invite-type', 'true');

          const inviteInfoDiv = document.createElement('div');
          inviteInfoDiv.style.cssText = 'text-align: center; margin-top: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.05);';

          const inviteText = document.createElement('div');
          inviteText.style.cssText = 'color: rgba(255,255,255,0.7); font-size: 0.7rem; margin-bottom: 0.3rem;';
          inviteText.textContent = 'Type /accept or /decline to respond';

          inviteInfoDiv.appendChild(inviteText);
          messageDiv.appendChild(inviteInfoDiv);
        }

        messageDiv.appendChild(senderDiv);
        messageDiv.appendChild(messageDiv2);
        messageDiv.appendChild(timestampDiv);
      }

      messagesContainer.appendChild(messageDiv);

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: none;
      }

      :host([visible]) {
        display: block;
        position: fixed;
        bottom: calc(var(--chat-icon-size) + 3rem);
        right: 2rem;
        width: var(--sidebar-width);
        height: 600px;
        z-index: 9997;
        pointer-events: all;
        transition: opacity 0.3s ease;
      }

      .chat-panel {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 400px;
        height: 600px;
        background: var(--accent-70);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 2px solid var(--video-transition-bg);
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(-20px);
        transition: all 0.3s ease;
      }

      :host([visible]) .chat-panel {
        transform: translateY(0);
        pointer-events: all;
        opacity: 1;
        visibility: visible;
        display: flex;
        z-index: 9997;
      }
      :host .chat-panel {
        transform: translateY(0);
        opacity: 0.5;
        pointer-events: none;
        /*visibility: hidden;*/
        z-index: -1000;
        display: flex;
      }

      .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        border: 2px solid var(--video-transition-bg);
        background: var(--video-transition-bg);
      }

      .chat-title {
        color: var(--text);
        font-size: 1.2rem;
        font-weight: 600;
        margin: 0;
      }

      .close-button {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-button:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }

      .chat-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 1rem;
      }

      .chat-messages {
        flex: 1;
        background: var(--video-transition-bg);
        padding: 1rem;
        margin-bottom: 1rem;
        color: var(--text);
        overflow-y: auto;
      }

      .chat-input-area {
        display: flex;
        gap: 0.5rem;
      }

      .chat-input {
        flex: 1;
        background: var(--video-transition-bg);
        border: 2px solid var(--video-transition-bg);
        padding: 0.75rem 1rem;
        color: var(--text);
        font-size: var(--secondary-font-size);
        outline: none;
      }

      .chat-input::placeholder {
        color: var(--border);
      }

      .send-button {
        margin-left: 0.5rem;
        background: var(--accent);
        border: 2px solid var(--border);
        color: var(--text);
        padding: 0.75rem 1rem;
        cursor: pointer;
        font-size: var(--secondary-font-size);
        font-weight: bold;
        min-width: 60px;
      }

      .send-button:hover {
        background: var(--accent-secondary);
        box-shadow: var(--shadow-soft);
        color: #fff;
      }

      .invite-buttons {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
        justify-content: center;
      }

      .invite-btn {
        padding: 0.3rem 0.8rem;
        cursor: pointer;
        font-size: 0.7rem;
        transition: all 0.2s;
        border: none;
        color: var(--text);
      }

      .invite-btn.accept {
        background: rgba(0,255,0,0.3);
        border: 1px solid rgba(0,255,0,0.5);
      }

      .invite-btn.accept:hover {
        background: rgba(0,255,0,0.5);
        border-color: rgba(0,255,0,0.7);
      }

      .invite-btn.decline {
        background: rgba(255,0,0,0.3);
        border: 1px solid rgba(255,0,0,0.5);
      }

      .invite-btn.decline:hover {
        background: rgba(255,0,0,0.5);
        border-color: rgba(255,0,0,0.7);
      }

      .chat-close__button {
        margin-left: auto;
        background: none;
        border: none;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        cursor: pointer;
      }
      .chat-close__button--icon {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.20);
      }
      .chat-close__button--icon img {
        width: 1.5rem;
        height: 1.5rem;
        display: block;
        filter: invert(var(--invert, 1));
      }
      .chat-close__button--icon:hover {
        background: rgba(0, 0, 0, 0.5);
        cursor: pointer;
        box-shadow: var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.15));
      }
      .chat-close__button--icon img:hover {
        filter: invert(1);
      }
    `;
    this.shadowRoot!.appendChild(style);
  }

  private createPanel() {
    // main panel container
    this.panel = document.createElement('div');
    this.panel.className = 'chat-panel';

    // header with close button and toggles
    this.header = document.createElement('div');
    this.header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 2px solid var(--video-transition-bg);
      background: var(--video-transition-bg);
    `;

    // Left side: connection ball and title
    const leftHeader = document.createElement('div');
    leftHeader.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

    // Connection status ball
    const connectionBall = document.createElement('div');
    connectionBall.className = 'connection-ball';
    connectionBall.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255,255,0,0.7);
      border: 2px solid var(--video-transition-bg);
      flex-shrink: 0;
    `;

    // Chat title
    const chatTitle = document.createElement('h4');
    chatTitle.style.cssText = `
      color: var(--text);
      font-size: var(--title-modal-font-size);
      font-weight: bold;
      margin: 0;
    `;
    chatTitle.textContent = t("chat.compactTitle");

    leftHeader.appendChild(connectionBall);
    leftHeader.appendChild(chatTitle);

    // Right side: close button
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'chat-close__button';
    this.closeButton.title = 'Close side panel';
    this.closeButton.innerHTML = `<span class="chat-close__button--icon">${actionIcons.close}</span>`;

    this.header.appendChild(leftHeader);
    this.header.appendChild(this.closeButton);

    // content area
    this.content = document.createElement('div');
    this.content.className = 'chat-content';

    // messages area
    const messagesArea = document.createElement('div');
    messagesArea.className = 'chat-messages';
    messagesArea.style.cssText = `
      flex: 1;
      background: var(--body);
      border: 2px solid var(--border);
      padding: 1rem;
      margin-bottom: 1rem;
      color: var(--text);
      overflow-y: auto;
    `;

    // messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    messagesContainer.style.cssText = 'height: 100%; overflow-y: auto;';

    messagesArea.appendChild(messagesContainer);

    // simple input area
    const inputArea = document.createElement('div');
    inputArea.className = 'chat-input-area';
    inputArea.style.cssText = 'margin-top: auto; padding: 1rem 0; border-top: 1px solid rgba(255,255,255,0.1);';

    const input = document.createElement('input');
    input.className = 'chat-input';
    input.id = 'chat-message-input';
    input.name = 'chat-message';
    input.type = 'text';
    input.placeholder = t("chat.inputPlaceholder");
    input.style.cssText = `
      width: 100%;
      padding: 0.75rem;
      background: var(--body);
      border: 2px solid var(--border);
      color: var(--text);
      font-size: var(--secondary-font-size);
      outline: none;
      transition: border-color 0.2s;
    `;

    const sendButton = document.createElement('button');
    sendButton.className = 'send-button';
    sendButton.textContent = t("chat.send");

    const sendMessage = () => {
      const message = input.value.trim();
      if (message) {
        if (message.length > 500) {
          this.addMessage('', t("chat.messageTooLong"), 'system', 'global');
          return;
        }

        if (message.startsWith('/')) {
          this.handleSlashCommand(message);
        } else {
          this.sendGlobalMessage(message);
        }
        input.value = '';
      }
    };

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (this.hasAttribute('visible')) {
          sendMessage();
        }
      }
    });


    input.addEventListener('focus', () => {
      input.style.borderColor = 'rgba(255,255,255,0.5)';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = 'rgba(255,255,255,0.2)';
    });

    inputArea.appendChild(input);
    inputArea.appendChild(sendButton);

    // Create main chat container with flexbox layout
    const chatContainer = document.createElement('div');
    chatContainer.style.cssText = 'display: flex; height: 100%; flex-direction: column;';

    // Add content directly to container
    chatContainer.appendChild(messagesArea);
    chatContainer.appendChild(inputArea);

    this.content.appendChild(chatContainer);

    this.panel.appendChild(this.header);
    this.panel.appendChild(this.content);

    this.shadowRoot!.appendChild(this.panel);
  }

  private setupEventListeners() {
    this.closeButton.addEventListener('click', () => {
      this.removeAttribute('visible');
      this.saveMessages(); // Save messages when closing
    });

  }

  private addMessage(sender: string, message: string, type: 'user' | 'system' | 'other', category: 'global' | 'direct' = 'global', receiverUsername?: string, inviteData?: any, timestampOverride?: number) {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (messagesContainer) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type} ${category}`;

      if (type === 'system') {
        messageDiv.style.cssText = `
          margin: 0.5rem 0;
          padding: 0.5rem 0.75rem;
          background: var(--video-transition-bg);
          border-left: 3px solid var(--accent-secondary);
          font-size: var(--secondary-font-size);
          color: var(--text);
          font-style: italic;
        `;

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageDiv.appendChild(messageSpan);
      } else {
        // dedup immediate duplicate non-system messages (short debounce)
        const userKey = `${sender}|${category}|${message}`;
        const now = Date.now();
        if (this._lastUserMessageKey === userKey && (now - this._lastUserMessageAt) < 1500) {
          return;
        }
        this._lastUserMessageKey = userKey;
        this._lastUserMessageAt = now;
        const isOwnMessage = sender === this.getCurrentUsername();

        messageDiv.style.cssText = `
          margin: 0.35rem 0;
          padding: 0.3rem 0.5rem;
          background: var(--video-transition-bg);
          border: 2px solid ${isOwnMessage ? 'var(--accent-secondary)' : 'var(--text)'};
        `;

        // Show sender and message with different styles for global vs direct
        const senderDiv = document.createElement('div');
        senderDiv.style.cssText = 'color: var(--border); font-size: var(--secondary-font-size); margin-bottom: 0.15rem; font-weight: 500;';

        if (category === 'direct') {
          // Direct message: show "sender -> receiver"
          const displayReceiver = receiverUsername || this.getCurrentUsername();
          senderDiv.textContent = `${sender} -> ${displayReceiver}`;
          // Different color for direct messages
          messageDiv.style.background = 'var(--video-transition-bg)';
          messageDiv.style.borderColor = 'var(--accent-tertiary)';
        } else {
          // Global message: show "sender -> global"
          senderDiv.textContent = `${sender} -> global`;
        }

        const messageDiv2 = document.createElement('div');
        messageDiv2.style.cssText = 'color: var(--text); font-size: var(--secondary-font-size); line-height: 1.2;';
        messageDiv2.textContent = message;

        const timestampDiv = document.createElement('div');
        timestampDiv.style.cssText = 'color: var(--border); font-size: var(--secondary-font-size); margin-top: 0.15rem; text-align: right;';
        const ts = timestampOverride || Date.now();
        timestampDiv.textContent = new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        messageDiv.appendChild(senderDiv);
        messageDiv.appendChild(messageDiv2);
        messageDiv.appendChild(timestampDiv);
      }

      messagesContainer.appendChild(messageDiv);

      // Store message in history for localStorage (except system messages)
      if (type !== 'system') {
        this.messageHistory.push({
          sender: sender,
          message: message,
          type: type,
          category: category,
          timestamp: timestampOverride || Date.now()
        });

        // Limit history to prevent memory issues
        if (this.messageHistory.length > 100) {
          this.messageHistory.shift();
        }

        // Save to localStorage
        this.saveMessages();
      }

      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }



  // Find invite message by ID or most recent if no ID provided
  private findInviteMessage(inviteId?: number): HTMLElement | null {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (!messagesContainer) return null;

    const inviteMessages = messagesContainer.querySelectorAll('.message');
    for (let i = inviteMessages.length - 1; i >= 0; i--) {
      const msg = inviteMessages[i] as HTMLElement;
      // Look for invite type attribute to confirm this is an invite message
      if (msg.getAttribute('data-invite-type') === 'true') {
        // If no specific ID requested, return the most recent invite
        if (!inviteId) {
          return msg;
        }
        // Check if this invite matches the requested ID
        const msgInviteId = msg.getAttribute('data-invite-id');
        if (msgInviteId && parseInt(msgInviteId) === inviteId) {
          return msg;
        }
      }
    }
    return null;
  }



  // Handle slash commands
  private handleSlashCommand(cmd: string) {
    if (cmd === '/help') {
      this.addMessage('', t("chat.allCommandsTitle"), 'system', 'global');
      this.addMessage('', t("chat.help"), 'system', 'global');
      this.addMessage('', t("chat.list"), 'system', 'global');
      this.addMessage('', t("chat.pm"), 'system', 'global');
      this.addMessage('', t("chat.invite"), 'system', 'global');
      this.addMessage('', t("chat.accept"), 'system', 'global');
      this.addMessage('', t("chat.decline"), 'system', 'global');
      this.addMessage('', t("chat.profile"), 'system', 'global');
      this.addMessage('', t("chat.clear"), 'system', 'global');
      this.addMessage('', t("chat.friend"), 'system', 'global');
    } else if (cmd === '/list') {
      this.requestOnlineUsers();
    } else if (cmd === '/clear') {
      const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
        localStorage.removeItem('chatMessages');
        this.messageHistory = [];
        this.shownSystemMessages.clear();
        this.lastSystemMessageKey = '';
        this.lastSystemMessageAt = 0;
      }
    } else if (cmd.startsWith('/pm ')) {
      const [_, receiver, ...messageParts] = cmd.split(/\s+/);
      let message = messageParts.join(' ');

      if (receiver && message) {
        if (receiver === this.getCurrentUsername()) {
          this.addMessage('', t("pmError"), 'system', 'global');
          return;
        }
        wss.emit('directMessage', {
          type: 'direct',
          senderUsername: this.getCurrentUsername(),
          receiverUsername: receiver,
          message: message,
          timestamp: Date.now()
        });
      } else {
        this.addMessage('', t("chat.pmUsage"), 'system', 'global');
      }
    } else if (cmd.startsWith('/invite ')) {
      const [_, receiver, difficulty] = cmd.split(/\s+/);

      if (!receiver || !difficulty) {
        this.addMessage('', t("chat.inviteUsage"), 'system', 'global');
        return;
      }
      wss.emit('chatMessage', {
        message: `/invite ${receiver} ${difficulty}`,
        username: this.getCurrentUsername()
      });
    } else if (cmd.startsWith('/block ')) {
      const [_, raw] = cmd.split(/\s+/);
      const target = raw?.trim();
      if (!target) { this.addMessage('', 'Usage: /block username', 'system', 'global'); return; }
      const me = this.getCurrentUsername();
      if (target.toLowerCase() === me.toLowerCase()) {
        this.addMessage('', 'You cannot block yourself!', 'system', 'global');
        return;
      }
      wss.emit('blockUser', { targetUsername: target });
    } else if (cmd.startsWith('/unblock ')) {
      const [_, raw] = cmd.split(/\s+/);
      const target = raw?.trim();
      if (!target) { this.addMessage('', 'Usage: /unblock username', 'system', 'global'); return; }
      wss.emit('unblockUser', { targetUsername: target });
    } else if (cmd === '/accept') {
      this.handleInviteCommand('accept');
    } else if (cmd === '/decline') {
      this.handleInviteCommand('decline');
    } else if (cmd.startsWith('/profile ')) {
      const [_, username] = cmd.split(/\s+/);

      if (username) {
        window.location.href = `/profile/${username}`;
      } else {
        this.addMessage('', t("chat.profileUsage"), 'system', 'global');
      }
    } else if (cmd.startsWith('/friend ')) {
      const [_, option, username] = cmd.split(/\s+/);

      if (!option) {
        this.addMessage('', t("chat.friendUsage"), 'system', 'global');
        return;
      } else if (username === this.getCurrentUsername()) {
        this.addMessage('', t("chat.friendError"), 'system', 'global');
        return;
      } else if (!username) {
        switch (this.getOptions(option)) {
          case 4:
            this.sentFriends();
            break;
          case 5:
            this.receivedFriends();
            break;
          case 6:
            this.currentFriends();
            break;
          default:
            this.addMessage('', t("chat.friendUsage"), 'system', 'global');
            break;
        }
      } else {
        switch (this.getOptions(option)) {
          case 1:
            this.addFriend(username);
            break;
          case 2:
            this.acceptFriend(username);
            break;
          case 3:
            this.removeFriend(username);
            break;
          default:
            this.addMessage('', t("chat.friendUsage"), 'system', 'global');
            break;
        }
      }
    } else {
      this.addMessage('', t("chat.helpUsage"), 'system', 'global');
    }
  }

  private async getUserId(username: string) {
    const row = await getUserProfile(username);
    return row.userId;
  }

  private async addFriend(username: string) {
    try {
      const friendId = await this.getUserId(username);
      const currentId = await this.getUserId(this.getCurrentUsername());
      const result = await postAddFriend(currentId, friendId);
      this.addMessage('', t("chat.friendAdd", { username: username }), 'system', 'global');
    } catch (err) {
      this.addMessage('', t("chat.friendAddError"), 'system', 'global');
    }
  }

  private async acceptFriend(username: string) {
    try {
      const friendId = await this.getUserId(username);
      const currentId = await this.getUserId(this.getCurrentUsername());
      const result = await patchAcceptFriend(currentId, friendId);
      this.addMessage('', t("chat.friendAcc", { username: username }), 'system', 'global');
    } catch (err) {
      this.addMessage('', t("chat.friendAccError"), 'system', 'global');
    }
  }

  private async removeFriend(username: string) {
    try {
      const friendId = await this.getUserId(username);
      const currentId = await this.getUserId(this.getCurrentUsername());
      const result = await deleteFriend(currentId, friendId);
      this.addMessage('', t("chat.friendRm", { username: username }), 'system', 'global');
    } catch (err) {
      this.addMessage('', t("chat.friendRmError"), 'system', 'global');
    }
  }

  private async sentFriends() {
    try {
      const currentId = await this.getUserId(this.getCurrentUsername());
      const reply = await getSentRequests(currentId);
      for (const friend of reply.result) {
        this.addMessage('', friend.username, 'system', 'global');
      }
    } catch (err) {
      this.addMessage('', t("chat.friendSentError"), 'system', 'global');
    }
  }

  private async receivedFriends() {
    try {
      const currentId = await this.getUserId(this.getCurrentUsername());
      const reply = await getReceivedRequests(currentId);
      for (const friend of reply.result) {
        this.addMessage('', friend.username, 'system', 'global');
      }
    } catch (err) {
      this.addMessage('', t("chat.friendRecError"), 'system', 'global');
    }
  }

  private async currentFriends() {
    try {
      const currentId = await this.getUserId(this.getCurrentUsername());
      const reply = await getFriends(currentId);
      for (const friend of reply.result) {
        this.addMessage('', friend.username, 'system', 'global');
      }
    } catch (err) {
      this.addMessage('', t("chat.friendAllError"), 'system', 'global');
    }
  }

  private getOptions(options: string) {
    if (options === 'add') {
      return 1;
    } else if (options === 'accept') {
      return 2;
    } else if (options === 'remove') {
      return 3;
    } else if (options === 'sent') {
      return 4;
    } else if (options === 'received') {
      return 5;
    } else if (options === 'all') {
      return 6;
    } else
      return 0;
  }

  // Request online users from backend
  private requestOnlineUsers() {
    try {
      if (wss && wss.isConnected()) {
        wss.emit('getOnlineUsers');
        this.requestedOnlineUsers = true;
      } else {
        this.addMessage('', 'Failed to get online users: WebSocket not connected', 'system', 'global');
      }
    } catch (error) {
      console.error('Error requesting online users:', error);
      this.addMessage('', 'Failed to get online users', 'system', 'global');
    }
  }

  private sendGlobalMessage(message: string) {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        let username = 'Anonymous';

        if (state.userData?.username) {
          username = state.userData.username;
        }
        else if (localStorage.getItem('loggedInUser')) {
          username = localStorage.getItem('loggedInUser') || 'Anonymous';
        }

        websocketService.emit('chatMessage', {
          message: message,
          username: username
        });

      } else {
        this.addMessage('', 'Failed to send message: WebSocket not connected', 'system', 'global');
      }
    } catch (error) {
      this.addMessage('', 'Failed to send message', 'system', 'global');
    }
  }

  // Handle accept/decline commands for invites
  private handleInviteCommand(action: 'accept' | 'decline') {
    try {
      let inviteMessage = this.findInviteMessage();
      if (!inviteMessage) {
        if (this.lastInvite) {
          const websocketService = (window as any).websocketService;
          if (websocketService && websocketService.socket) {
            websocketService.socket.emit('inviteResponse', {
              inviteId: this.lastInvite.id,
              response: action,
              senderUsername: this.lastInvite.senderUsername,
              receiverUsername: this.lastInvite.receiverUsername,
              difficulty: this.lastInvite.difficulty
            });
            this.addMessage('', (action === 'accept') ? '🎮 Processing invite acceptance...' : '❌ Invite declined', 'system', 'global');
            this.lastInvite = null;
            return;
          }
        }
        this.addMessage('', '⚠️ No game invite found to respond to', 'system', 'global');
        return;
      }

      if (inviteMessage.getAttribute('data-invite-processed') === 'true') {
        this.addMessage('', '⚠️ This invite has already been processed', 'system', 'global');
        return;
      }

      const inviteData = this.extractInviteDataFromMessage(inviteMessage);
      if (!inviteData) {
        this.addMessage('', '⚠️ Invalid invite data', 'system', 'global');
        return;
      }

      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.socket) {
        websocketService.socket.emit('inviteResponse', {
          inviteId: inviteData.id,
          response: action,
          senderUsername: inviteData.senderUsername,
          receiverUsername: inviteData.receiverUsername,
          difficulty: inviteData.difficulty
        });

        inviteMessage.setAttribute('data-invite-processed', 'true');

        if (action !== 'accept') {
          this.addMessage('', '❌ Invite declined', 'system', 'global');
        }
      }
    } catch (error) {
      console.error('Failed to handle invite command:', error);
      this.addMessage('', '⚠️ Failed to process invite response', 'system', 'global');
    }
  }

  // Extract invite data from a message element
  private extractInviteDataFromMessage(messageElement: HTMLElement): any {
    try {
      // Check if this is an invite message
      if (messageElement.getAttribute('data-invite-type') !== 'true') {
        return null;
      }

      const inviteId = messageElement.getAttribute('data-invite-id');
      const senderUsername = messageElement.getAttribute('data-sender');
      const receiverUsername = messageElement.getAttribute('data-receiver');
      const difficulty = messageElement.getAttribute('data-difficulty');

      if (!inviteId || !senderUsername || !receiverUsername || !difficulty) {
        console.error('Missing invite data attributes:', { inviteId, senderUsername, receiverUsername, difficulty });
        return null;
      }

      return {
        id: parseInt(inviteId),
        senderUsername: senderUsername,
        receiverUsername: receiverUsername,
        difficulty: difficulty
      };
    } catch (error) {
      console.error('Failed to extract invite data:', error);
      return null;
    }
  }

  // Send a game invite via WebSocket
  private sendInvite(username: string, difficulty: string) {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        const currentUsername = state.userData?.username || localStorage.getItem('loggedInUser') || 'Anonymous';

        websocketService.emit('chatMessage', {
          message: `/invite ${username} ${difficulty}`,
          username: currentUsername
        });

      } else {
        console.error('WebSocket service not available or not connected');
        this.addMessage('', '⚠️ WebSocket not connected. Cannot send invite.', 'system', 'global');
      }
    } catch (error) {
      console.error('Failed to send invite:', error);
      this.addMessage('', '⚠️ Failed to send invite', 'system', 'global');
    }
  }
}

customElements.define('chat-panel', ChatPanel);
