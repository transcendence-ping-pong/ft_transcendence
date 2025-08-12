import { websocketService } from '../services/websocketService.js';
import { notificationService } from '../services/notificationService.js';
import { ChatMessage, ChatError } from './types.js';

class ChatService {
  private messages: ChatMessage[] = [];
  private currentUser: string | null = null;
  private messageHandlers: ((message: ChatMessage) => void)[] = [];
  private errorHandlers: ((error: ChatError) => void)[] = [];
  private readonly MAX_MESSAGES = 100;
  constructor() {
    this.loadMessagesFromStorage();
    this.setupWebSocketListeners();
  }

  private loadMessagesFromStorage() {
    try {
      const stored = localStorage.getItem('chat_messages');
      if (stored) {
        this.messages = JSON.parse(stored);
        if (this.messages.length > this.MAX_MESSAGES) {
          this.messages = this.messages.slice(-this.MAX_MESSAGES);
        }
      }
    } catch (error) {
      console.error('Error loading messages from storage:', error);
      this.messages = [];
    }
  }

  private saveMessagesToStorage() {
    try {
      localStorage.setItem('chat_messages', JSON.stringify(this.messages));
    } catch (error) {
      console.error('Error saving messages to storage:', error);
    }
  }

  private addMessageToStorage(message: ChatMessage) {
    this.messages.push(message);
    
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages = this.messages.slice(-this.MAX_MESSAGES);
    }
    
    this.saveMessagesToStorage();
  }

  private setupWebSocketListeners() {
    websocketService.on('chatMessage', (data: ChatMessage) => {
      this.addMessageToStorage(data);
      this.messageHandlers.forEach(handler => handler(data));
    });

    websocketService.on('directMessage', (data: ChatMessage) => {
      this.addMessageToStorage(data);
      this.messageHandlers.forEach(handler => handler(data));
      
      if (this.currentUser && data.senderUsername !== this.currentUser) {
        notificationService.emitMock({
          type: 'newMessage',
          title: `Message from ${data.senderUsername}`,
          message: data.message
        });
      }
    });

    websocketService.on('gameInvite', (data: ChatMessage) => {
      this.addMessageToStorage(data);
      this.messageHandlers.forEach(handler => handler(data));
      
      notificationService.emitMock({
        type: 'gameInvite',
        title: `Game Invite from ${data.senderUsername}`,
        message: data.message,
        action: {
          icon: '🎮',
          label: 'Accept Invite',
          actionFn: () => this.acceptGameInvite(data.senderUsername)
        }
      });
    });

    websocketService.on('chatError', (data: ChatError) => {
      this.errorHandlers.forEach(handler => handler(data));
    });

    websocketService.on('userBlocked', (data: { blockedUsername: string; message: string }) => {
      notificationService.emitMock({
        type: 'warning',
        title: 'User Blocked',
        message: data.message
      });
    });

    websocketService.on('inviteSent', (data: { targetUsername: string; message: string }) => {
      notificationService.emitMock({
        type: 'gameInvite',
        title: 'Invite Sent',
        message: data.message
      });
    });

    websocketService.on('userStatusUpdate', (data: { username: string; status: string; allUsers: any[] }) => {
      this.updateOnlineUsers(data.allUsers);
    });
  }

  private updateOnlineUsers(allUsers: any[]) {
    try {
      console.log('Online users updated:', allUsers);
    } catch (error) {
      console.error('Error updating online users:', error);
    }
  }

  setCurrentUser(username: string) {
    this.currentUser = username;
    
    this.requestOnlineUsers();
  }

  private requestOnlineUsers() {
    try {
      websocketService.emit('getOnlineUsers', {});
    } catch (error) {
      console.error('Error requesting online users:', error);
    }
  }

  sendMessage(message: string) {
    if (!message.trim()) return;
    
    try {
      websocketService.emit('chatMessage', { message });
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message. Please check your connection.');
    }
  }

  sendDirectMessage(receiverUsername: string, message: string) {
    if (!message.trim()) return;
    
    try {
      websocketService.emit('directMessage', { receiverUsername, message });
    } catch (error) {
      console.error('Error sending direct message:', error);
      throw new Error('Failed to send direct message. Please check your connection.');
    }
  }

  blockUser(username: string) {
    try {
      websocketService.emit('blockUser', { targetUsername: username });
    } catch (error) {
      console.error('Error blocking user:', error);
      throw new Error('Failed to block user. Please check your connection.');
    }
  }

  sendGameInvite(username: string) {
    try {
      websocketService.emit('gameInvite', { targetUsername: username });
    } catch (error) {
      console.error('Error sending game invite:', error);
      throw new Error('Failed to send game invite. Please check your connection.');
    }
  }

  acceptGameInvite(senderUsername: string) {
    notificationService.emitMock({
      type: 'matchFound',
      title: 'Game Invite Accepted',
      message: `Joining game with ${senderUsername}...`
    });
  }

  getMessages(): ChatMessage[] {
    return this.messages;
  }

  getDirectMessages(username: string): ChatMessage[] {
    return this.messages.filter(msg => 
      msg.type === 'direct' && 
      (msg.senderUsername === username || msg.receiverUsername === username)
    );
  }

  onMessage(handler: (message: ChatMessage) => void) {
    this.messageHandlers.push(handler);
  }

  onError(handler: (error: ChatError) => void) {
    this.errorHandlers.push(handler);
  }

  getCurrentUser(): string | null {
    return this.currentUser;
  }

  clearOldMessages() {
    try {
      if (this.messages.length > 50) {
        this.messages = this.messages.slice(-50);
        this.saveMessagesToStorage();
      }
    } catch (error) {
      console.error('Error clearing old messages:', error);
    }
  }

  clearAllMessages() {
    try {
      this.messages = [];
      localStorage.removeItem('chat_messages');
    } catch (error) {
      console.error('Error clearing all messages:', error);
    }
  }

  isConnected(): boolean {
    try {
      return websocketService.getSocketId() !== null;
    } catch (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
  }
}

export const chatService = new ChatService(); 