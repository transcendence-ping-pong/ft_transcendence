import { state } from '../state.js';

class ChatUserList extends HTMLElement {
  private container: HTMLDivElement;
  private usersContainer: HTMLDivElement;
  private titleElement: HTMLHeadingElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.setupStyles();
    this.createContainer();
    this.setupEventListeners();
    this.render();
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
      }

      .users-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .users-title {
        color: white;
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
        padding: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        text-align: center;
      }

      .users-list {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .user-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }

      .user-item:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .user-item.blocked {
        opacity: 0.5;
        background: rgba(255, 107, 107, 0.1);
        border-color: rgba(255, 107, 107, 0.3);
      }

      .user-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ecdc4;
        flex-shrink: 0;
      }

      .user-status.offline {
        background: #95a5a6;
      }

      .user-username {
        color: white;
        font-size: 0.9rem;
        font-weight: 500;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .user-actions {
        display: flex;
        gap: 0.25rem;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .user-item:hover .user-actions {
        opacity: 1;
      }

      .user-action {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        font-size: 0.8rem;
        transition: all 0.2s ease;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .user-action:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }

      .user-action.block {
        color: #ff6b6b;
      }

      .user-action.block:hover {
        background: rgba(255, 107, 107, 0.1);
      }

      .user-action.invite {
        color: #4ecdc4;
      }

      .user-action.invite:hover {
        background: rgba(78, 205, 196, 0.1);
      }

      .no-users {
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
        padding: 2rem 1rem;
        font-style: italic;
        font-size: 0.9rem;
      }

      .refresh-button {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        padding: 0.5rem 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.8rem;
        margin: 0.5rem;
        width: calc(100% - 1rem);
      }

      .refresh-button:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }

      /* scrollbar styling */
      .users-list::-webkit-scrollbar {
        width: 4px;
      }

      .users-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }

      .users-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }

      .users-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `;
    this.shadowRoot!.appendChild(style);
  }

  private createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'users-container';

    this.titleElement = document.createElement('h4');
    this.titleElement.className = 'users-title';
    this.titleElement.textContent = 'Online Users';

    this.usersContainer = document.createElement('div');
    this.usersContainer.className = 'users-list';

    this.container.appendChild(this.titleElement);
    this.container.appendChild(this.usersContainer);

    this.shadowRoot!.appendChild(this.container);
  }

  private setupEventListeners() {
    // listen for state changes to re-render
    const checkForUpdates = () => {
      this.render();
    };

    // check every 100ms for updates (simple approach)
    setInterval(checkForUpdates, 100);
  }

  private render() {
    this.usersContainer.innerHTML = '';

    // add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.textContent = '🔄 Refresh Users';
    refreshButton.addEventListener('click', () => {
      // chatService.requestOnlineUsers(); // Removed chatService dependency
    });
    this.usersContainer.appendChild(refreshButton);

    const users = state.onlineUsers; // Changed to use state.onlineUsers
    
    if (users.length === 0) {
      const noUsers = document.createElement('div');
      noUsers.className = 'no-users';
      noUsers.textContent = 'No users online';
      this.usersContainer.appendChild(noUsers);
      return;
    }

    users.forEach(user => {
      const userElement = this.createUserElement(user);
      this.usersContainer.appendChild(userElement);
    });
  }

  private createUserElement(user: any) { // Changed type to any as chatService is removed
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    
    // Removed chatService.isUserBlocked(user.username)
    if (user.isBlocked) { // Assuming user object now includes isBlocked
      userDiv.classList.add('blocked');
    }

    const status = document.createElement('div');
    status.className = `user-status ${user.status}`;

    const username = document.createElement('span');
    username.className = 'user-username';
    username.textContent = user.username;

    const actions = document.createElement('div');
    actions.className = 'user-actions';

    // only show actions for online users
    if (user.status === 'online') {
      // invite button
      const inviteButton = document.createElement('button');
      inviteButton.className = 'user-action invite';
      inviteButton.innerHTML = '🎮';
      inviteButton.title = 'Invite to game';
      inviteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        // chatService.sendGameInvite(username); // Removed chatService dependency
      });

      // block/unblock button
      const blockButton = document.createElement('button');
      // const isBlocked = chatService.isUserBlocked(user.username); // Removed chatService dependency
      const isBlocked = user.isBlocked; // Assuming user object now includes isBlocked
      blockButton.className = `user-action block`;
      blockButton.innerHTML = isBlocked ? '🔓' : '🚫';
      blockButton.title = isBlocked ? 'Unblock user' : 'Block user';
      blockButton.addEventListener('click', (e) => {
        e.stopPropagation();
        // if (isBlocked) { // Removed chatService dependency
        //   this.unblockUser(user.username);
        // } else {
        //   this.blockUser(user.username);
        // }
      });

      actions.appendChild(inviteButton);
      actions.appendChild(blockButton);
    }

    userDiv.appendChild(status);
    userDiv.appendChild(username);
    userDiv.appendChild(actions);

    // click to send direct message
    userDiv.addEventListener('click', () => {
      // this.openDirectMessage(user.username); // Removed chatService dependency
    });

    return userDiv;
  }

  private inviteUser(username: string) {
    // chatService.sendGameInvite(username); // Removed chatService dependency
  }

  private blockUser(username: string) {
    // chatService.blockUser(username); // Removed chatService dependency
  }

  private unblockUser(username: string) {
    // chatService.unblockUser(username); // Removed chatService dependency
  }

  private openDirectMessage(username: string) {
    // focus the input and add /pm command
    const chatInput = this.shadowRoot!.host.parentElement?.querySelector('chat-input');
    if (chatInput) {
      const input = chatInput.shadowRoot?.querySelector('.chat-input') as HTMLInputElement;
      if (input) {
        input.value = `/pm "${username}" `;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }
}

customElements.define('chat-user-list', ChatUserList);

export default ChatUserList;
