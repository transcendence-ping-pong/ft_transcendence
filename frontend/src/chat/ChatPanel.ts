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

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.setupStyles();
    this.createPanel();
    this.setupEventListeners();

    // Initialize WebSocket connection
    this.initializeWebSocket();

    // Load messages when chat becomes visible
    this.observeVisibility();
  }

  // Observe when chat becomes visible to load messages
  private observeVisibility() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'visible') {
          if (this.hasAttribute('visible')) {
            // Chat opened - render history once without duplicating
            if (!this.hasRenderedHistory) {
              this.renderHistoryOnce();
              this.hasRenderedHistory = true;
            }
          }
        }
      });
    });

    observer.observe(this, { attributes: true });
  }

  // Initialize WebSocket connection
  private initializeWebSocket() {
    try {
      // Get WebSocket service from window
      const websocketService = (window as any).websocketService;

      if (websocketService) {
        // Check if already connected
        if (websocketService.isConnected()) {
          this.updateConnectionStatus('Connected', 'rgba(0,255,0,0.7)');
          // ensure listeners are attached only once
          this.setupWebSocketListeners();
          this.authenticateUser();
        } else {
          // Wait for connection
          this.updateConnectionStatus('Connecting...', 'rgba(255,255,0,0.7)');
          window.addEventListener('websocketConnected', () => {
            this.updateConnectionStatus('Connected', 'rgba(0,255,0,0.7)');
            // attach listeners only once
            this.setupWebSocketListeners();
            this.authenticateUser();
          });
        }

        // Listen for connection state changes
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

  // Authenticate user with WebSocket server
  private authenticateUser() {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        const usernameFromState = state.userData?.username || localStorage.getItem('loggedInUser') || '';
        // avoid authenticating as Anonymous; wait for proper login-success
        if (!usernameFromState || usernameFromState === 'Anonymous') {
          return;
        }
        // Send authentication event with real username
        websocketService.emit('authenticate', { username: usernameFromState });

        // Listen for authentication response
        window.addEventListener('websocketAuthenticated', (event: CustomEvent) => {
          const { success, username } = event.detail as any;
          if (success) {
            this.updateConnectionStatus('Authenticated', 'rgba(0,255,0,0.7)');
            if (username) {
              try {
                // cache username so UI shows the right sender
                this.currentUsername = username;
                // also keep localStorage in sync for other code paths
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

  // ensure proper authentication when login occurs after socket connects
  connectedCallback() {
    // listen once for login-success to authenticate with correct username
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

  // Setup WebSocket event listeners - SIMPLIFIED
  private setupWebSocketListeners() {
    const websocketService = (window as any).websocketService;
    if (!websocketService || !websocketService.socket || (this as any)._wsHandlersAttached) {
      return;
    }
    // prevent duplicate handler registration across open/close cycles
    (this as any)._wsHandlersAttached = true;

    // Simple event handling - let backend do the categorization
    websocketService.socket.on('chatMessage', (data: any) => {
      // ONLY show messages that are explicitly marked as global
      if (data && data.type === 'global' && data.senderUsername && data.message) {
        this.addMessage(data.senderUsername, data.message, 'other', 'global');
      }
    });

    websocketService.socket.on('directMessage', (data: any) => {
      // ONLY show messages that are explicitly marked as direct
      if (data && data.type === 'direct' && data.senderUsername && data.message) {
        // Pass the receiverUsername to addMessage for proper display
        this.addMessage(data.senderUsername, data.message, 'other', 'direct', data.receiverUsername);
      }
    });

    websocketService.socket.on('onlineUsers', (data: any) => {
      this.handleOnlineUsersUpdate(data);
    });

    websocketService.socket.on('chatError', (data: any) => {
      const errorMessage = data.message || 'Unknown error';

      // Check if it's a timeout/spam error
      if (errorMessage.includes('timed out') || errorMessage.includes('spam')) {
        this.handleTimeoutError(errorMessage);
      } else {
        this.addMessage('', `Error: ${errorMessage}`, 'system', 'global');
      }
    });

    // Handle game invites
    // prefer window event to avoid multiple socket handlers if ChatPanel is recreated
    const onGameInvite = (e: any) => {
      const data = e.detail;
      if (data && data.type === 'invite' && data.senderUsername && data.message) {
        this.lastInvite = data;
        this.addMessage(data.senderUsername, data.message, 'other', 'direct', data.receiverUsername, data);
      }
    };
    window.addEventListener('gameInvite', onGameInvite);

    // feedback for sender when invite is sent
    websocketService.socket.on('inviteSent', (data: any) => {
      this.addMessage('', `✅ Invite sent to ${data.targetUsername}`, 'system', 'global');
    });

    // Handle invite responses (no redirect here; wait for roomCreated)
    websocketService.socket.on('inviteAccepted', (data: any) => {
      this.addMessage('', data.message, 'system', 'global');
    });

    websocketService.socket.on('inviteDeclined', (data: any) => {
      this.addMessage('', data.message, 'system', 'global');
    });

    // Handle game countdown
    websocketService.socket.on('gameCountdown', (data: any) => {
      this.addMessage('', `🎮 Game starting in ${data.countdown}...`, 'system', 'global');
    });

    // Handle game start - removed direct websocket listener to prevent conflicts
    // The gameStart event should be handled by the game orchestrator, not the chat

    // Handle room creation for invite flow (keep existing event chain)
    websocketService.socket.on('roomCreated', (data: any) => {
      this.addMessage('', '🎮 Game room created!', 'system', 'global');
      window.dispatchEvent(new CustomEvent('roomCreated', { detail: data }));
    });

    // Navigate to game on server instruction (both host/guest)
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
      // client-side navigate to preserve websocket connection
      try {
        window.history.pushState({}, '', '/game');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch { }
    });

    // Fallback: accept/decline using lastInvite from localStorage if present
    window.addEventListener('login-success', () => {
      try {
        const raw = localStorage.getItem('lastInvite');
        if (raw) this.lastInvite = JSON.parse(raw);
      } catch { }
    });

    // Handle player joined for invite flow
    websocketService.socket.on('playerJoined', (data: any) => {
      this.addMessage('', '🎮 Guest joined the game room!', 'system', 'global');

      // Dispatch event for RemoteMultiplayerManager to handle
      window.dispatchEvent(new CustomEvent('playerJoined', { detail: data }));
    });
  }

  // Handle online users updates
  private handleOnlineUsersUpdate(data: any) {
    // Only show online users if they were explicitly requested
    if (this.requestedOnlineUsers) {
      if (data && Array.isArray(data)) {
        const currentUsername = this.getCurrentUsername();
        const otherUsers = data.filter((user: any) => user.username !== currentUsername);

        if (otherUsers.length === 0) {
          this.addMessage('', 'No other users online', 'system', 'global');
        } else {
          // Show all users in one line
          const userList = data.map((user: any) => {
            const isCurrentUser = user.username === currentUsername;
            return isCurrentUser ? `${user.username} (You)` : user.username;
          }).join(', ');

          this.addMessage('', `Online: ${userList}`, 'system', 'global');
        }
      } else {
        this.addMessage('', 'Failed to get online users', 'system', 'global');
      }

      // Reset the flag
      this.requestedOnlineUsers = false;
    }
  }

  // Handle user status updates (join/leave)
  private handleUserStatusUpdate(data: any) {
    if (data.type === 'joined' && data.username) {
      this.addMessage('', `${data.username} joined the chat`, 'system', 'global');
    } else if (data.type === 'left' && data.username) {
      this.addMessage('', `${data.username} left the chat`, 'system', 'global');
    }
  }

  // Handle timeout/spam errors
  private handleTimeoutError(errorMessage: string) {
    // Add error message
    this.addMessage('', `⚠️ ${errorMessage}`, 'system', 'global');

    // Disable chat input temporarily
    const input = this.shadowRoot?.querySelector('.chat-input') as HTMLInputElement;
    const sendButton = this.shadowRoot?.querySelector('.send-button') as HTMLButtonElement;

    if (input && sendButton) {
      input.disabled = true;
      sendButton.disabled = true;
      input.placeholder = 'Chat temporarily disabled due to spam...';

      // Re-enable after 2 minutes
      setTimeout(() => {
        input.disabled = false;
        sendButton.disabled = false;
        input.placeholder = 'Type your message...';
        this.addMessage('', 'Chat re-enabled. Please be mindful of message frequency.', 'system', 'global');
      }, 120000); // 2 minutes
    }
  }

  // Attempt to reconnect to WebSocket
  private attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.addMessage('', '⚠️ Max reconnection attempts reached. Please refresh the page.', 'system', 'global');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Exponential backoff, max 10s

    // Only show reconnection message once
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

  // Get current username - UTILITY FUNCTION
  private getCurrentUsername(): string {
    return state.userData?.username || localStorage.getItem('loggedInUser') || 'Anonymous';
  }

  // Update connection status display
  private updateConnectionStatus(status: string, color: string) {
    const connectionBall = this.shadowRoot?.querySelector('.connection-ball') as HTMLElement;
    if (connectionBall) {
      connectionBall.style.background = color;
      // Update title attribute for tooltip
      connectionBall.title = status;
    }
  }

  // Save messages to localStorage - use stored message history
  private saveMessages() {
    try {
      // Use the messageHistory array instead of parsing DOM
      // This prevents saving display formatting like arrows
      if (this.messageHistory.length > 0) {
        localStorage.setItem('chatMessages', JSON.stringify(this.messageHistory));
        console.log('Saved messages to localStorage:', this.messageHistory.length, 'messages');
      }
    } catch (error) {
      console.error('Failed to save chat messages:', error);
      // Try to clear localStorage if it's full
      try {
        localStorage.removeItem('chatMessages');
        console.log('Cleared localStorage due to error');
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }

  // Render message history once when chat is first opened
  private renderHistoryOnce() {
    try {
      // decide source: in-memory history if present, otherwise localStorage
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
      // clear UI then render once
      const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
      if (messagesContainer) messagesContainer.innerHTML = '';
      if (messages && messages.length) {
        this.loadSavedMessagesToUI(messages);
      }
    } catch (error) {
      console.error('Failed to render chat history:', error);
    }
  }

  // Load saved messages to UI without triggering save
  private loadSavedMessagesToUI(messages: any[]) {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (!messagesContainer) return;

    messages.forEach((msg: any) => {
      try {
        if (msg.type === 'system' && msg.message !== 'Welcome to Pong Live Chat!' && msg.message !== 'Use /help to see available commands') {
          this.renderMessageToUI('', msg.message, 'system', msg.category || 'global', undefined, undefined, msg.timestamp);
        } else if ((msg.type === 'user' || msg.type === 'other') && msg.sender && msg.message) {
          const messageType = msg.sender === this.getCurrentUsername() ? 'user' : 'other';
          this.renderMessageToUI(msg.sender, msg.message, messageType, msg.category || 'global', undefined, undefined, msg.timestamp);
        }
      } catch (msgError) {
        console.warn('Failed to load individual message:', msgError, msg);
      }
    });
  }

  // Render message to UI without saving (for loading from localStorage)
  private renderMessageToUI(sender: string, message: string, type: 'user' | 'system' | 'other', category: 'global' | 'direct' = 'global', receiverUsername?: string, inviteData?: any, timestampOverride?: number) {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (messagesContainer) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type} ${category}`;

      if (type === 'system') {
        // System messages - clean, minimal style
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
        // User messages - ultra slim, minimal style with different colors
        const isOwnMessage = sender === this.getCurrentUsername();

        messageDiv.style.cssText = `
          margin: 0.2rem 0;
          padding: 0.3rem 0.5rem;
          background: var(--placeholder-bg);
          border: 2px solid var(--video-transition-bg);
        `;

        // Show sender and message with different styles for global vs direct
        const senderDiv = document.createElement('div');
        senderDiv.style.cssText = 'color: var(--border); font-size: var(--secondary-font-size); margin-bottom: 0.15rem; font-weight: 500;';

        if (category === 'direct') {
          // Direct message: show "sender -> receiver"
          const displayReceiver = receiverUsername || this.getCurrentUsername();
          senderDiv.textContent = `${sender} -> ${displayReceiver}`;
          // Different color for direct messages
          messageDiv.style.background = 'rgba(100,150,255,0.15)';
          messageDiv.style.borderColor = 'rgba(100,150,255,0.3)';
        } else {
          // Global message: show "sender -> global"
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
        // Add invite info if this is an invite message
        if (inviteData && inviteData.type === 'invite') {
          // Store real invite data in the message DOM for later extraction
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

      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        bottom: calc(var(--chat-icon-size) + 3rem);
        right: 2rem;
        width: 400px;
        height: 600px;
        z-index: 9997; /* ensure it is not above topbar */
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      :host([visible]) {
        pointer-events: all;
      }

      .chat-panel {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 400px;
        height: 600px;
        background: var(--video-transition-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 2px solid var(--video-transition-bg);
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(-20px);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
        pointer-events: auto;
      }

      :host([visible]) .chat-panel {
        transform: translateY(0);
        opacity: 1;
        visibility: visible;
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
        font-size: var(--main-font-size);
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
    leftHeader.style.cssText = 'display: flex; align-items: center; gap: 1rem;';

    // Connection status ball
    const connectionBall = document.createElement('div');
    connectionBall.className = 'connection-ball';
    connectionBall.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255,255,0,0.7);
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

    // Add send functionality
    const sendMessage = () => {
      const message = input.value.trim();
      if (message) {
        // Input validation
        if (message.length > 500) {
          this.addMessage('', t("chat.messageTooLong"), 'system', 'global');
          return;
        }

        // Handle all commands and messages in single chat
        if (message.startsWith('/')) {
          this.handleSlashCommand(message);
        } else {
          // Send global message via WebSocket
          this.sendGlobalMessage(message);
        }
        input.value = '';
      }
    };

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
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
    console.log('ChatPanel DOM created');
  }

  private setupEventListeners() {
    this.closeButton.addEventListener('click', () => {
      console.log('Close button clicked');
      this.removeAttribute('visible');
      this.saveMessages(); // Save messages when closing
    });

    // No more toggle functionality - single chat view
  }

  // No more tab switching - all messages in one chat

  // Add message to chat
  private addMessage(sender: string, message: string, type: 'user' | 'system' | 'other', category: 'global' | 'direct' = 'global', receiverUsername?: string, inviteData?: any, timestampOverride?: number) {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (messagesContainer) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type} ${category}`;

      if (type === 'system') {
        // System messages - clean, minimal style
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
        // User messages - ultra slim, minimal style with different colors
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
        messageDiv2.style.cssText = 'color: var(--text); font-size: var(--main-font-size); line-height: 1.2;';
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
      this.addMessage('', t("chat.friendsAll"), 'system', 'global');
    } else if (cmd === '/list') {
      this.requestOnlineUsers();
    } else if (cmd === '/clear') {
      const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
        localStorage.removeItem('chatMessages');
        this.messageHistory = [];
      }
    } else if (cmd.startsWith('/pm ')) {
      const [_, receiver, ...messageParts] = cmd.split(/\s+/);
      let message = messageParts.join(' ');

      if (receiver && message) {
        // always allowed to send; backend will validate receiver presence and warn sender if needed
        if (receiver === this.getCurrentUsername()) {
          this.addMessage('', 'You cannot send a private message to yourself!', 'system', 'global');
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
        this.addMessage('', 'Usage: /pm username message', 'system', 'global');
      }
    } else if (cmd.startsWith('/invite ')) {
      const [_, receiver, difficulty] = cmd.split(/\s+/);

      if (!receiver || !difficulty) {
        this.addMessage('', 'Usage: /invite username [difficulty]', 'system', 'global');
        return;
      }
      // always allowed to send; backend will validate receiver presence and warn sender if needed
      wss.emit('chatMessage', {
        message: `/invite ${receiver} ${difficulty}`,
        username: this.getCurrentUsername()
      });
    } else if (cmd === '/accept') {
      // accept from anywhere; server will validate pending invite
      // Accept the most recent game invite
      this.handleInviteCommand('accept');
    } else if (cmd === '/decline') {
      // decline from anywhere
      // Decline the most recent game invite
      this.handleInviteCommand('decline');
    } else if (cmd.startsWith('/profile ')) {
      const [_, username] = cmd.split(/\s+/);

      if (username) {
        window.location.href = `/profile/${username}`;
      } else {
        this.addMessage('', 'Usage: /profile username', 'system', 'global');
      }
    } else if (cmd.startsWith('/friend ')) {
      const [_, option, username] = cmd.split(/\s+/);

      if (!option || !username) {
        this.addMessage('', 'Usage: /friend add/accept/remove username', 'system', 'global');
        return;
      } else if (username === this.getCurrentUsername()) {
        this.addMessage('', 'You cannot befriend/unfriend yourself! Try meeting other people!', 'system', 'global');
        return;
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
          case 4:
            this.sentFriends();
            break;
          case 5:
            this.receivedFriends();
            break;
          default:
            this.addMessage('', 'Usage: /friend add/accept/remove username', 'system', 'global');
            break;
        }
      }
    } else if (cmd.startsWith('/friends ')) {
      const [_, option] = cmd.split(/\s+/);

      if (!option) {
        return;
      } else {
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
            this.addMessage('', 'Usage: /friends <sent/received>', 'system', 'global');
            break;
        }
      }
    } else {
      this.addMessage('', `Use /help for available commands.`, 'system', 'global');
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
      this.addMessage('', `Friend request sent to ${username}`, 'system', 'global');
    } catch (err) {
      this.addMessage('', `Unable to send request`, 'system', 'global');
    }
  }

  private async acceptFriend(username: string) {
    try {
      const friendId = await this.getUserId(username);
      const currentId = await this.getUserId(this.getCurrentUsername());
      const result = await patchAcceptFriend(currentId, friendId);
      this.addMessage('', `You and ${username} are now friends!`, 'system', 'global');
    } catch (err) {
      this.addMessage('', `Unable to accept request`, 'system', 'global');
    }
  }

  private async removeFriend(username: string) {
    try {
      const friendId = await this.getUserId(username);
      const currentId = await this.getUserId(this.getCurrentUsername());
      const result = await deleteFriend(currentId, friendId);
      this.addMessage('', `Removed friend/request from ${username}`, 'system', 'global');
    } catch (err) {
      this.addMessage('', `Unable to remove friend/request`, 'system', 'global');
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
      this.addMessage('', `Unable to retrieve sent requests`, 'system', 'global');
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
      this.addMessage('', `Unable to retrieve received requests`, 'system', 'global');
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
      this.addMessage('', `Unable to retrieve friends`, 'system', 'global');
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
        // Request online users list
        wss.emit('getOnlineUsers');
        this.requestedOnlineUsers = true; // Set flag to true
      } else {
        this.addMessage('', 'Failed to get online users: WebSocket not connected', 'system', 'global');
      }
    } catch (error) {
      console.error('Error requesting online users:', error);
      this.addMessage('', 'Failed to get online users', 'system', 'global');
    }
  }

  // Send a global message via WebSocket
  private sendGlobalMessage(message: string) {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        // Get user data from state
        let username = 'Anonymous';

        // Try to get from state first
        if (state.userData?.username) {
          username = state.userData.username;
        }
        // Fallback: try to get from localStorage
        else if (localStorage.getItem('loggedInUser')) {
          username = localStorage.getItem('loggedInUser') || 'Anonymous';
        }

        // Send message via WebSocket - use the exact format backend expects
        websocketService.emit('chatMessage', {
          message: message,
          username: username
        });

        // ABSOLUTELY NO local message addition - UI only renders what backend sends back
      } else {
        console.error('WebSocket service not available or not connected');
        this.addMessage('', 'Failed to send message: WebSocket not connected', 'system', 'global');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage('', 'Failed to send message', 'system', 'global');
    }
  }

  // Handle accept/decline commands for invites
  private handleInviteCommand(action: 'accept' | 'decline') {
    try {
      // Find the most recent invite message
      let inviteMessage = this.findInviteMessage();
      if (!inviteMessage) {
        // fallback to lastInvite cached from socket event
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
            // mark as processed
            this.lastInvite = null;
            return;
          }
        }
        this.addMessage('', '⚠️ No game invite found to respond to', 'system', 'global');
        return;
      }

      // Check if this invite has already been processed
      if (inviteMessage.getAttribute('data-invite-processed') === 'true') {
        this.addMessage('', '⚠️ This invite has already been processed', 'system', 'global');
        return;
      }

      // Get invite data from the message
      const inviteData = this.extractInviteDataFromMessage(inviteMessage);
      if (!inviteData) {
        this.addMessage('', '⚠️ Invalid invite data', 'system', 'global');
        return;
      }

      // Send response to backend with REAL data
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.socket) {
        websocketService.socket.emit('inviteResponse', {
          inviteId: inviteData.id,
          response: action,
          senderUsername: inviteData.senderUsername,
          receiverUsername: inviteData.receiverUsername,
          difficulty: inviteData.difficulty
        });

        // Mark as processed immediately
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

      // Extract real invite data from DOM attributes
      const inviteId = messageElement.getAttribute('data-invite-id');
      const senderUsername = messageElement.getAttribute('data-sender');
      const receiverUsername = messageElement.getAttribute('data-receiver');
      const difficulty = messageElement.getAttribute('data-difficulty');

      // Validate that we have all required data
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

        // Send invite via WebSocket - let backend handle all validation
        websocketService.emit('chatMessage', {
          message: `/invite ${username} ${difficulty}`,
          username: currentUsername
        });

        // No confirmation message - let backend response determine what to show
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
