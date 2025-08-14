import { websocketService } from '@/services/websocketService.js';

export class MultiplayerToggle {
  private container: HTMLElement | null = null;
  private isMultiplayerMode: boolean = false;
  private isAuthenticated: boolean = false;
  
  // Store event listener references for cleanup
  private playerReadyListener?: (e: CustomEvent) => void;
  private gameStartListener?: (e: CustomEvent) => void;
  private gameCountdownListener?: (e: CustomEvent) => void;
  private gameStartedListener?: (e: CustomEvent) => void;
  private gameEndListener?: (e: CustomEvent) => void;
  private websocketErrorListener?: (e: CustomEvent) => void;
  private websocketAuthenticatedListener?: (e: CustomEvent) => void;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for WebSocket authentication
    window.addEventListener('websocket-authenticated', (e: CustomEvent) => {
      if (e.detail.success) {
        console.log('✅ Ready for multiplayer!');
        this.isAuthenticated = true;
        this.updateAuthStatus(`✅ Connected as ${e.detail.username}`, 'text-green-400');
      } else {
        console.error('❌ Multiplayer authentication failed:', e.detail.error);
        this.isAuthenticated = false;
        this.updateAuthStatus(`❌ ${e.detail.error}`, 'text-red-400');
      }
    });

    // Listen for hide/show UI events
    window.addEventListener('hide-multiplayer-ui', () => {
      console.log('🎮 Hiding multiplayer UI');
      const multiplayerBtn = this.container?.querySelector('.multiplayer-toggle');
      const multiplayerModal = this.container?.querySelector('#multiplayer-modal');
      
      if (multiplayerBtn) {
        multiplayerBtn.classList.add('hidden');
      }
      if (multiplayerModal) {
        multiplayerModal.classList.add('hidden');
      }
    });

    window.addEventListener('show-multiplayer-ui', () => {
      console.log('🎮 Showing multiplayer UI');
      const multiplayerBtn = this.container?.querySelector('.multiplayer-toggle');
      const multiplayerModal = this.container?.querySelector('#multiplayer-modal');
      
      if (multiplayerBtn) {
        multiplayerBtn.classList.remove('hidden');
      }
      if (multiplayerModal) {
        multiplayerModal.classList.remove('hidden');
      }
    });
  }

  public render(container: HTMLElement) {
    this.container = container;
    
    container.innerHTML = `
      <div class="multiplayer-toggle fixed top-24 left-4 z-[10000]">
        <button id="multiplayer-btn" 
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-bold transition-colors">
          🎮 Multiplayer
        </button>
      </div>
      
      <div id="multiplayer-modal" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden">
        <div class="flex items-center justify-center h-full">
          <div id="multiplayer-content" class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"></div>
        </div>
      </div>
    `;

    this.setupButtonListeners();
  }

  private setupButtonListeners() {
    const multiplayerBtn = this.container?.querySelector('#multiplayer-btn') as HTMLButtonElement;
    const multiplayerModal = this.container?.querySelector('#multiplayer-modal') as HTMLElement;
    const multiplayerContent = this.container?.querySelector('#multiplayer-content') as HTMLElement;

    multiplayerBtn?.addEventListener('click', () => {
      if (!this.isMultiplayerMode) {
        // Show multiplayer UI
        multiplayerModal.classList.remove('hidden');
        this.renderMultiplayerUI(multiplayerContent);
        this.isMultiplayerMode = true;
        multiplayerBtn.textContent = '❌ Close';
      } else {
        // Hide multiplayer UI
        multiplayerModal.classList.add('hidden');
        this.isMultiplayerMode = false;
        multiplayerBtn.textContent = '🎮 Multiplayer';
      }
    });

    // Close modal when clicking outside
    multiplayerModal?.addEventListener('click', (e) => {
      if (e.target === multiplayerModal) {
        multiplayerModal.classList.add('hidden');
        this.isMultiplayerMode = false;
        multiplayerBtn.textContent = '🎮 Multiplayer';
      }
    });
  }

  private renderMultiplayerUI(container: HTMLElement) {
    container.innerHTML = `
      <div class="multiplayer-ui">
        <h2 class="text-2xl font-bold text-white mb-4">🎮 Multiplayer Pong</h2>
        
        <!-- Username Input -->
        <div id="username-section" class="mb-4">
          <h3 class="text-lg font-semibold text-white mb-2">Enter Your Username</h3>
          <div class="flex space-x-2">
            <input id="username-input" 
                   type="text" 
                   placeholder="Your username" 
                   class="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
            <button id="connect-btn" 
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
              Connect
            </button>
          </div>
        </div>
        
        <!-- Authentication Status -->
        <div id="auth-status" class="mb-4 p-2 rounded text-sm hidden">
          <span id="auth-text" class="text-yellow-400">⏳ Connecting...</span>
        </div>
        
        <div id="game-controls" class="space-y-4 hidden">
          <!-- Create Room Button -->
          <button id="create-room-btn" 
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
            Create New Room
          </button>
          
          <!-- Join Room Section -->
          <div class="border-t border-gray-600 pt-4">
            <h3 class="text-lg font-semibold text-white mb-2">Join Existing Room</h3>
            <div class="flex space-x-2">
              <input id="room-id-input" 
                     type="text" 
                     placeholder="Enter Room ID" 
                     class="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
              <button id="join-room-btn" 
                      class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors">
                Join
              </button>
            </div>
          </div>
          
          <!-- Room Status -->
          <div id="room-status" class="hidden">
            <div class="border-t border-gray-600 pt-4">
              <h3 class="text-lg font-semibold text-white mb-2">Room Status</h3>
              <div id="room-info" class="text-gray-300 text-sm space-y-1"></div>
              
              <!-- Ready Button -->
              <div id="ready-section" class="mt-4 hidden">
                <button id="ready-btn" 
                        class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors">
                  ✅ Ready to Play
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupMultiplayerButtons(container);
  }

  private setupMultiplayerButtons(container: HTMLElement) {
    const usernameInput = container.querySelector('#username-input') as HTMLInputElement;
    const connectBtn = container.querySelector('#connect-btn') as HTMLButtonElement;
    const createRoomBtn = container.querySelector('#create-room-btn') as HTMLButtonElement;
    const joinRoomBtn = container.querySelector('#join-room-btn') as HTMLButtonElement;
    const roomIdInput = container.querySelector('#room-id-input') as HTMLInputElement;
    const authStatus = container.querySelector('#auth-status') as HTMLElement;
    const gameControls = container.querySelector('#game-controls') as HTMLElement;

    // Username connection
    connectBtn?.addEventListener('click', () => {
      const username = usernameInput?.value.trim();
      if (username) {
        authStatus?.classList.remove('hidden');
        this.updateAuthStatus('⏳ Connecting...', 'text-yellow-400');
        websocketService.authenticate(username);
      } else {
        alert('Please enter a username');
      }
    });

    // Allow Enter key to connect
    usernameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        connectBtn?.click();
      }
    });

    // Game controls
    createRoomBtn?.addEventListener('click', () => {
      websocketService.createRoom();
    });

    joinRoomBtn?.addEventListener('click', () => {
      const roomId = roomIdInput?.value.trim();
      if (roomId) {
        websocketService.joinRoom(roomId);
      } else {
        alert('Please enter a room ID');
      }
    });

    // Allow Enter key to join room
    roomIdInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        joinRoomBtn?.click();
      }
    });

    // Listen for room events
    window.addEventListener('room-created', (e: CustomEvent) => {
      this.updateRoomStatus(container, e.detail);
    });

    window.addEventListener('player-joined', (e: CustomEvent) => {
      this.updateRoomStatus(container, e.detail);
    });

    this.playerReadyListener = (e: CustomEvent) => {
      this.updateRoomStatus(container, e.detail);
    };
    window.addEventListener('player-ready', this.playerReadyListener);

    // Listen for game events
    this.gameStartListener = (e: CustomEvent) => {
      console.log('🎮 Game starting!', e.detail);
      this.updateRoomStatus(container, e.detail);
    };
    window.addEventListener('game-start', this.gameStartListener);

    this.gameCountdownListener = (e: CustomEvent) => {
      console.log('⏰ Countdown:', e.detail.countdown);
      // You can add countdown UI here
    };
    window.addEventListener('game-countdown', this.gameCountdownListener);

    this.gameStartedListener = (e: CustomEvent) => {
      console.log('🎮 Game is now active!', e.detail);
      // Hide ready button when game starts
      const readySection = container.querySelector('#ready-section') as HTMLElement;
      readySection?.classList.add('hidden');
    };
    window.addEventListener('game-started', this.gameStartedListener);

    this.gameEndListener = (e: CustomEvent) => {
      console.log('🏆 Game ended!', e.detail);
      // Reset room status and show ready button again
      this.updateRoomStatus(container, e.detail);
    };
    window.addEventListener('game-end', this.gameEndListener);

    // Listen for errors
    this.websocketErrorListener = (e: CustomEvent) => {
      alert(`Error: ${e.detail.message}`);
    };
    window.addEventListener('websocket-error', this.websocketErrorListener);

    // Show game controls when authenticated
    this.websocketAuthenticatedListener = (e: CustomEvent) => {
      if (e.detail.success) {
        gameControls?.classList.remove('hidden');
        if (e.detail.username) {
          this.updateAuthStatus(`✅ Connected as ${e.detail.username}`, 'text-green-400');
        }
      }
    };
    window.addEventListener('websocket-authenticated', this.websocketAuthenticatedListener);
  }

  private updateRoomStatus(container: HTMLElement, data: any) {
    const roomStatusDiv = container.querySelector('#room-status') as HTMLElement;
    const roomInfoDiv = container.querySelector('#room-info') as HTMLElement;
    const readySection = container.querySelector('#ready-section') as HTMLElement;

    if (data.room) {
      roomStatusDiv?.classList.remove('hidden');
      const players = data.room.players || [];
      const status = data.room.status;
      
      roomInfoDiv.innerHTML = `
        <p><strong>Room ID:</strong> <span class="font-mono text-blue-400">${data.room.id}</span></p>
        <p><strong>Status:</strong> <span class="text-${status === 'playing' ? 'green' : status === 'finished' ? 'red' : 'yellow'}-400">${status}</span></p>
        <p><strong>Players:</strong> ${players.length}/${data.room.maxPlayers}</p>
        <div class="mt-2">
          ${players.map((player: any, index: number) => 
            `<div class="text-sm ${player.isReady ? 'text-green-400' : 'text-gray-400'}">
              ${index + 1}. ${player.username} ${player.isHost ? '(Host)' : ''} ${player.isReady ? '✅ Ready' : '⏳ Waiting'}
            </div>`
          ).join('')}
        </div>
      `;

      // Show ready button if room is full and user is not ready
      if (players.length === data.room.maxPlayers && status === 'waiting') {
        readySection?.classList.remove('hidden');
        
        // Remove existing listeners to prevent duplicates
        const readyBtn = container.querySelector('#ready-btn') as HTMLButtonElement;
        const newReadyBtn = readyBtn?.cloneNode(true) as HTMLButtonElement;
        readyBtn?.parentNode?.replaceChild(newReadyBtn, readyBtn);
        
        // Check if current user is already ready
        const currentUser = websocketService.getCurrentRoom()?.players.find(p => p.socketId === websocketService.getSocketId());
        if (currentUser?.isReady) {
          newReadyBtn.textContent = '✅ Ready!';
          newReadyBtn.disabled = true;
        } else {
          newReadyBtn.textContent = '✅ Ready to Play';
          newReadyBtn.disabled = false;
          
          // Add ready button listener
          newReadyBtn?.addEventListener('click', () => {
            websocketService.sendReady(data.room.id);
            // Don't hide immediately, let the server update the status
            newReadyBtn.textContent = '⏳ Ready...';
            newReadyBtn.disabled = true;
          });
        }
      } else if (status === 'playing') {
        // Hide ready button when game is playing
        readySection?.classList.add('hidden');
      }
      // Don't hide ready button when status is 'waiting' and room is not full yet
    }
  }

  private updateAuthStatus(message: string, colorClass: string) {
    const authText = this.container?.querySelector('#auth-text') as HTMLElement;
    if (authText) {
      authText.textContent = message;
      authText.className = colorClass;
    }
  }

  public destroy() {
    // Clean up event listeners to prevent memory leaks
    this.cleanupEventListeners();
    
    this.container = null;
    this.isMultiplayerMode = false;
  }

  private cleanupEventListeners() {
    if (this.playerReadyListener) {
      window.removeEventListener('player-ready', this.playerReadyListener);
      this.playerReadyListener = undefined;
    }
    if (this.gameStartListener) {
      window.removeEventListener('game-start', this.gameStartListener);
      this.gameStartListener = undefined;
    }
    if (this.gameCountdownListener) {
      window.removeEventListener('game-countdown', this.gameCountdownListener);
      this.gameCountdownListener = undefined;
    }
    if (this.gameStartedListener) {
      window.removeEventListener('game-started', this.gameStartedListener);
      this.gameStartedListener = undefined;
    }
    if (this.gameEndListener) {
      window.removeEventListener('game-end', this.gameEndListener);
      this.gameEndListener = undefined;
    }
    if (this.websocketErrorListener) {
      window.removeEventListener('websocket-error', this.websocketErrorListener);
      this.websocketErrorListener = undefined;
    }
    if (this.websocketAuthenticatedListener) {
      window.removeEventListener('websocket-authenticated', this.websocketAuthenticatedListener);
      this.websocketAuthenticatedListener = undefined;
    }
  }
}

export const multiplayerToggle = new MultiplayerToggle(); 