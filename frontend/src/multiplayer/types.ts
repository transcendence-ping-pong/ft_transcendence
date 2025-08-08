export interface GameRoom {
  id: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  gameState: GameState | null;
  tournamentId?: string;
  createdAt: number;
}

export interface Player {
  userId: string;
  username: string;
  socketId: string;
  isReady: boolean;
  isHost: boolean;
  score: number;
  wins: number;
  losses: number;
}

export interface GameState {
  ball: Ball;
  paddles: Paddles;
  gamePhase: GamePhase;
  winner: string | null;
  serverTime: number;
  gameStarted: boolean;
  countdown: number;
  lastUpdate: number;
}

export interface Ball {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
}

export interface Paddles {
  left: Paddle;
  right: Paddle;
}

export interface Paddle {
  y: number;
  score: number;
  moving: boolean;
  direction: number; // -1: up, 0: still, 1: down
  height: number;
  width: number;
  speed: number;
}

export type GamePhase = 'waiting' | 'countdown' | 'playing' | 'finished';

export interface GameInput {
  type: 'paddleMove' | 'paddleStop' | 'gameStart' | 'gameEnd' | 'ready';
  data?: any;
}

export interface RoomEvent {
  roomId: string;
  room: GameRoom;
}

export interface PlayerEvent {
  player: Player;
  players: Player[];
  roomId: string;
}

export interface GameStartEvent {
  gameState: GameState;
  players: Player[];
}

export interface GameUpdateEvent {
  gameState: GameState;
  timestamp: number;
}

export interface MultiplayerUIState {
  room: GameRoom | null;
  isHost: boolean;
  playerIndex: number;
  gamePhase: GamePhase;
}

export interface Tournament {
  id: string;
  name: string;
  players: Player[];
  matches: TournamentMatch[];
  status: 'waiting' | 'active' | 'finished';
  currentRound: number;
  winner: Player | null;
}

export interface TournamentMatch {
  id: string;
  player1: Player;
  player2: Player;
  winner: Player | null;
  status: 'pending' | 'active' | 'finished';
  roomId?: string;
} 