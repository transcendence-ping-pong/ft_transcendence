import { WssStateManager } from './WssStateManager';

/**
 * manages game state, game events, and game-related UI updates
 */
export class WssGameManager {
  private stateManager: WssStateManager;
  
  constructor(stateManager: WssStateManager) {
    this.stateManager = stateManager;
  }
  
  // handle game start event
  handleGameStart(data: any) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.status = 'playing';
      currentRoom.players = data.players;
      this.stateManager.updateState('currentRoom', currentRoom);
    }
    
    window.dispatchEvent(new CustomEvent('gameStart', { 
      detail: { 
        ...data, 
        room: currentRoom 
      } 
    }));
  }
  
  // handle game ended event (including disconnects)
  handleGameEnded(data: any) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.status = 'finished';
      this.stateManager.updateState('currentRoom', currentRoom);
    }
    
    window.dispatchEvent(new CustomEvent('gameEnded', { detail: data }));
  }
  
  // handle game end event (normal game completion)
  handleGameEnd(data: any) {
    const currentRoom = this.stateManager.currentRoom;
    if (currentRoom) {
      currentRoom.status = 'finished';
      this.stateManager.updateState('currentRoom', currentRoom);
    }
    
    window.dispatchEvent(new CustomEvent('gameEnd', { detail: data }));
  }
  
  // handle game updates
  handleGameUpdate(data: any) {
    window.dispatchEvent(new CustomEvent('gameUpdate', { detail: data }));
  }
  
  // handle countdown
  handleCountdown(data: any) {
    window.dispatchEvent(new CustomEvent('gameCountdown', { detail: data }));
  }
  
  // handle game started
  handleGameStarted(data: any) {
    window.dispatchEvent(new CustomEvent('gameStarted', { detail: data }));
  }
  
  // handle generic events
  handleEvent(event: string, data: any): boolean {
    switch (event) {
      case 'gameEnd':
        this.handleGameEnd(data);
        return true;
      case 'gameUpdate':
        this.handleGameUpdate(data);
        return true;
      case 'countdown':
        this.handleCountdown(data);
        return true;
      case 'gameStarted':
        this.handleGameStarted(data);
        return true;
      default:
        return false;
    }
  }
  
  // utility methods
  isGameActive(): boolean {
    const room = this.stateManager.currentRoom;
    return room?.status === 'playing';
  }
  
  getGameState(): any {
    const room = this.stateManager.currentRoom;
    return room?.gameState || null;
  }
  
  getGameStatus(): string | null {
    const room = this.stateManager.currentRoom;
    return room?.status || null;
  }
}
