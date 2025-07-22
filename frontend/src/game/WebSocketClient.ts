export class WebSocketClient {
  private socket: WebSocket;
  private username: string;

  constructor(gameId: string, username: string) {
    this.username = username;
    this.socket = new WebSocket("ws://localhost:4000");

    this.socket.onopen = () => {
      this.send({ type: "join", gameId, username });
    };
  }

  send(data: any) {
    this.socket.send(JSON.stringify(data));
  }

  onMessage(callback: (data: any) => void) {
    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      callback(msg);
    };
  }

  close() {
    this.socket.close();
  }
}
