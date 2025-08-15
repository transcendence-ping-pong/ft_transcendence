import { websocketService } from '@/services/websocketService.js';
import { RemoteGameRoom } from './types.js';

export class RemoteMultiplayerManager {
  private state = {
    currentRoom: null as RemoteGameRoom | null,
    currentRoomId: null as string | null,
    isHost: false,
    isReady: false,
    isConnected: false
  };
  
  private currentUsername: string = '';

  constructor() {
    this.setupEventListeners();
  }

  // PUBLIC API - Simple methods for UI to call
  public connect(username: string) {
    this.currentUsername = username;
    websocketService.connect(`http://localhost:3000`);
    websocketService.authenticate(username);
  }

  public createRoom(settings: any) {
    websocketService.createRoom(settings);
  }

  public joinRoom(roomId: string) {
    websocketService.joinRoom(roomId);
  }

  public setReady() {
    if (this.state.currentRoomId) {
      // Update local state immediately for responsive UI
      this.state.isReady = true;
      websocketService.sendReady(this.state.currentRoomId);
    }
  }

  public leaveRoom() {
    if (this.state.currentRoomId) {
      websocketService.leaveRoom(this.state.currentRoomId);
      this.resetState();
    }
  }

  public requestAvailableRooms() {
    websocketService.getAvailableRooms();
  }

  // PUBLIC API - State getters
  public getState() {
    return { ...this.state };
  }

  public getCurrentRoom() {
    return this.state.currentRoom;
  }

  public isInRoom() {
    return this.state.currentRoomId !== null;
  }

  // PRIVATE - Event handling (clean signal system)
  private setupEventListeners() {
    // Room creation - Host becomes host
    window.addEventListener('roomCreated', (e: CustomEvent) => {
      console.log('RemoteMultiplayerManager: Room created', e.detail);
      this.state.currentRoom = this.mapToRemoteRoom(e.detail.room);
      this.state.currentRoomId = e.detail.roomId;
      this.state.isHost = true;
      this.state.isReady = false;
      this.state.isConnected = true;
      
      // Dispatch clean signal to UI
      window.dispatchEvent(new CustomEvent('roomStateChanged', { 
        detail: { ...this.state } 
      }));
    });

    // Player joined - Guest joins or host sees guest
    window.addEventListener('playerJoined', (e: CustomEvent) => {
      console.log('RemoteMultiplayerManager: Player joined', e.detail);
      
      // If we don't have a current room, we're the guest joining
      if (!this.state.currentRoom) {
        // Guest just joined, set up guest state
        this.state.currentRoom = this.mapToRemoteRoom(e.detail.room);
        this.state.currentRoomId = e.detail.roomId;
        this.state.isHost = false;
        this.state.isReady = false;
        this.state.isConnected = true;
        
        console.log('RemoteMultiplayerManager: Guest joined, setting up guest state', this.state);
        
        // Dispatch room state changed signal for guest
        window.dispatchEvent(new CustomEvent('roomStateChanged', { 
          detail: { ...this.state } 
        }));
      } else {
        // We already have a room, so we're the host seeing a guest join
        // Update room state with guest information
        this.state.currentRoom.currentPlayers = e.detail.room?.currentPlayers || 2;
        
        // Update the room object with guest information from the event
        if (e.detail.room) {
          this.state.currentRoom = this.mapToRemoteRoom(e.detail.room);
        }
        
        // Host sees guest joined
        window.dispatchEvent(new CustomEvent('guestJoined', { 
          detail: { room: this.state.currentRoom } 
        }));
      }
    });

    // Player ready - Someone clicked ready
    window.addEventListener('playerReady', (e: CustomEvent) => {
      console.log('RemoteMultiplayerManager: Player ready', e.detail);
      
      if (this.state.currentRoom) {
        const readyPlayer = e.detail.player;
        const isHostReady = readyPlayer.username === this.state.currentRoom.hostUsername;
        
        // Update ready status in room
        if (isHostReady) {
          this.state.currentRoom.hostReady = true;
        } else {
          this.state.currentRoom.guestReady = true;
        }
        
        // Update current user's ready status if it's them
        if (readyPlayer.username === (this.state.isHost ? this.state.currentRoom.hostUsername : this.currentUsername)) {
          this.state.isReady = true;
        }
        
        // Dispatch clean signal with ready info AND updated room state
        window.dispatchEvent(new CustomEvent('playerReadyStatus', { 
          detail: { 
            readyPlayer: readyPlayer.username,
            isHostReady,
            room: this.state.currentRoom,
            // Include full state so UI can show both players' ready status
            fullState: { ...this.state }
          } 
        }));
      }
    });

    // Player left - Someone left the room
    window.addEventListener('playerLeft', (e: CustomEvent) => {
      console.log('RemoteMultiplayerManager: Player left', e.detail);
      
      if (this.state.currentRoom) {
        this.state.currentRoom.currentPlayers = Math.max(1, this.state.currentRoom.currentPlayers - 1);
        
        // Dispatch clean signal
        window.dispatchEvent(new CustomEvent('roomStateChanged', { 
          detail: { ...this.state } 
        }));
      }
    });

    // Available rooms - List of games to join
    window.addEventListener('availableRooms', (e: CustomEvent) => {
      console.log('RemoteMultiplayerManager: Available rooms received', e.detail);
      
      // Dispatch clean signal with rooms list
      window.dispatchEvent(new CustomEvent('availableRoomsList', { 
        detail: e.detail 
      }));
    });

    // WebSocket errors - Handle connection issues
    window.addEventListener('websocketError', (e: CustomEvent) => {
      console.error('RemoteMultiplayerManager: WebSocket error', e.detail);
      
      // Reset state on connection errors
      if (e.detail.message?.includes('Connection lost') || e.detail.message?.includes('Max reconnection attempts')) {
        this.resetState();
        window.dispatchEvent(new CustomEvent('connectionLost', { 
          detail: e.detail 
        }));
      }
    });

    // Game start - Both players ready
    window.addEventListener('gameStart', (e: CustomEvent) => {
      console.log('RemoteMultiplayerManager: Game starting', e.detail);
      
      if (this.state.currentRoom) {
        this.state.currentRoom.status = 'playing';
        window.dispatchEvent(new CustomEvent('gameStarting', { 
          detail: { room: this.state.currentRoom } 
        }));
      }
    });
  }

  // PRIVATE - Helper methods
  private mapToRemoteRoom(room: any): RemoteGameRoom {
    // Find guest player (non-host player)
    const guestPlayer = room.players?.find((p: any) => !p.isHost);
    const guestUsername = guestPlayer?.username;
    

    
    return {
      id: room.id || room.roomId,
      hostUsername: room.hostUsername || room.host?.username || 'Unknown',
      guestUsername: guestUsername,
      difficulty: room.difficulty || 'MEDIUM',
      gameType: room.gameType || 'ONE MATCH',
      playerMode: room.playerMode || 'TWO PLAYERS',
      currentPlayers: room.currentPlayers || room.players?.length || 1,
      maxPlayers: room.maxPlayers || 2,
      status: room.status || 'waiting',
      hostReady: room.hostReady || false,
      guestReady: room.guestReady || false
    };
  }

  private resetState() {
    this.state = {
      currentRoom: null,
      currentRoomId: null,
      isHost: false,
      isReady: false,
      isConnected: false
    };
  }

  public destroy() {
    // Clean up event listeners
    window.removeEventListener('roomCreated', () => {});
    window.removeEventListener('playerJoined', () => {});
    window.removeEventListener('playerReady', () => {});
    window.removeEventListener('playerLeft', () => {});
    window.removeEventListener('availableRooms', () => {});
    window.removeEventListener('websocketError', () => {});
    window.removeEventListener('gameStart', () => {});
  }
}

// Singleton instance
export const remoteMultiplayerManager = new RemoteMultiplayerManager();
