import io from 'socket.io-client';
import { state } from '../state.js';

import {
  GameRoom,
  Player,
  GameState,
  GameInput,
  RoomEvent,
  GameStartEvent,
  GameUpdateEvent,
  GamePhase
} from '../multiplayer/types.js';

interface PlayerEventWithRoom {
  player: Player;
  players: Player[];
  roomId: string;
  room?: GameRoom;
}

class WebSocketService {
  public socket: any = null;
  private currentRoom: GameRoom | null = null;
  private currentRoomId: string | null = null;
  private authToken: string | null = null;
  private pendingEventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  private isAuthenticatedFlag: boolean = false;
  
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // 1s
  private reconnectTimer: number | null = null;
  private isReconnecting: boolean = false;

  connect(url: string) {
    if (this.socket) return;

    this.socket = io(url);

    // bind any listeners registered before connect
    if (this.pendingEventListeners.length) {
      for (const { event, callback } of this.pendingEventListeners) {
        this.socket.on(event, callback);
      }
      this.pendingEventListeners = [];
    }

    this.socket.on('connect', () => {
      // dispatch connection event for chat system
      window.dispatchEvent(new CustomEvent('websocketConnected'));

      // process pending event listeners
      this.processPendingEventListeners();
    });

    this.socket.on('disconnect', () => {
      this.handleDisconnect();
    });

    this.socket.on('authenticated', (data: { success: boolean; error?: string; username?: string }) => {
      if (data.success) {
        // reset reconnection state
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isReconnecting = false;
        this.isAuthenticatedFlag = true;
        // sync current presence immediately after auth
        try {
          const currentPath = window.location.pathname;
          this.socket.emit('updatePresence', { path: currentPath });
        } catch {}
        
        window.dispatchEvent(new CustomEvent('websocketAuthenticated', { detail: { success: true, username: data.username } }));
      } else {
        this.isAuthenticatedFlag = false;
        window.dispatchEvent(new CustomEvent('websocketAuthenticated', { detail: { success: false, error: data.error } }));
      }
    });

    this.socket.on('roomCreated', (data: RoomEvent) => {
      this.currentRoom = data.room;
      this.currentRoomId = data.roomId;
      window.dispatchEvent(new CustomEvent('roomCreated', { detail: data }));
    });

    this.socket.on('playerJoined', (data: PlayerEventWithRoom) => {
      this.currentRoom = data.room || this.currentRoom;
      this.currentRoomId = data.roomId;

      if (this.currentRoom) {
        this.currentRoom.players = data.players;
      }

      window.dispatchEvent(new CustomEvent('playerJoined', {
        detail: {
          player: data.player,
          players: data.players,
          roomId: data.roomId,
          room: this.currentRoom
        }
      }));
    });

    this.socket.on('gameStart', (data: GameStartEvent) => {
      if (this.currentRoom) {
        this.currentRoom.status = 'playing';
        this.currentRoom.players = data.players;
      }
      window.dispatchEvent(new CustomEvent('gameStart', {
        detail: {
          ...data,
          room: this.currentRoom
        }
      }));
    });

    this.socket.on('countdown', (data: { countdown: number }) => {
      window.dispatchEvent(new CustomEvent('gameCountdown', { detail: data }));
    });

    this.socket.on('gameStarted', (data: { gameState: GameState }) => {
      window.dispatchEvent(new CustomEvent('gameStarted', { detail: data }));
    });

    this.socket.on('gameUpdate', (data: GameUpdateEvent) => {
      window.dispatchEvent(new CustomEvent('gameUpdate', { detail: data }));
    });

    this.socket.on('gameEnd', (data: { winner: Player; gameState: GameState }) => {
      if (this.currentRoom) {
        this.currentRoom.status = 'finished';
      }
      window.dispatchEvent(new CustomEvent('gameEnd', { detail: data }));
    });

    this.socket.on('playerLeft', (data: PlayerEventWithRoom) => {
      if (this.currentRoom) {
        this.currentRoom.players = data.players;
      }
      window.dispatchEvent(new CustomEvent('playerLeft', {
        detail: {
          player: data.player,
          players: data.players,
          roomId: data.roomId,
          room: this.currentRoom
        }
      }));
    });

    this.socket.on('availableRooms', (data: any) => {
      window.dispatchEvent(new CustomEvent('availableRooms', { detail: data }));
    });

    this.socket.on('roomMessage', (data: any) => {
      window.dispatchEvent(new CustomEvent('roomMessage', { detail: data }));
    });

    this.socket.on('roomUpdated', (data: any) => {
      window.dispatchEvent(new CustomEvent('roomUpdated', { detail: data }));
    });

    this.socket.on('error', (data: any) => {
      window.dispatchEvent(new CustomEvent('websocketError', { detail: data }));
    });

    this.socket.on('playerReady', (data: PlayerEventWithRoom) => {
      if (this.currentRoom) {
        this.currentRoom.players = data.players;
      }
      window.dispatchEvent(new CustomEvent('playerReady', {
        detail: {
          player: data.player,
          players: data.players,
          roomId: data.roomId,
          room: this.currentRoom
        }
      }));
    });

    this.socket.on('chatMessage', (data: any) => {
      window.dispatchEvent(new CustomEvent('chatMessage', { detail: data }));
    });

    this.socket.on('directMessage', (data: any) => {
      window.dispatchEvent(new CustomEvent('directMessage', { detail: data }));
    });

    this.socket.on('gameInvite', (data: any) => {
      try { localStorage.setItem('lastInvite', JSON.stringify(data)); } catch {}
      window.dispatchEvent(new CustomEvent('gameInvite', { detail: data }));
    });

    this.socket.on('inviteAccepted', (data: any) => {
      window.dispatchEvent(new CustomEvent('inviteAccepted', { detail: data }));
    });

    this.socket.on('navigateToGame', (data: any) => {
      window.dispatchEvent(new CustomEvent('navigateToGame', { detail: data }));
    });

    this.socket.on('inviteDeclined', (data: any) => {
      window.dispatchEvent(new CustomEvent('inviteDeclined', { detail: data }));
    });

    this.socket.on('chatError', (data: any) => {
      window.dispatchEvent(new CustomEvent('chatError', { detail: data }));
    });

    this.socket.on('userBlocked', (data: any) => {
      window.dispatchEvent(new CustomEvent('userBlocked', { detail: data }));
    });

    this.socket.on('inviteSent', (data: any) => {
      window.dispatchEvent(new CustomEvent('inviteSent', { detail: data }));
    });

    this.socket.on('messageDelivered', (data: { messageId: number; receiverUsername: string; status: string }) => {
      window.dispatchEvent(new CustomEvent('messageDelivered', { detail: data }));
    });

    this.socket.on('userStatusUpdate', (data: any) => {
      window.dispatchEvent(new CustomEvent('userStatusUpdate', { detail: data }));
    });

    this.socket.on('onlineUsers', (data: any) => {
      window.dispatchEvent(new CustomEvent('onlineUsers', { detail: data }));
    });


  }

  authenticate(username: string) {
    this.authToken = username;
    const rawId = localStorage.getItem('userId');
    const userId = rawId ? parseInt(rawId) : undefined;
    const payload: any = { username };
    if (userId && Number.isFinite(userId) && userId > 0) payload.userId = userId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', payload);
    } else if (this.socket) {
      this.socket.once('connect', () => {
        this.socket.emit('authenticate', payload);
      });
    }
  }

  createRoom(settings?: any) {
    if (this.socket) {
      this.socket.emit('createRoom', settings || {});
    }
  }

  joinRoom(roomId: string) {
    if (this.socket) {
      this.currentRoomId = roomId;
      if (this.isAuthenticatedFlag) {
        this.socket.emit('joinRoom', { roomId });
      } else {
        window.addEventListener('websocketAuthenticated', () => {
          if (this.socket) this.socket.emit('joinRoom', { roomId });
        }, { once: true });
      }
    }
  }



  sendGameInput(roomId: string, type: GameInput['type'], data: any) {
    if (this.socket) {
      this.socket.emit('gameInput', { roomId, type, ...data });
    }
  }

  sendPaddleMove(roomId: string, direction: number) {
    this.sendGameInput(roomId, 'paddleMove', { direction });
  }

  sendPaddleStop(roomId: string) {
    this.sendGameInput(roomId, 'paddleStop', {});
  }

  sendBrowserLog(level: string, message: string, data?: any) {
    if (this.socket) {
      this.socket.emit('browserLog', { level, message, data, timestamp: Date.now() });
    }
  }

  getCurrentRoom(): GameRoom | null {
    return this.currentRoom;
  }

  getSocketId(): string | null {
    const socketId = this.socket?.id || null;
    return socketId;
  }

  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  send(event: string, data?: any) {
    this.emit(event, data);
  }

  getAvailableRooms() {
    this.emit('getAvailableRooms');
  }

  sendReady(roomId: string) {
    if (this.socket) {
      if (this.isAuthenticatedFlag) {
        this.socket.emit('playerReady', { roomId });
      } else {
        window.addEventListener('websocketAuthenticated', () => {
          if (this.socket) this.socket.emit('playerReady', { roomId });
        }, { once: true });
      }
    }
  }

  leaveRoom(roomId: string) {
    if (this.socket) {
      if (this.isAuthenticatedFlag) {
        this.socket.emit('leaveRoom', { roomId });
      } else {
        window.addEventListener('websocketAuthenticated', () => {
          if (this.socket) this.socket.emit('leaveRoom', { roomId });
        }, { once: true });
      }
    }
  }

  onMessage(cb: (data: any) => void) {
    if (this.socket) {
      this.socket.on('message', cb);
    } else {
      this.pendingEventListeners.push({ event: 'message', callback: cb });
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  private processPendingEventListeners() {
    if (this.pendingEventListeners.length) {
      for (const { event, callback } of this.pendingEventListeners) {
        this.socket.on(event, callback);
      }
      this.pendingEventListeners = [];
    }
  }

  private handleDisconnect() {
    window.dispatchEvent(new CustomEvent('websocketDisconnected'));

    if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;

      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnect();
      }, this.reconnectDelay);

      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // max 30s
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      window.dispatchEvent(new CustomEvent('websocketError', {
        detail: { message: 'Connection lost. Max reconnection attempts reached.' }
      }));
    }
  }

  private attemptReconnect() {
    if (this.socket) {
      this.socket.connect();
      this.isReconnecting = false;
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
    }
  }
}

export const websocketService = new WebSocketService();