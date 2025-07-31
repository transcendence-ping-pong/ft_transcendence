// // TODO SOCKET: mock WebSocketService for development (no backend)

type MessageHandler = (data: any) => void;

class WebSocketService {
  private handlers: MessageHandler[] = [];

  // TODO SOCKET: no real connection in mock mode
  connect(_url: string) {
    // no-op for mock
  }

  onMessage(cb: MessageHandler) {
    this.handlers.push(cb);
  }

  // TODO SOCKET: mock simulate receiving a message
  emitMock(data: any) {
    this.handlers.forEach((cb) => cb(data));
  }

  // TODO SOCKET MIGUEL: for real backend, implement send() and connection logic here
}

export const websocketService = new WebSocketService();