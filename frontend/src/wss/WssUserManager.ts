import { WssStateManager } from './WssStateManager';

/**
 * manages user authentication, state, and user-related events
 */
export class WssUserManager {
  private stateManager: WssStateManager;
  
  constructor(stateManager: WssStateManager) {
    this.stateManager = stateManager;
  }
  
  // handle authentication from backend
  handleAuthentication(data: any) {
    if (data.success) {
      this.stateManager.updateState('isAuthenticated', true);
      this.stateManager.updateState('currentUser', {
        username: data.username,
        userId: data.userId || Date.now().toString()
      });
      
      // dispatch event for components
      window.dispatchEvent(new CustomEvent('websocketAuthenticated', { 
        detail: { success: true, username: data.username } 
      }));
    } else {
      this.stateManager.updateState('isAuthenticated', false);
      this.stateManager.updateState('currentUser', null);
      
      window.dispatchEvent(new CustomEvent('websocketAuthenticated', { 
        detail: { success: false, error: data.error } 
      }));
    }
  }
  
  // handle game invites
  handleGameInvite(data: any) {
    const currentInvites = this.stateManager.pendingInvites;
    this.stateManager.updateState('pendingInvites', [...currentInvites, data]);
    
    window.dispatchEvent(new CustomEvent('gameInvite', { detail: data }));
  }
  
  // handle invite responses
  handleInviteResponse(data: any) {
    const { inviteId, accepted } = data;
    const currentInvites = this.stateManager.pendingInvites;
    
    // remove the responded invite
    const updatedInvites = currentInvites.filter((invite: any) => invite.id !== inviteId);
    this.stateManager.updateState('pendingInvites', updatedInvites);
    
    if (accepted) {
      window.dispatchEvent(new CustomEvent('inviteAccepted', { detail: data }));
    } else {
      window.dispatchEvent(new CustomEvent('inviteDeclined', { detail: data }));
    }
  }
  
  // handle online users update
  handleOnlineUsers(data: any) {
    this.stateManager.updateState('onlineUsers', data.users || []);
    window.dispatchEvent(new CustomEvent('onlineUsers', { detail: data }));
  }
  
  // handle user blocking
  handleUserBlocked(data: any) {
    window.dispatchEvent(new CustomEvent('userBlocked', { detail: data }));
  }
  
  // handle generic events
  handleEvent(event: string, data: any): boolean {
    switch (event) {
      case 'inviteAccepted':
      case 'inviteDeclined':
        this.handleInviteResponse(data);
        return true;
      case 'onlineUsers':
        this.handleOnlineUsers(data);
        return true;
      case 'userBlocked':
        this.handleUserBlocked(data);
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
}
