import { chatService } from './chatService.js';
import { ChatMessage } from './types.js';
import { t } from '@/locales/Translations.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .chat-container {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    }
    
    .chat-toggle {
      background: #333;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      z-index: 10001;
    }
    
    .chat-panel {
      display: none;
      background: #222;
      border: 1px solid #444;
      border-radius: 5px;
      width: 300px;
      max-height: 400px;
      margin-bottom: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    
    .chat-panel.open {
      display: block;
    }
    
    .chat-tabs {
      display: flex;
      background: #333;
      border-bottom: 1px solid #444;
    }
    
    .chat-tab {
      flex: 1;
      padding: 10px;
      background: #333;
      color: #ccc;
      border: none;
      cursor: pointer;
      font-size: 12px;
    }
    
    .chat-tab.active {
      background: #555;
      color: white;
    }
    
    .chat-messages {
      height: 200px;
      overflow-y: auto;
      padding: 10px;
      background: #1a1a1a;
    }
    
    .chat-message {
      margin-bottom: 8px;
      padding: 5px;
      background: #333;
      border-radius: 3px;
      font-size: 12px;
      color: white;
    }
    
    .chat-message .sender {
      font-weight: bold;
      color: #4CAF50;
      margin-right: 5px;
    }
    
    .chat-message .timestamp {
      color: #888;
      font-size: 10px;
      margin-left: 5px;
    }
    
    .chat-input-container {
      display: flex;
      padding: 10px;
      background: #333;
      border-top: 1px solid #444;
    }
    
    .chat-input {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #444;
      color: white;
      padding: 5px;
      border-radius: 3px;
      font-size: 12px;
      margin-right: 5px;
    }
    
    .chat-send {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .chat-send:hover {
      background: #45a049;
    }
    
    .system-message {
      color: #4CAF50;
      font-style: italic;
      text-align: center;
      padding: 10px;
      background: #1a1a1a;
      border-radius: 3px;
      margin: 5px 0;
    }
    
    .success-message {
      color: #4CAF50;
      font-style: italic;
      text-align: center;
      padding: 10px;
      background: #1a1a1a;
      border-radius: 3px;
      margin: 5px 0;
    }
    
    .error-message {
      color: #ff6b6b;
      font-style: italic;
      text-align: center;
      padding: 10px;
    }
    
    .user-selector {
      padding: 10px;
      background: #333;
      border-bottom: 1px solid #444;
    }
    
    .user-selector select {
      width: 100%;
      background: #1a1a1a;
      color: white;
      border: 1px solid #444;
      padding: 5px;
      border-radius: 3px;
      font-size: 12px;
    }
    
    .online-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
    }
    
    .online-indicator.online {
      background: #4CAF50;
    }
    
    .online-indicator.away {
      background: #FF9800;
    }
    
    .online-indicator.offline {
      background: #f44336;
    }
    
    .connection-status {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f44336;
    }
    
    .connection-status.connected {
      background: #4CAF50;
    }
  </style>
  
  <div class="chat-container">
    <button class="chat-toggle">💬 Chat</button>
    <div class="chat-panel">
      <div class="connection-status" id="connection-status"></div>
      
      <div class="chat-tabs">
        <button class="chat-tab active" data-tab="global">Global</button>
        <button class="chat-tab" data-tab="direct">Direct</button>
        <button class="chat-tab" data-tab="invites">Invites</button>
      </div>
      
      <div class="user-selector" id="user-selector" style="display: none;">
        <select id="dm-user-select">
          <option value="">Select user to message...</option>
        </select>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <div class="system-message">Select a user to start chatting</div>
      </div>
      
      <div class="chat-input-container">
        <input type="text" class="chat-input" placeholder="Type a message or command..." />
        <button class="chat-send">Send</button>
      </div>
    </div>
  </div>
`;

export class ChatPanel extends HTMLElement {
  private currentTab: string = 'global';
  private currentUser: string = '';
  private messages: ChatMessage[] = [];
  private shadow: ShadowRoot;
  private onlineUsers: Set<string> = new Set();
  private userSet: boolean = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(template.content.cloneNode(true));
    this.setupEventListeners();
  }

  connectedCallback() {
    this.setupWebSocketListeners();
    this.updateConnectionStatus();
  }

  private setupEventListeners() {
    try {
      const toggle = this.shadow.querySelector('.chat-toggle') as HTMLButtonElement;
      const panel = this.shadow.querySelector('.chat-panel') as HTMLDivElement;
      const tabs = this.shadow.querySelectorAll('.chat-tab');
      const input = this.shadow.querySelector('.chat-input') as HTMLInputElement;
      const sendButton = this.shadow.querySelector('.chat-send') as HTMLButtonElement;

      if (!toggle || !panel || !input || !sendButton) {
        throw new Error('Required chat elements not found');
      }

      toggle.addEventListener('click', () => {
        panel.classList.toggle('open');
      });

      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const tabName = target.dataset.tab;
          if (tabName) {
            this.switchTab(tabName);
          }
        });
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });

      sendButton.addEventListener('click', () => {
        this.sendMessage();
      });
    } catch (error) {
      console.error('Error setting up chat event listeners:', error);
      this.addSystemMessage('Error initializing chat. Please refresh the page.');
    }
  }

  private setupWebSocketListeners() {
    try {
      window.addEventListener('chatMessage', (e: CustomEvent) => {
        this.addMessage(e.detail);
      });

      window.addEventListener('directMessage', (e: CustomEvent) => {
        this.addMessage(e.detail);
      });

      window.addEventListener('chatError', (e: CustomEvent) => {
        this.addErrorMessage(`Error: ${e.detail.message}`);
      });

      window.addEventListener('userBlocked', (e: CustomEvent) => {
        this.addSystemMessage(`User ${e.detail.blockedUsername} has been blocked`);
      });

      window.addEventListener('inviteSent', (e: CustomEvent) => {
        this.addSystemMessage(`Game invite sent to ${e.detail.receiverUsername}`);
      });

      window.addEventListener('websocket-authenticated', (e: CustomEvent) => {
        this.updateConnectionStatus();
      });

      window.addEventListener('websocket-error', (e: CustomEvent) => {
        this.updateConnectionStatus();
      });

      window.addEventListener('userStatusUpdate', (e: CustomEvent) => {
        this.handleUserStatusUpdate(e.detail);
      });

      window.addEventListener('onlineUsers', (e: CustomEvent) => {
        this.handleOnlineUsersList(e.detail);
      });
    } catch (error) {
      console.error('Error setting up WebSocket listeners:', error);
      this.addErrorMessage('Error setting up chat communication');
    }
  }

  private updateConnectionStatus() {
    try {
      const statusElement = this.shadow.querySelector('#connection-status') as HTMLElement;
      if (statusElement) {
        const isConnected = chatService.isConnected();
        statusElement.className = `connection-status ${isConnected ? 'connected' : ''}`;
        statusElement.title = isConnected ? 'Connected' : 'Disconnected';
        
        if (!isConnected) {
          this.addSystemMessage('Connection lost. Trying to reconnect...');
        }
      }
    } catch (error) {
      console.error('Error updating connection status:', error);
    }
  }

  refreshConnectionStatus() {
    this.updateConnectionStatus();
  }

  private switchTab(tabName: string) {
    try {
      this.currentTab = tabName;
      
      const tabs = this.shadow.querySelectorAll('.chat-tab');
      tabs.forEach(tab => {
        tab.classList.remove('active');
        if ((tab as HTMLElement).dataset.tab === tabName) {
          tab.classList.add('active');
        }
      });

      const userSelector = this.shadow.querySelector('#user-selector') as HTMLElement;
      if (userSelector) {
        userSelector.style.display = tabName === 'direct' ? 'block' : 'none';
      }

      if (tabName === 'direct') {
        this.updateDirectMessageUserList();
      }

      this.renderMessages();
    } catch (error) {
      console.error('Error switching tabs:', error);
      this.addErrorMessage('Error switching chat tabs');
    }
  }

  private updateDirectMessageUserList() {
    try {
      const userSelect = this.shadow.querySelector('#dm-user-select') as HTMLSelectElement;
      if (!userSelect) return;

      userSelect.innerHTML = '<option value="">Select user to message...</option>';

      this.onlineUsers.forEach(username => {
        if (username !== this.currentUser) {
          const option = document.createElement('option');
          option.value = username;
          option.textContent = `${username} (Online)`;
          userSelect.appendChild(option);
        }
      });

      // test mock users TODO: remove
      const mockUsers = ['Alice', 'Bob', 'Charlie'];
      mockUsers.forEach(username => {
        if (username !== this.currentUser && !this.onlineUsers.has(username)) {
          const option = document.createElement('option');
          option.value = username;
          option.textContent = `${username} (Offline - Cannot message)`;
          option.disabled = true;
          userSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error('Error updating user list:', error);
    }
  }

  private sendMessage() {
    try {
      const input = this.shadow.querySelector('.chat-input') as HTMLInputElement;
      const message = input.value.trim();
      
      if (!message) return;
      
      if (!this.currentUser) {
        this.addSystemMessage('Please select a user first');
        return;
      }

      if (message.startsWith('/')) {
        this.handleCommand(message);
      } else {
        if (this.currentTab === 'global') {
          try {
            chatService.sendMessage(message);
          } catch (error) {
            this.addErrorMessage(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else if (this.currentTab === 'direct') {
          this.sendDirectMessage(message);
        }
      }

      input.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      this.addErrorMessage('Error sending message. Please try again.');
    }
  }

  private sendDirectMessage(message: string) {
    try {
      const userSelect = this.shadow.querySelector('#dm-user-select') as HTMLSelectElement;
      if (!userSelect || !userSelect.value) {
        this.addSystemMessage('Please select a user to send a direct message to');
        return;
      }

      const receiverUsername = userSelect.value;
      try {
        chatService.sendDirectMessage(receiverUsername, message);
        
        this.addSuccessMessage(`Message sent to ${receiverUsername}`);
      } catch (error) {
        this.addErrorMessage(`Failed to send direct message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending direct message:', error);
      this.addErrorMessage('Error sending direct message');
    }
  }

  private handleCommand(command: string) {
    try {
      const parts = command.split(' ');
      const cmd = parts[0].toLowerCase();
      
      switch (cmd) {
        case '/pm':
          if (parts.length < 3) {
            this.addSystemMessage('Usage: /pm <username> <message>');
            return;
          }
          const username = parts[1];
          const pmMessage = parts.slice(2).join(' ');
          try {
            chatService.sendDirectMessage(username, pmMessage);
          } catch (error) {
            this.addErrorMessage(`Failed to send PM: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          break;
          
        case '/block':
          if (parts.length < 2) {
            this.addSystemMessage('Usage: /block <username>');
            return;
          }
          try {
            chatService.blockUser(parts[1]);
          } catch (error) {
            this.addErrorMessage(`Failed to block user: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          break;
          
        case '/invite':
          if (parts.length < 2) {
            this.addSystemMessage('Usage: /invite <username>');
            return;
          }
          try {
            chatService.sendGameInvite(parts[1]);
          } catch (error) {
            this.addErrorMessage(`Failed to send invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          break;
          
        default:
          this.addSystemMessage(`Unknown command: ${cmd}`);
      }
    } catch (error) {
      console.error('Error handling command:', error);
      this.addErrorMessage('Error processing command');
    }
  }

  private addMessage(message: ChatMessage) {
    try {
      const isDuplicate = this.messages.some(existing => 
        existing.senderUsername === message.senderUsername &&
        existing.message === message.message &&
        Math.abs(existing.timestamp - message.timestamp) < 1000
      );
      
      if (!isDuplicate) {
        this.messages.push(message);
        this.renderMessages();
      }
    } catch (error) {
      console.error('Error adding message:', error);
    }
  }

  private addSystemMessage(text: string) {
    try {
      const systemMessage: ChatMessage = {
        id: Date.now(),
        senderId: 0,
        senderUsername: 'System',
        message: text,
        timestamp: Date.now(),
        type: 'global'
      };
      this.messages.push(systemMessage);
      this.renderMessages();
    } catch (error) {
      console.error('Error adding system message:', error);
    }
  }

  private addSuccessMessage(text: string) {
    try {
      const successMessage: ChatMessage = {
        id: Date.now(),
        senderId: 0,
        senderUsername: 'System',
        message: text,
        timestamp: Date.now(),
        type: 'global'
      };
      this.messages.push(successMessage);
      this.renderMessages();
    } catch (error) {
      console.error('Error adding success message:', error);
    }
  }

  private addErrorMessage(text: string) {
    try {
      const errorMessage: ChatMessage = {
        id: Date.now(),
        senderId: 0,
        senderUsername: 'System',
        message: text,
        timestamp: Date.now(),
        type: 'global'
      };
      this.messages.push(errorMessage);
      this.renderMessages();
    } catch (error) {
      console.error('Error adding error message:', error);
    }
  }

  private renderMessages() {
    try {
      const messagesContainer = this.shadow.querySelector('#chat-messages') as HTMLDivElement;
      if (!messagesContainer) return;

      let filteredMessages = this.messages;
      if (this.currentTab === 'direct') {
        filteredMessages = this.messages.filter(m => 
          m.type === 'direct' && 
          m.receiverUsername === this.currentUser
        );
      } else if (this.currentTab === 'invites') {
        filteredMessages = this.messages.filter(m => m.type === 'invite');
      } else {
        filteredMessages = this.messages.filter(m => m.type === 'global');
      }

      messagesContainer.innerHTML = '';
      
      if (filteredMessages.length === 0) {
        const noMessages = document.createElement('div');
        noMessages.className = 'system-message';
        noMessages.textContent = 'No messages yet';
        messagesContainer.appendChild(noMessages);
        return;
      }

      filteredMessages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        
        if (msg.senderUsername === 'System') {
          const isError = msg.message.includes('Error:');
          const isSuccess = msg.message.includes('Message sent to') || msg.message.includes('Logged in as');
          let messageClass = 'system-message';
          
          if (isError) {
            messageClass = 'error-message';
          } else if (isSuccess) {
            messageClass = 'success-message';
          }
          
          messageDiv.innerHTML = `<span class="${messageClass}">${msg.message}</span>`;
        } else {
          const onlineStatus = this.onlineUsers.has(msg.senderUsername) ? 'online' : 'offline';
          messageDiv.innerHTML = `
            <span class="sender">
              <span class="online-indicator ${onlineStatus}"></span>
              ${msg.senderUsername}
            </span>
            <span class="timestamp">${timestamp}</span>
            <br>
            ${msg.message}
          `;
        }
        
        messagesContainer.appendChild(messageDiv);
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
      console.error('Error rendering messages:', error);
    }
  }

  setCurrentUser(username: string) {
    try {
      if (this.userSet && this.currentUser === username) {
        return;
      }
      
      this.currentUser = username;
      this.userSet = true;
      this.onlineUsers.add(username);
      this.addSystemMessage(`Logged in as ${username}`);
      this.updateDirectMessageUserList();
    } catch (error) {
      console.error('Error setting current user:', error);
    }
  }

  addOnlineUser(username: string) {
    try {
      if (!this.onlineUsers.has(username) && username !== this.currentUser) {
        this.onlineUsers.add(username);
        this.updateDirectMessageUserList();
        this.addSystemMessage(`${username} is now online`);
      }
    } catch (error) {
      console.error('Error adding online user:', error);
    }
  }

  removeOnlineUser(username: string) {
    try {
      if (this.onlineUsers.has(username) && username !== this.currentUser) {
        this.onlineUsers.delete(username);
        this.updateDirectMessageUserList();
        this.addSystemMessage(`${username} is now offline`);
      }
    } catch (error) {
      console.error('Error removing online user:', error);
    }
  }

  private handleUserStatusUpdate(update: { username: string; status: 'online' | 'away' | 'offline' }) {
    try {
      const { username, status } = update;
      
      if (status === 'online' && !this.onlineUsers.has(username)) {
        this.addOnlineUser(username);
      } else if (status === 'offline' && this.onlineUsers.has(username)) {
        this.removeOnlineUser(username);
      } else if (status === 'away') {
        this.addSystemMessage(`${username} is away`);
      }
    } catch (error) {
      console.error('Error handling user status update:', error);
    }
  }

  private handleOnlineUsersList(onlineUsers: Array<{ username: string; status: string }>) {
    try {
      this.onlineUsers.clear();
      
      onlineUsers.forEach(user => {
        if (user.status === 'online' && user.username !== this.currentUser) {
          this.onlineUsers.add(user.username);
        }
      });
      
      this.updateDirectMessageUserList();
    } catch (error) {
      console.error('Error handling online users list:', error);
    }
  }
}

customElements.define('chat-panel', ChatPanel);
