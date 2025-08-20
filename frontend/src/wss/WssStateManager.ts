import { WssGameManager } from './WssGameManager';
import { WssRoomManager } from './WssRoomManager';
import { WssUserManager } from './WssUserManager';
import { WssChatManager } from './WssChatManager';
import io from 'socket.io-client';

/**
 * central state manager for all multiplayer and chat functionality
 * orchestrates communication between different managers and components
 */
export class WssStateManager {
  private static instance: WssStateManager;
  
  // core state
  private _currentUser: { username: string; userId: string } | null = null;
  private _currentRoom: any = null;
  private _onlineUsers: any[] = [];
  private _pendingInvites: any[] = [];
  private _isAuthenticated: boolean = false;
  private _isChatOpen: boolean = false;
  private _globalMessages: any[] = [];
  private _directMessages: any[] = [];
  
  // websocket connection
  private socket: any = null;
  private currentRoomId: string | null = null;
  private authToken: string | null = null;
  
  // state change listeners
  private stateListeners: Map<string, Set<(data: any) => void>> = new Map();
  
  // manager instances
  private gameManager: WssGameManager;
  private roomManager: WssRoomManager;
  private userManager: WssUserManager;
  private chatManager: WssChatManager;
  
  private constructor() {
    this.gameManager = new WssGameManager(this);
    this.roomManager = new WssRoomManager(this);
    this.userManager = new WssUserManager(this);
    this.chatManager = new WssChatManager(this);
  }
  
  static getInstance(): WssStateManager {
    if (!WssStateManager.instance) {
      WssStateManager.instance = new WssStateManager();
    }
    return WssStateManager.instance;
  }
  
  // websocket connection methods
  connect(url: string) {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.socket = io(url);
    this.setupWebSocketHandlers();
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._isAuthenticated = false;
    this.currentRoomId = null;
  }
  
  authenticate(username: string) {
    if (this.isAuthenticated && this.authToken === username) {
      return;
    }
    
    this.authToken = username;
    const userId = Date.now().toString();
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', { username, userId });
    } else if (this.socket) {
      this.socket.once('connect', () => {
        this.socket.emit('authenticate', { username, userId });
      });
    }
  }
  
  emit(event: string, data?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot emit event:', event);
    }
  }
  
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  
  // setup websocket event handlers
  private setupWebSocketHandlers() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      window.dispatchEvent(new CustomEvent('websocketConnected'));
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this._isAuthenticated = false;
      window.dispatchEvent(new CustomEvent('websocketDisconnected'));
    });
    
    this.socket.on('connect_error', (error: any) => {
      console.error(' WebSocket connection error:', error);
      window.dispatchEvent(new CustomEvent('websocketError', { detail: error }));
    });
    
    // route all events through the state manager
    this.socket.on('authenticated', (data: any) => {
      this.handleWebSocketEvent('authenticated', data);
    });
    
    this.socket.on('roomJoined', (data: any) => {
      this.currentRoomId = data.roomId;
      this.handleWebSocketEvent('roomJoined', data);
    });
    
    this.socket.on('roomUpdated', (data: any) => {
      this.handleWebSocketEvent('roomUpdated', data);
    });
    
    this.socket.on('availableRooms', (data: any) => {
      this.handleWebSocketEvent('availableRooms', data);
    });
    
    this.socket.on('roomMessage', (data: any) => {
      this.handleWebSocketEvent('roomMessage', data);
    });
    
    this.socket.on('gameStart', (data: any) => {
      this.handleWebSocketEvent('gameStart', data);
    });
    
    this.socket.on('gameEnd', (data: any) => {
      this.handleWebSocketEvent('gameEnd', data);
    });
    
    this.socket.on('gameEnded', (data: any) => {
      this.handleWebSocketEvent('gameEnded', data);
    });
    
    this.socket.on('gameUpdate', (data: any) => {
      this.handleWebSocketEvent('gameUpdate', data);
    });
    
    this.socket.on('countdown', (data: any) => {
      this.handleWebSocketEvent('countdown', data);
    });
    
    this.socket.on('gameStarted', (data: any) => {
      this.handleWebSocketEvent('gameStarted', data);
    });
    
    this.socket.on('playerLeft', (data: any) => {
      this.handleWebSocketEvent('playerLeft', data);
    });
    
    this.socket.on('playerReady', (data: any) => {
      this.handleWebSocketEvent('playerReady', data);
    });
    
    this.socket.on('chatMessage', (data: any) => {
      this.handleWebSocketEvent('chatMessage', data);
    });
    
    this.socket.on('directMessage', (data: any) => {
      this.handleWebSocketEvent('directMessage', data);
    });
    
    this.socket.on('chatError', (data: any) => {
      this.handleWebSocketEvent('chatError', data);
    });
    
    this.socket.on('messageDelivered', (data: any) => {
      this.handleWebSocketEvent('messageDelivered', data);
    });
    
    this.socket.on('gameInvite', (data: any) => {
      this.handleWebSocketEvent('gameInvite', data);
    });
    
    this.socket.on('inviteAccepted', (data: any) => {
      this.handleWebSocketEvent('inviteAccepted', data);
    });
    
    this.socket.on('inviteDeclined', (data: any) => {
      this.handleWebSocketEvent('inviteDeclined', data);
    });
    
    this.socket.on('inviteSent', (data: any) => {
      this.handleWebSocketEvent('inviteSent', data);
    });
    
    this.socket.on('onlineUsers', (data: any) => {
      this.handleWebSocketEvent('onlineUsers', data);
    });
    
    this.socket.on('userBlocked', (data: any) => {
      this.handleWebSocketEvent('userBlocked', data);
    });
    
    this.socket.on('notification', (data: any) => {
      window.dispatchEvent(new CustomEvent('notification', { detail: data }));
    });
    
    this.socket.on('error', (data: any) => {
      window.dispatchEvent(new CustomEvent('websocketError', { detail: data }));
    });
  }
  
  // getters for components
  get currentUser() { return this._currentUser; }
  get currentRoom() { return this._currentRoom; }
  get onlineUsers() { return this._onlineUsers; }
  get pendingInvites() { return this._pendingInvites; }
  get isAuthenticated() { return this._isAuthenticated; }
  get isChatOpen() { return this._isChatOpen; }
  get globalMessages() { return this._globalMessages; }
  get directMessages() { return this._directMessages; }
  
  // message methods
  getGlobalMessages() { return this._globalMessages; }
  getDirectMessages() { return this._directMessages; }
  
  addGlobalMessage(message: any) {
    this._globalMessages.push(message);
    this.notifyListeners('globalMessages', this._globalMessages);
  }
  
  addDirectMessage(message: any) {
    this._directMessages.push(message);
    this.notifyListeners('directMessages', this._directMessages);
  }
  
  // manager access
  get game() { return this.gameManager; }
  get room() { return this.roomManager; }
  get user() { return this.userManager; }
  get chat() { return this.chatManager; }
  
  // subscribe to state changes
  subscribe(event: string, callback: (data: any) => void) {
    if (!this.stateListeners.has(event)) {
      this.stateListeners.set(event, new Set());
    }
    this.stateListeners.get(event)!.add(callback);
    
    // return unsubscribe function
    return () => {
      const listeners = this.stateListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  // notify all listeners of state change
  private notifyListeners(event: string, data: any) {
    const listeners = this.stateListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
  
  // update state and notify listeners
  updateState(key: string, value: any) {
    (this as any)[`_${key}`] = value;
    this.notifyListeners(key, value);
  }
  
  // set chat open state
  setChatOpen(isOpen: boolean) {
    this._isChatOpen = isOpen;
    this.notifyListeners('isChatOpen', isOpen);
  }
  
  // handle websocket events from backend
  handleWebSocketEvent(event: string, data: any) {
    switch (event) {
      case 'authenticated':
        this.userManager.handleAuthentication(data);
        break;
      case 'roomJoined':
        this.roomManager.handleRoomJoined(data);
        break;
      case 'gameStart':
        this.gameManager.handleGameStart(data);
        break;
      case 'gameEnded':
        this.gameManager.handleGameEnded(data);
        break;
      case 'playerLeft':
        this.roomManager.handlePlayerLeft(data);
        break;
      case 'chatMessage':
        this.chatManager.handleChatMessage(data);
        break;
      case 'gameInvite':
        this.userManager.handleGameInvite(data);
        break;
      default:
        // delegate to appropriate manager
        this.gameManager.handleEvent(event, data) ||
        this.roomManager.handleEvent(event, data) ||
        this.userManager.handleEvent(event, data) ||
        this.chatManager.handleEvent(event, data);
    }
  }
}
