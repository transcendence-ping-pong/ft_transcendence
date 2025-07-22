const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 4000 });

const games = new Map();

wss.on('connection', (ws) => {
  let username, gameId;

  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    if (msg.type === "join") {
      username = msg.username;
      gameId = msg.gameId;

      if (!games.has(gameId)) games.set(gameId, []);
      games.get(gameId).push({ ws, username });

      if (games.get(gameId).length === 2) {
        const [p1, p2] = games.get(gameId);
        p1.ws.send(JSON.stringify({ type: "start", playerIndex: 0 }));
        p2.ws.send(JSON.stringify({ type: "start", playerIndex: 1 }));
      }
    }

    if (msg.type === "input") {
      const players = games.get(gameId);
      const opponent = players.find(p => p.username !== username);
      if (opponent) {
        opponent.ws.send(JSON.stringify({ type: "opponent_input", direction: msg.direction }));
      }
    }
  });

  ws.on('close', () => {
    const players = games.get(gameId);
    if (players) {
      players.forEach((p) => {
        if (p.username !== username) {
          p.ws.send(JSON.stringify({ type: "opponent_disconnected" }));
        }
      });
      games.delete(gameId);
    }
  });
});
