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

  connect(url: string) {
    if (this.socket) return;
    
    this.socket = io(url, {
      query: { clientId: state.clientId }
    });

    this.socket.on('connect', () => {
      // auth if we have a token, later with other backend
      if (this.authToken) {
        this.authenticate(this.authToken);
      }
    });

    this.socket.on('disconnect', () => {
      // connection lost - TODO: notify user
    });

    this.socket.on('authenticated', (data: { success: boolean; error?: string; username?: string }) => {
      if (data.success) {
        window.dispatchEvent(new CustomEvent('websocket-authenticated', { detail: { success: true, username: data.username } }));
      } else {
        window.dispatchEvent(new CustomEvent('websocket-authenticated', { detail: { success: false, error: data.error } }));
      }
    });

    this.socket.on('roomCreated', (data: RoomEvent) => {
      this.currentRoom = data.room;
      this.currentRoomId = data.roomId;
      window.dispatchEvent(new CustomEvent('room-created', { detail: data }));
    });

    this.socket.on('playerJoined', (data: PlayerEventWithRoom) => {
      this.currentRoom = data.room || this.currentRoom;
      this.currentRoomId = data.roomId;
      
      if (this.currentRoom) {
        this.currentRoom.players = data.players;
      }
      
      window.dispatchEvent(new CustomEvent('player-joined', { 
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
      window.dispatchEvent(new CustomEvent('game-start', { 
        detail: { 
          ...data, 
          room: this.currentRoom 
        } 
      }));
    });

	// TODO: add proper countdown UI
    this.socket.on('countdown', (data: { countdown: number }) => {
      window.dispatchEvent(new CustomEvent('game-countdown', { detail: data }));
    });

    this.socket.on('gameStarted', (data: { gameState: GameState }) => {
      window.dispatchEvent(new CustomEvent('game-started', { detail: data }));
    });

    this.socket.on('gameUpdate', (data: GameUpdateEvent) => {
      window.dispatchEvent(new CustomEvent('game-update', { detail: data }));
    });

    this.socket.on('playerReady', (data: PlayerEventWithRoom) => {
      if (this.currentRoom && data.room) {
        this.currentRoom.players = data.players;
        this.currentRoom = data.room;
      }
      
      window.dispatchEvent(new CustomEvent('player-ready', { 
        detail: { 
          player: data.player, 
          players: data.players,
          room: data.room || this.currentRoom 
        } 
      }));
    });

	// TODO: add proper end game UI
    this.socket.on('gameEnd', (data: { gameState: GameState; winner: Player; players: Player[] }) => {
      window.dispatchEvent(new CustomEvent('game-end', { detail: data }));
    });

	// TODO: add proper player left notification
    this.socket.on('playerLeft', (data: PlayerEventWithRoom) => {
      if (this.currentRoom) {
        this.currentRoom.players = data.players;
      }
      window.dispatchEvent(new CustomEvent('player-left', { detail: data }));
    });

    this.socket.on('error', (data: { message: string }) => {
      window.dispatchEvent(new CustomEvent('websocket-error', { detail: data }));
    });
  }

  authenticate(username: string) {
    this.authToken = username;
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', { username });
    } else if (this.socket) {
      // If socket exists but not connected, wait for connection
      this.socket.once('connect', () => {
        this.socket.emit('authenticate', { username });
      });
    }
  }

  createRoom() {
    if (this.socket) {
      this.socket.emit('createRoom', {});
    }
  }

  joinRoom(roomId: string) {
    if (this.socket) {
      this.currentRoomId = roomId; // Set immediately
      this.socket.emit('joinRoom', { roomId });
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

  sendReady(roomId: string) {
    this.sendGameInput(roomId, 'ready', {});
  }

  // sends browser console logs to backend for debugging
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

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // on message TODO: later
  onMessage(cb: (data: any) => void) {
    if (this.socket) {
      this.socket.on('message', cb);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
    }
  }
}

export const websocketService = new WebSocketService();