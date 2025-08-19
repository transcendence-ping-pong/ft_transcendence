import { WssStateManager } from './WssStateManager';

/**
 * manages room state, player management, and room-related events
 */
export class WssRoomManager {
  private stateManager: WssStateManager;
  
  constructor(stateManager: WssStateManager) {
    this.stateManager = stateManager;
  }
  
  // handle room joined event
  handleRoomJoined(data: any) {
    this.stateManager.updateState('currentRoom', data.room);
    window.dispatchEvent(new CustomEvent('roomJoined', { detail: data }));
  }
  
  // handle room updated event
  handleRoomUpdated(data: any) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom && currentRoom.id === data.roomId) {
      const updatedRoom = { ...currentRoom, ...data.room };
      this.stateManager.updateState('currentRoom', updatedRoom);
    }
    window.dispatchEvent(new CustomEvent('roomUpdated', { detail: data }));
  }
  
  // handle player left event
  handlePlayerLeft(data: any) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      // update room players
      currentRoom.players = data.players;
      this.stateManager.updateState('currentRoom', currentRoom);
      
      // check if game ended due to disconnect
      if (data.gameEnded) {
        // game ended, let game manager handle it
        return;
      }
      
      // player left during waiting room
      if (currentRoom.status === 'waiting') {
        window.dispatchEvent(new CustomEvent('playerLeftWaitingRoom', {
          detail: { player: data.player, players: data.players }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('playerDisconnected', {
          detail: { player: data.player, players: data.players }
        }));
      }
    }
    
    window.dispatchEvent(new CustomEvent('playerLeft', { 
      detail: { 
        player: data.player, 
        players: data.players, 
        roomId: data.roomId,
        room: currentRoom 
      } 
    }));
  }
  
  // handle player ready event
  handlePlayerReady(data: any) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.players = data.players;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
    
    window.dispatchEvent(new CustomEvent('playerReady', { 
      detail: { 
        player: data.player, 
        players: data.players, 
        roomId: data.roomId,
        room: currentRoom 
      } 
    }));
  }
  
  // handle available rooms update
  handleAvailableRooms(data: any) {
    window.dispatchEvent(new CustomEvent('availableRooms', { detail: data }));
  }
  
  // handle room messages
  handleRoomMessage(data: any) {
    window.dispatchEvent(new CustomEvent('roomMessage', { detail: data }));
  }
  
  // handle generic events
  handleEvent(event: string, data: any): boolean {
    switch (event) {
      case 'roomUpdated':
        this.handleRoomUpdated(data);
        return true;
      case 'playerReady':
        this.handlePlayerReady(data);
        return true;
      case 'availableRooms':
        this.handleAvailableRooms(data);
        return true;
      case 'roomMessage':
        this.handleRoomMessage(data);
        return true;
      default:
        return false;
    }
  }
  
  // utility methods
  getCurrentRoom() {
    return this.stateManager.currentRoom;
  }
  
  isInRoom(): boolean {
    return !!this.stateManager.currentRoom;
  }
  
  getRoomStatus(): string | null {
    return this.stateManager.currentRoom?.status || null;
  }
  
  // room state management methods
  setRoom(room: any) {
    this.stateManager.updateState('currentRoom', room);
  }
  
  setRoomId(roomId: string) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.id = roomId;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
  }
  
  setHost(isHost: boolean) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.isHost = isHost;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
  }
  
  isHost(): boolean {
    const currentRoom = this.stateManager.currentRoom;
    return currentRoom?.isHost || false;
  }
  
  setPlayerReady(roomId: string, isReady: boolean) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom && currentRoom.id === roomId) {
      currentRoom.isReady = isReady;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
  }
  
  isPlayerReady(): boolean {
    const currentRoom = this.stateManager.currentRoom;
    return currentRoom?.isReady || false;
  }
  
  setConnected(isConnected: boolean) {
    // This would update a connection state in the room
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.isConnected = isConnected;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
  }
  
  setStatus(status: string) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.status = status;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
  }
  
  setCurrentPlayers(count: number) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.currentPlayers = count;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
  }
  
  getCurrentPlayers(): number {
    const currentRoom = this.stateManager.currentRoom;
    return currentRoom?.currentPlayers || 0;
  }
  
  setHostReady(isReady: boolean) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.hostReady = isReady;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
  }
  
  setGuestReady(isReady: boolean) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.guestReady = isReady;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
  }
  
  getHostUsername(): string {
    const currentRoom = this.stateManager.currentRoom;
    return currentRoom?.hostUsername || '';
  }
  
  reset() {
    this.stateManager.updateState('currentRoom', null);
  }
}
