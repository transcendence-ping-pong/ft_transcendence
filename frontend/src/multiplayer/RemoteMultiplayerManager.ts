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
  private hasAutoJoined: boolean = false;
  private hasAutoReadied: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  public connect(username: string) {
    this.currentUsername = username;
  }

  public createRoom(settings: any) {
    websocketService.createRoom(settings);
  }

  public joinRoom(roomId: string) {
    websocketService.joinRoom(roomId);
  }

  public setReady() {
    if (this.state.currentRoomId) {
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

  public getState() {
    return { ...this.state };
  }

  public getCurrentRoom() {
    return this.state.currentRoom;
  }

  public isInRoom() {
    return this.state.currentRoomId !== null;
  }

  private setupEventListeners() {
    window.addEventListener('websocketAuthenticated', () => {
      if (this.state.currentRoomId && !this.hasAutoJoined) {
        this.joinRoom(this.state.currentRoomId);
        this.hasAutoJoined = true;
      }
    });

    window.addEventListener('roomCreated', (e: CustomEvent) => {
      this.state.currentRoom = this.mapToRemoteRoom(e.detail.room);
      this.state.currentRoomId = e.detail.roomId;
      this.state.isHost = true;
      this.state.isReady = false;
      this.state.isConnected = true;
      
      window.dispatchEvent(new CustomEvent('roomStateChanged', { 
        detail: { ...this.state } 
      }));
    });

    window.addEventListener('playerJoined', (e: CustomEvent) => {
      
      if (!this.state.currentRoom) {
        this.state.currentRoom = this.mapToRemoteRoom(e.detail.room);
        this.state.currentRoomId = e.detail.roomId;
        this.state.isHost = false;
        this.state.isReady = false;
        this.state.isConnected = true;
        
        window.dispatchEvent(new CustomEvent('roomStateChanged', { 
          detail: { ...this.state } 
        }));
      } else {
        this.state.currentRoom.currentPlayers = e.detail.room?.currentPlayers || 2;
        
        if (e.detail.room) {
          this.state.currentRoom = this.mapToRemoteRoom(e.detail.room);
        }
        
        window.dispatchEvent(new CustomEvent('guestJoined', { 
          detail: { room: this.state.currentRoom } 
        }));
      }
    });

    window.addEventListener('playerReady', (e: CustomEvent) => {
      if (this.state.currentRoom) {
        const readyPlayer = e.detail.player;
        const isHostReady = readyPlayer.username === this.state.currentRoom.hostUsername;
        
        if (isHostReady) {
          this.state.currentRoom.hostReady = true;
        } else {
          this.state.currentRoom.guestReady = true;
        }
        
        // update current user's ready status if it's them
        if (readyPlayer.username === (this.state.isHost ? this.state.currentRoom.hostUsername : this.currentUsername)) {
          this.state.isReady = true;
        }
        
        window.dispatchEvent(new CustomEvent('playerReadyStatus', { 
          detail: { 
            readyPlayer: readyPlayer.username,
            isHostReady,
            room: this.state.currentRoom,
            fullState: { ...this.state }
          } 
        }));
      }
    });

    window.addEventListener('playerLeft', (e: CustomEvent) => {
      if (this.state.currentRoom) {
        this.state.currentRoom.currentPlayers = Math.max(1, this.state.currentRoom.currentPlayers - 1);
        
        window.dispatchEvent(new CustomEvent('roomStateChanged', { 
          detail: { ...this.state } 
        }));
      }
    });

    window.addEventListener('availableRooms', (e: CustomEvent) => {
      window.dispatchEvent(new CustomEvent('availableRoomsList', { 
        detail: e.detail 
      }));
    });

    window.addEventListener('websocketError', (e: CustomEvent) => {
      if (e.detail.message?.includes('Connection lost') || e.detail.message?.includes('Max reconnection attempts')) {
        this.resetState();
        window.dispatchEvent(new CustomEvent('connectionLost', { 
          detail: e.detail 
        }));
      }
    });

    // Game start - both players ready
    window.addEventListener('gameStart', (e: CustomEvent) => {
      if (this.state.currentRoom) {
        this.state.currentRoom.status = 'playing';
        window.dispatchEvent(new CustomEvent('hideMultiplayerUI'));
      }
    });

    window.addEventListener('inviteAccepted', (e: CustomEvent) => {
      if (!this.state.currentRoom && e.detail.room) {
        this.setInviteRoom(e.detail.room, false);
      }
    });
  }

  public setInviteRoom(room: any, isHost: boolean) {
    const mappedRoom = this.mapToRemoteRoom(room);
    this.state.currentRoom = mappedRoom;
    this.state.currentRoomId = mappedRoom.id;
    this.state.isHost = isHost;
    this.state.isReady = false;
    this.state.isConnected = true;

    try {
      (websocketService as any).currentRoomId = mappedRoom.id;
    } catch {}

    // reset auto-flow flags for a fresh invite session
    this.hasAutoJoined = false;
    this.hasAutoReadied = false;

    // hard sync: if we are guest, immediately try to join once authenticated
    if (!this.state.isHost && this.state.currentRoomId) {
      if ((websocketService as any).isAuthenticatedFlag) {
        this.joinRoom(this.state.currentRoomId);
      } else {
        window.addEventListener('websocketAuthenticated', () => {
          this.joinRoom(this.state.currentRoomId as string);
        }, { once: true });
      }
    }
    
    window.dispatchEvent(new CustomEvent('roomStateChanged', { 
      detail: { ...this.state } 
    }));
  }

  private mapToRemoteRoom(room: any): RemoteGameRoom {
    const hostPlayer = room.players?.find((p: any) => p.isHost);
    const guestPlayer = room.players?.find((p: any) => !p.isHost);
    const hostUsername = room.hostUsername || hostPlayer?.username || room.host?.username || 'Unknown';
    const guestUsername = guestPlayer?.username;
    
    return {
      id: room.id || room.roomId,
      hostUsername,
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
    window.removeEventListener('roomCreated', () => {});
    window.removeEventListener('playerJoined', () => {});
    window.removeEventListener('playerReady', () => {});
    window.removeEventListener('playerLeft', () => {});
    window.removeEventListener('availableRooms', () => {});
    window.removeEventListener('websocketError', () => {});
    window.removeEventListener('gameStart', () => {});
    window.removeEventListener('inviteAccepted', () => {});
  }
}

export const remoteMultiplayerManager = new RemoteMultiplayerManager();
