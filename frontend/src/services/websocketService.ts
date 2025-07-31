import { io } from 'socket.io-client';
import { state } from '../state.js';

class WebSocketService {
  private socket: any = null;

  connect(url: string) {
    if (this.socket) return;
    
    this.socket = io(url, {
      query: { clientId: state.clientId }
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to backend WebSocket!');
      console.log('Client ID:', state.clientId);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from backend WebSocket');
    });

	this.socket.emit('test', 'boas');
	this.socket.on('test', (data) => {
		console.log('Received test message:', data);
	})
  }

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

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
}

export const websocketService = new WebSocketService();