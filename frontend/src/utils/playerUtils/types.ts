export type UserData = {
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number; // optional, for token expiry
};

export interface PlayerDataType {
  name: string;
  nickname: string; // player's nickname or display name
  id: string; // unique identifier for the player
  avatar: string; // URL or path to the player's avatar image
  email: string; // player's email address

  wins: number;
  losses: number;
  score: number;
  rank: number; // player's rank in the game, e.g., 1st, 2nd, 3rd, etc.

  // isLocal: boolean; // true if this player is controlled by the local user
  // isAI: boolean; // true if this player is controlled by the AI
  // isReady: boolean; // true if this player is ready to start the game
  // isSpectator: boolean; // true if this player is a spectator
  // isHost: boolean; // true if this player is the host of the game
  // isConnected: boolean; // true if this player is connected to the game
  // isPlaying: boolean; // true if this player is currently playing the game
  // isWinner: boolean; // true if this player has won the game
  // isLoser: boolean; // true if this player has lost the game
  // isPaused: boolean; // true if this player has paused the game
  // isKicked: boolean; // true if this player has been kicked from the game
  // isBanned: boolean; // true if this player has been banned from the game
  // isMuted: boolean; // true if this player has been muted in the game
  // isAdmin: boolean; // true if this player is an admin in the game
  // isModerator: boolean; // true if this player is a moderator in the game
  // isGuest: boolean; // true if this player is a guest in the game
  // isObserver: boolean; // true if this player is an observer in the game
  // isOffline: boolean; // true if this player is offline
  // isOnline: boolean; // true if this player is online
  // isInvited: boolean; // true if this player has been invited to the game
  // isJoined: boolean; // true if this player has joined the game
  // isLeft: boolean; // true if this player has left the game
  // isDisconnected: boolean; // true if this player has been disconnected from the game
}