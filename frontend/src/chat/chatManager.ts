import './ChatPanel';
import type { ChatPanel } from './ChatPanel';
import { websocketService } from '@/services/websocketService.js';

export class ChatManager {
  private chatPanel: ChatPanel | null = null;
  private initialized = false;

  init() {
    if (this.initialized) return;

    const existingChatPanel = document.querySelector('chat-panel') as ChatPanel;
    if (existingChatPanel) {
      this.chatPanel = existingChatPanel;
    } else {
      const gameArea = document.querySelector('.game-area') as HTMLElement || document.body;
      this.chatPanel = document.createElement('chat-panel') as ChatPanel;
      gameArea.appendChild(this.chatPanel);
    }

    const userSelect = document.getElementById('mock-user-select') as HTMLSelectElement;
    if (userSelect) {
      userSelect.addEventListener('change', (e) => {
        const username = (e.target as HTMLSelectElement).value;
        if (username) {
          websocketService.authenticate(username);
          if (this.chatPanel) this.chatPanel.setCurrentUser(username);
        }
      });
    }

    this.initialized = true;
  }

  setCurrentUser(username: string) {
    if (this.chatPanel) {
      this.chatPanel.setCurrentUser(username);
    }
    const userSelect = document.getElementById('mock-user-select') as HTMLSelectElement;
    if (userSelect) {
      userSelect.value = username;
    }
    websocketService.authenticate(username);
  }

  destroy() {
    if (this.chatPanel && !document.querySelector('chat-panel')) {
      this.chatPanel.remove();
      this.chatPanel = null;
    }
    this.initialized = false;
  }
}

let _chatManager: ChatManager | null = null;

export function initChat() {
  if (!_chatManager) _chatManager = new ChatManager();
  _chatManager.init();
  return _chatManager;
}

export function getChatManager() {
  return _chatManager;
} 