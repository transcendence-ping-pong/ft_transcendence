import { UserData } from '@/utils/playerUtils/types';
import { Players } from '@/utils/playerUtils/types';
/*
  State responsabilities:
  - persist state in localStorage
  - store user preferences (language, theme, sound, etc)
  - store game state (current level, score, etc)
  - provide a way to access and modify state
  - watch for changes and rerender UI accordingly (?)
  - provide a way to reset state (e.g. on logout)
  - provide a way to initialize state (e.g. on first load) (?)

  Do not:
  - handle user authentication or session management directly
*/

const savedState = localStorage.getItem('appState');
const initialState = savedState ? JSON.parse(savedState) : {
  language: null,
  translations: {} as any,
  errorTranslations: {} as any,
  availableLanguages: [] as string[],
  theme: 'primary',
  soundEnabled: true,
  scaleFactor: {},
  userData: {} as UserData, // user data will be set after login
  players: {} as Players,
  tournamentData: {} as TournamentData,
  // chat state
  chatOpen: false,
  chatMessages: [] as ChatMessage[],
  directMessages: [] as DirectMessage[],
  blockedUsers: [] as string[],
  onlineUsers: [] as OnlineUser[],
  // TODO: add other state properties that we need to persist
};

console.log('State initialized with Username:', initialState.userData?.username);

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
export const state = new Proxy(initialState, {
  set(target, prop, value) {
    target[prop as keyof typeof target] = value;
    localStorage.setItem('appState', JSON.stringify(target));
    return true;
  }
});

// res comes from backend GET response
export function setUserData(res: any, email: string) {
  state.userData = {
    username: res.username || '',
    email,
    accessToken: res.accessToken || '',
    refreshToken: res.refreshToken || '',
    userId: res.userId || 0,
    avatar: res.avatar || undefined,
  } as UserData;

  localStorage.setItem('accessToken', res.accessToken || '');
  localStorage.setItem('refreshToken', res.refreshToken || '');
  localStorage.setItem('loggedInUser', res.username || '');
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userId', String(res.userId || 0));
}

export interface TournamentData {
  players: string[];
  matches: Match[];
  currentMatchIndex: number;
  stage: number;
  tournamentId: number | null;
}

export interface Match {
  matchId: number;
  player1DisplayName: string;
  player2DisplayName: string;
  winnerDisplayName: string | null;
  scorePlayer1: number | null;
  scorePlayer2: number | null;
}

// chat types
export interface ChatMessage {
  id: number;
  senderId: number;
  senderUsername: string;
  message: string;
  timestamp: number;
  type: 'global' | 'system';
}

export interface DirectMessage {
  id: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  receiverUsername: string;
  message: string;
  timestamp: number;
  type: 'direct';
}

export interface OnlineUser {
  userId: number;
  username: string;
  status: 'online' | 'offline';
}

export let currentMatches: Match[] = [];
export let tournamentId: number | null = null;
