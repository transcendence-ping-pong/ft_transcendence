import { WssStateManager } from './WssStateManager';

/**
 * manages chat messages, direct messages, and chat-related events
 */
export class WssChatManager {
  private stateManager: WssStateManager;
  
  constructor(stateManager: WssStateManager) {
    this.stateManager = stateManager;
  }
  
  // handle chat message event
  handleChatMessage(data: any) {
    // store message in centralized state
    this.stateManager.addGlobalMessage(data);
    window.dispatchEvent(new CustomEvent('chatMessage', { detail: data }));
  }
  
  // handle direct message event
  handleDirectMessage(data: any) {
    // store message in centralized state
    this.stateManager.addDirectMessage(data);
    window.dispatchEvent(new CustomEvent('directMessage', { detail: data }));
  }
  
  // handle chat error event
  handleChatError(data: any) {
    window.dispatchEvent(new CustomEvent('chatError', { detail: data }));
  }
  
  // handle message delivery confirmation
  handleMessageDelivered(data: any) {
    window.dispatchEvent(new CustomEvent('messageDelivered', { detail: data }));
  }
  
  // handle invite sent confirmation
  handleInviteSent(data: any) {
    window.dispatchEvent(new CustomEvent('inviteSent', { detail: data }));
  }
  
  // handle generic events
  handleEvent(event: string, data: any): boolean {
    switch (event) {
      case 'directMessage':
        this.handleDirectMessage(data);
        return true;
      case 'chatError':
        this.handleChatError(data);
        return true;
      case 'messageDelivered':
        this.handleMessageDelivered(data);
        return true;
      case 'inviteSent':
        this.handleInviteSent(data);
        return true;
      default:
        return false;
    }
  }
  
  // utility methods
  getCurrentUsername(): string {
    const user = this.stateManager.currentUser;
    return user?.username || localStorage.getItem('loggedInUser') || 'Anonymous';
  }
  
  isUserAuthenticated(): boolean {
    return this.stateManager.isAuthenticated;
  }
  
  // send chat message
  sendChatMessage(message: string, username: string) {
    // this will be called by the websocket service
    return { message, username };
  }
  
  // send direct message
  sendDirectMessage(message: string, receiverUsername: string, username: string) {
    return {
      type: 'direct',
      senderUsername: username,
      receiverUsername,
      message
    };
  }
}
