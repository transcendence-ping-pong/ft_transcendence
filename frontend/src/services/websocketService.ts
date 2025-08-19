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
  private socket: any = null;
  private currentRoom: GameRoom | null = null;
  private currentRoomId: string | null = null;
  private authToken: string | null = null;
  private pendingEventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  private isAuthenticatedFlag: boolean = false;
  
  // reconnection settings
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // start with 1 second
  private reconnectTimer: number | null = null;
  private isReconnecting: boolean = false;

  connect(url: string) {
    if (this.socket) return;
    
    this.socket = io(url);

    // Bind any listeners registered before connect
    if (this.pendingEventListeners.length) {
      for (const { event, callback } of this.pendingEventListeners) {
        this.socket.on(event, callback);
      }
      this.pendingEventListeners = [];
    }

    this.socket.on('connect', () => {
      // dispatch connection event for chat system
      window.dispatchEvent(new CustomEvent('websocketConnected'));
      
      // Process pending event listeners
      this.processPendingEventListeners();
    });

    this.socket.on('disconnect', () => {
      this.handleDisconnect();
    });

    this.socket.on('authenticated', (data: { success: boolean; error?: string; username?: string }) => {
      if (data.success) {
        // reset reconnection state on successful connection
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isReconnecting = false;
        this.isAuthenticatedFlag = true;
        
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

	// todo: add proper countdown ui
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

    // Chat system events
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

    // navigate both clients to game with room info
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

    // Listen for message delivery confirmation
    this.socket.on('messageDelivered', (data: { messageId: number; receiverUsername: string; status: string }) => {
      window.dispatchEvent(new CustomEvent('messageDelivered', { detail: data }));
    });

    // Listen for user status updates
    this.socket.on('userStatusUpdate', (data: any) => {
      window.dispatchEvent(new CustomEvent('userStatusUpdate', { detail: data }));
    });

    // Online users list
    this.socket.on('onlineUsers', (data: any) => {
      window.dispatchEvent(new CustomEvent('onlineUsers', { detail: data }));
    });


  }

  authenticate(username: string) {
    // authenticates user with backend using username
    this.authToken = username;
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', { username });
    } else if (this.socket) {
      // if socket exists but not connected, wait for connection
      this.socket.once('connect', () => {
        this.socket.emit('authenticate', { username });
      });
    }
  }

  createRoom(settings?: any) {
    // creates new game room with optional settings
    if (this.socket) {
      this.socket.emit('createRoom', settings || {});
    }
  }

  joinRoom(roomId: string) {
    // joins existing room and sets current room id
    if (this.socket) {
      // set immediately to avoid race with UI emitting ready/leave before server echoes
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
    // sends game input to specific room
    if (this.socket) {
      this.socket.emit('gameInput', { roomId, type, ...data });
    }
  }

  sendPaddleMove(roomId: string, direction: number) {
    // sends paddle movement input to room
    this.sendGameInput(roomId, 'paddleMove', { direction });
  }

  sendPaddleStop(roomId: string) {
    // sends paddle stop input to room
    this.sendGameInput(roomId, 'paddleStop', {});
  }



  // sends browser console logs to backend for debugging
  sendBrowserLog(level: string, message: string, data?: any) {
    if (this.socket) {
      this.socket.emit('browserLog', { level, message, data, timestamp: Date.now() });
    }
  }

  getCurrentRoom(): GameRoom | null {
    // returns current room object or null
    return this.currentRoom;
  }

  getSocketId(): string | null {
    // returns current socket id or null
    const socketId = this.socket?.id || null;
    return socketId;
  }

  getCurrentRoomId(): string | null {
    // returns current room id or null
    return this.currentRoomId;
  }

  isConnected(): boolean {
    // returns true if websocket is connected
    return this.socket?.connected || false;
  }

  emit(event: string, data?: any) {
    // emits custom event to websocket server
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  send(event: string, data?: any) {
    // alias for emit method for consistency with chat service
    this.emit(event, data);
  }

  getAvailableRooms() {
    // requests list of available rooms from backend
    this.emit('getAvailableRooms');
  }

  sendReady(roomId: string) {
    // sends ready status to room
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
    // leaves current room
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

  // on message todo: later
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

  // setupEventListeners removed - all event handling is now in the main connection setup
  // prevents duplicate event listeners and conflicts

  private processPendingEventListeners() {
    if (this.pendingEventListeners.length) {
      for (const { event, callback } of this.pendingEventListeners) {
        this.socket.on(event, callback);
      }
      this.pendingEventListeners = [];
    }
  }

  private handleDisconnect() {
    // dispatch disconnect event
    window.dispatchEvent(new CustomEvent('websocketDisconnected'));
    
    // attempt reconnection if not already reconnecting
    if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      
      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnect();
      }, this.reconnectDelay);
      
      // exponential backoff: double the delay for next attempt
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // max 30 seconds
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
    // clear reconnection timer
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