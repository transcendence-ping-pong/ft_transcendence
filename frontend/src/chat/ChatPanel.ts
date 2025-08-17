import { state } from '../state.js';

export default class ChatPanel extends HTMLElement {
  private panel: HTMLDivElement;
  private header: HTMLDivElement;
  private closeButton: HTMLButtonElement;
  private content: HTMLDivElement;
  
  private isVisible: boolean = false;
  private requestedOnlineUsers: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private messageHistory: Array<{sender: string, message: string, type: 'user' | 'system' | 'other', category: 'global' | 'direct', timestamp: number}> = [];
  private isLoadingMessages: boolean = false;

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
            // Chat opened - load messages
            this.loadMessages();
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
          this.setupWebSocketListeners();
          this.authenticateUser();
        } else {
          // Wait for connection
          this.updateConnectionStatus('Connecting...', 'rgba(255,255,0,0.7)');
          window.addEventListener('websocketConnected', () => {
            this.updateConnectionStatus('Connected', 'rgba(0,255,0,0.7)');
            this.setupWebSocketListeners();
            this.authenticateUser();
          });
        }
        
        // Listen for connection state changes
        window.addEventListener('websocketConnected', () => {
          this.updateConnectionStatus('Connected', 'rgba(0,255,0,0.7)');
        });
        
        window.addEventListener('websocketDisconnected', () => {
          this.updateConnectionStatus('Disconnected', 'rgba(255,255,0,0.7)');
          this.addMessage('', '⚠️ WebSocket disconnected. Trying to reconnect...', 'system', 'global');
          this.attemptReconnection();
        });
        
        window.addEventListener('websocketError', () => {
          this.updateConnectionStatus('Error', 'rgba(255,0,0,0.7)');
          this.addMessage('', '⚠️ WebSocket connection error. Check your connection.', 'system', 'global');
        });
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
        const username = state.userData?.username || localStorage.getItem('loggedInUser') || 'Anonymous';
        
        // Send authentication event
        websocketService.emit('authenticate', { username });
        
        // Listen for authentication response
        window.addEventListener('websocketAuthenticated', (event: CustomEvent) => {
          const { success, error } = event.detail;
          if (success) {
            this.updateConnectionStatus('Authenticated', 'rgba(0,255,0,0.7)');
          } else {
            this.updateConnectionStatus('Auth failed', 'rgba(255,0,0,0.7)');
          }
        });
      }
    } catch (error) {
      console.error('Failed to authenticate user:', error);
    }
  }

  // Setup WebSocket event listeners - SIMPLIFIED
  private setupWebSocketListeners() {
    const websocketService = (window as any).websocketService;
    if (!websocketService || !websocketService.socket) {
      return;
    }
    
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
    websocketService.socket.on('gameInvite', (data: any) => {
      if (data && data.type === 'invite' && data.senderUsername && data.message) {
        // Add invite message with buttons
        this.addMessage(data.senderUsername, data.message, 'other', 'direct', data.receiverUsername, data);
      }
    });

    // Handle invite responses
    websocketService.socket.on('inviteAccepted', (data: any) => {
      this.addMessage('', data.message, 'system', 'global');
    });

    websocketService.socket.on('inviteDeclined', (data: any) => {
      this.addMessage('', data.message, 'system', 'global');
      
      // Remove the invite message from the chat for the receiver
      this.removeInviteMessage();
    });

    // Handle game countdown
    websocketService.socket.on('gameCountdown', (data: any) => {
      this.addMessage('', `🎮 Game starting in ${data.countdown}...`, 'system', 'global');
    });

    // Handle game start - now triggers remote multiplayer flow
    websocketService.socket.on('gameStart', (data: any) => {
      this.addMessage('', '🎮 Game starting! Redirecting to game page...', 'system', 'global');
      
      // Navigate to game page after a short delay
      setTimeout(() => {
        window.location.href = '/game';
      }, 1000);
    });

    // Handle room creation for invite flow
    websocketService.socket.on('roomCreated', (data: any) => {
      this.addMessage('', '🎮 Game room created! You are the host.', 'system', 'global');
      
      // Dispatch event for RemoteMultiplayerManager to handle
      window.dispatchEvent(new CustomEvent('roomCreated', { detail: data }));
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
    
    this.addMessage('', `⚠️ Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000}s...`, 'system', 'global');
    
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

  // Load saved messages from localStorage
  private loadMessages() {
    try {
      const savedMessages = localStorage.getItem('chatMessages');
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        console.log('Loading saved messages:', messages);
        
        // Validate message structure before loading
        if (!Array.isArray(messages)) {
          console.warn('Invalid message format in localStorage, clearing...');
          localStorage.removeItem('chatMessages');
          return;
        }
        
        // Restore message history from localStorage
        this.messageHistory = messages;
        
        // Load saved messages with proper categorization
        messages.forEach((msg: any) => {
          try {
            if (msg.type === 'system' && msg.message !== 'Welcome to Pong Live Chat!' && msg.message !== 'Use /help to see available commands') {
              this.addMessage('', msg.message, 'system', msg.category || 'global');
            } else if (msg.type === 'user' && msg.sender && msg.message) {
              const messageType = msg.sender === this.getCurrentUsername() ? 'user' : 'other';
              // Ensure the message gets the correct category from saved data
              this.addMessage(msg.sender, msg.message, messageType, msg.category || 'global');
            }
          } catch (msgError) {
            console.warn('Failed to load individual message:', msgError, msg);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      // Clear corrupted localStorage
      try {
        localStorage.removeItem('chatMessages');
        console.log('Cleared corrupted localStorage');
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      :host([visible]) {
        pointer-events: all;
      }

      .chat-panel {
        position: fixed;
        top: var(--topbar-height);
        left: 2rem; /* Position to the left where the chat button is */
        width: 400px;
        height: 600px;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(-20px);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
        /* Debug: make sure it's visible */
        pointer-events: auto;
      }

      :host([visible]) .chat-panel {
        transform: translateY(0);
        opacity: 1;
        /* Debug: ensure visibility */
        visibility: visible;
        display: flex;
      }

      .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
      }

      .chat-title {
        color: white;
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
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        color: white;
        overflow-y: auto;
      }

      .chat-input-area {
        display: flex;
        gap: 0.5rem;
      }

      .chat-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: white;
        font-size: 0.9rem;
        outline: none;
      }

      .chat-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }

      .send-button {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        color: white;
        padding: 0.75rem 1rem;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        min-width: 60px;
      }

      .send-button:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .invite-buttons {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
        justify-content: center;
      }

      .invite-btn {
        padding: 0.3rem 0.8rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.7rem;
        transition: all 0.2s;
        border: none;
        color: white;
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
      border-bottom: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.05);
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
      color: white;
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    `;
    chatTitle.textContent = 'Chat';

    leftHeader.appendChild(connectionBall);
    leftHeader.appendChild(chatTitle);

    // Right side: close button
    this.closeButton = document.createElement('button');
    this.closeButton.innerHTML = '✕';
    this.closeButton.style.cssText = `
      background: none;
      border: none;
      color: rgba(255,255,255,0.7);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: color 0.2s;
    `;

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
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      color: white;
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
    input.placeholder = 'Type a message or use /help for commands...';
    input.style.cssText = `
      width: 100%;
      padding: 0.75rem;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: white;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    `;

    const sendButton = document.createElement('button');
    sendButton.className = 'send-button';
    sendButton.textContent = 'Send';
    sendButton.style.cssText = `
      margin-left: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    `;

    // Add send functionality
    const sendMessage = () => {
      const message = input.value.trim();
      if (message) {
        // Input validation
        if (message.length > 500) {
          this.addMessage('', 'Message too long. Maximum 500 characters allowed.', 'system', 'global');
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

    // Add hover effects
    sendButton.addEventListener('mouseenter', () => {
      sendButton.style.background = 'rgba(255,255,255,0.3)';
      sendButton.style.borderColor = 'rgba(255,255,255,0.5)';
    });
    
    sendButton.addEventListener('mouseleave', () => {
      sendButton.style.background = 'rgba(255,255,255,0.2)';
      sendButton.style.borderColor = 'rgba(255,255,255,0.3)';
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
  private addMessage(sender: string, message: string, type: 'user' | 'system' | 'other', category: 'global' | 'direct' = 'global', receiverUsername?: string, inviteData?: any) {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (messagesContainer) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type} ${category}`;
      
      if (type === 'system') {
        // System messages - clean, minimal style
        messageDiv.style.cssText = `
          margin: 0.5rem 0;
          padding: 0.5rem 0.75rem;
          background: rgba(255,255,255,0.08);
          border-radius: 8px;
          border-left: 3px solid rgba(255,255,255,0.3);
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
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
          background: ${isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'};
          border-radius: 4px;
          border: 1px solid ${isOwnMessage ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'};
        `;
        
        // Show sender and message with different styles for global vs direct
        const senderDiv = document.createElement('div');
        senderDiv.style.cssText = 'color: rgba(255,255,255,0.8); font-size: 0.7rem; margin-bottom: 0.15rem; font-weight: 500;';
        
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
        messageDiv2.style.cssText = 'color: rgba(255,255,255,0.9); font-size: 0.8rem; line-height: 1.2;';
        messageDiv2.textContent = message;
        
        const timestampDiv = document.createElement('div');
        timestampDiv.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 0.6rem; margin-top: 0.15rem; text-align: right;';
        timestampDiv.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        // Add invite buttons if this is an invite message
        if (inviteData && inviteData.type === 'invite') {
          const inviteButtonsDiv = document.createElement('div');
          inviteButtonsDiv.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 0.5rem; justify-content: center;';
          
          const acceptBtn = document.createElement('button');
          acceptBtn.textContent = '✓ Accept';
          acceptBtn.style.cssText = `
            background: rgba(0,255,0,0.3); 
            color: white; 
            border: 1px solid rgba(0,255,0,0.5); 
            padding: 0.3rem 0.8rem; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 0.7rem;
            transition: all 0.2s;
          `;
          acceptBtn.onmouseover = () => {
            acceptBtn.style.background = 'rgba(0,255,0,0.5)';
            acceptBtn.style.borderColor = 'rgba(0,255,0,0.7)';
          };
          acceptBtn.onmouseout = () => {
            acceptBtn.style.background = 'rgba(0,255,0,0.3)';
            acceptBtn.style.borderColor = 'rgba(0,255,0,0.5)';
          };
          acceptBtn.onclick = () => this.handleInviteResponse(inviteData, 'accept');
          
          const declineBtn = document.createElement('button');
          declineBtn.textContent = '✗ Decline';
          declineBtn.style.cssText = `
            background: rgba(255,0,0,0.3); 
            color: white; 
            border: 1px solid rgba(255,0,0,0.5); 
            padding: 0.3rem 0.8rem; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 0.7rem;
            transition: all 0.2s;
          `;
          declineBtn.onmouseover = () => {
            declineBtn.style.background = 'rgba(255,0,0,0.5)';
            declineBtn.style.borderColor = 'rgba(255,0,0,0.7)';
          };
          declineBtn.onmouseout = () => {
            declineBtn.style.borderColor = 'rgba(255,0,0,0.5)';
            declineBtn.style.background = 'rgba(255,0,0,0.3)';
          };
          declineBtn.onclick = () => this.handleInviteResponse(inviteData, 'decline');
          
          inviteButtonsDiv.appendChild(acceptBtn);
          inviteButtonsDiv.appendChild(declineBtn);
          messageDiv.appendChild(inviteButtonsDiv);
        }
        
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
          timestamp: Date.now()
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

  // Handle invite responses
  private handleInviteResponse(inviteData: any, response: 'accept' | 'decline') {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.socket) {
        websocketService.socket.emit('inviteResponse', {
          inviteId: inviteData.id,
          response: response,
          senderUsername: inviteData.senderUsername,
          receiverUsername: inviteData.receiverUsername,
          difficulty: inviteData.difficulty
        });
        
        if (response === 'accept') {
          this.addMessage('', '🎮 Processing invite acceptance...', 'system', 'global');
        } else {
          this.addMessage('', '❌ Invite declined', 'system', 'global');
        }
      }
    } catch (error) {
      console.error('Failed to handle invite response:', error);
      this.addMessage('', '⚠️ Failed to process invite response', 'system', 'global');
    }
  }

  // Remove invite message from chat when declined
  private removeInviteMessage() {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (messagesContainer) {
      // Find and remove the last invite message (the one that was just declined)
      const inviteMessages = messagesContainer.querySelectorAll('.message');
      for (let i = inviteMessages.length - 1; i >= 0; i--) {
        const msg = inviteMessages[i] as HTMLElement;
        if (msg.querySelector('.invite-buttons')) {
          // This is an invite message, remove it
          msg.remove();
          break;
        }
      }
    }
  }

  // Handle slash commands
  private handleSlashCommand(command: string) {
    const cmd = command.toLowerCase();
    
    if (cmd === '/help') {
      this.addMessage('', 'Available commands:', 'system', 'global');
      this.addMessage('', '• /help - Show this help message', 'system', 'global');
      this.addMessage('', '• /list - Show online users', 'system', 'global');
      this.addMessage('', '• /pm username message - Send private message (cannot PM yourself)', 'system', 'global');
      this.addMessage('', '• /invite username [difficulty] - Invite user to play Pong (EASY/MEDIUM/HARD)', 'system', 'global');
      this.addMessage('', '• /profile username - Go to user profile page', 'system', 'global');
      this.addMessage('', '• /clear - Clear chat history', 'system', 'global');
    } else if (cmd === '/list') {
      this.requestOnlineUsers();
    } else if (cmd === '/clear') {
      this.clearChat();
    } else if (cmd.startsWith('/pm ')) {
      // Parse direct message command - support both quoted and unquoted formats
      const parts = command.substring(4).trim(); // Remove '/pm ' and trim
      
      let username = '';
      let message = '';
      
      if (parts.includes('"')) {
        // Parse with quotes - handle multi-line and special characters
        const match = command.match(/\/pm\s+"([^"]+)"\s+"([^"]+)"/);
        if (match) {
          username = match[1];
          message = match[2];
        }
      } else {
        // Parse without quotes (space-separated) - first word is username, rest is message
        const spaceIndex = parts.indexOf(' ');
        if (spaceIndex > 0) {
          username = parts.substring(0, spaceIndex);
          message = parts.substring(spaceIndex + 1);
        }
      }
      
      if (username && message) {
        // Check if user is trying to PM themselves
        const currentUsername = this.getCurrentUsername();
        if (username.toLowerCase() === currentUsername.toLowerCase()) {
          this.addMessage('', 'You cannot send a private message to yourself!', 'system', 'global');
          return;
        }
        
        // Send direct message via WebSocket - NO local addition
        this.sendDirectMessage(username, message);
      } else {
        this.addMessage('', 'Usage: /pm username message', 'system', 'global');
      }
    } else if (cmd.startsWith('/invite ')) {
      // Parse invite command
      const parts = command.substring(8).trim(); // Remove '/invite ' and trim
      
      let username = '';
      let difficulty = 'MEDIUM';
      
      if (parts.includes('"')) {
        // Parse with quotes
        const match = command.match(/\/invite\s+"([^"]+)"\s*(\w+)?/);
        if (match) {
          username = match[1];
          difficulty = match[2] || 'MEDIUM';
        }
      } else {
        // Parse without quotes
        const words = parts.split(/\s+/);
        username = words[0];
        difficulty = words[1] || 'MEDIUM';
      }
      
      if (username) {
        // Validate difficulty
        const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
        if (!validDifficulties.includes(difficulty.toUpperCase())) {
          difficulty = 'MEDIUM';
        }
        
        this.sendInvite(username, difficulty.toUpperCase());
      } else {
        this.addMessage('', '⚠️ Usage: /invite username [difficulty]', 'system', 'global');
      }
    } else if (cmd.startsWith('/profile ')) {
      // Parse profile command
      const username = command.substring(9).trim(); // Remove '/profile ' and trim
      
      if (username) {
        this.addMessage('', `🎯 Redirecting to ${username}'s profile...`, 'system', 'global');
        
        // Redirect to profile page after a short delay
        setTimeout(() => {
          window.location.href = `/profile/${username}`;
        }, 1000);
      } else {
        this.addMessage('', '⚠️ Usage: /profile username', 'system', 'global');
      }
    } else {
      this.addMessage('', `Unknown command: ${command}. Use /help for available commands.`, 'system', 'global');
    }
  }

  // Request online users from backend
  private requestOnlineUsers() {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        // Request online users list
        websocketService.emit('getOnlineUsers');
        this.requestedOnlineUsers = true; // Set flag to true
      } else {
        this.addMessage('', 'Failed to get online users: WebSocket not connected', 'system', 'global');
      }
    } catch (error) {
      console.error('Error requesting online users:', error);
      this.addMessage('', 'Failed to get online users', 'system', 'global');
    }
  }

  // Clear chat history
  private clearChat() {
    const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
    if (messagesContainer) {
      // Clear all messages
      messagesContainer.innerHTML = '';
      
      // Clear localStorage and message history
      localStorage.removeItem('chatMessages');
      this.messageHistory = [];
      
      this.addMessage('', 'Chat history cleared!', 'system', 'global');
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

  // Send a direct message via WebSocket
  private sendDirectMessage(receiverUsername: string, message: string) {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        const username = state.userData?.username || localStorage.getItem('loggedInUser') || 'Anonymous';
        
        // Send direct message via WebSocket - ONLY to backend
        websocketService.emit('directMessage', {
          type: 'direct',
          senderUsername: username,
          receiverUsername: receiverUsername,
          message: message,
          timestamp: Date.now()
        });
        
        // ABSOLUTELY NO local message addition - UI only renders what backend sends back
      } else {
        console.error('WebSocket service not available or not connected');
        this.addMessage('', 'Failed to send direct message: WebSocket not connected', 'system', 'global');
      }
    } catch (error) {
      console.error('Error sending direct message:', error);
      this.addMessage('', 'Failed to send direct message', 'system', 'global');
    }
  }

  // Send a game invite via WebSocket
  private sendInvite(username: string, difficulty: string) {
    try {
      const websocketService = (window as any).websocketService;
      if (websocketService && websocketService.isConnected()) {
        const currentUsername = state.userData?.username || localStorage.getItem('loggedInUser') || 'Anonymous';
        
        // Send invite via WebSocket - use the exact format backend expects
        websocketService.emit('chatMessage', {
          message: `/invite ${username} ${difficulty}`,
          username: currentUsername
        });
        
        this.addMessage('', `🎮 Sending invite to ${username} (${difficulty})...`, 'system', 'global');
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
