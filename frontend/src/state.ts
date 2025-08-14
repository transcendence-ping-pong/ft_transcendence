import { UserData } from '@/utils/playerUtils/types';
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

// Generate unique client ID for socket connections
const generateClientId = (): string => {
  return 'client-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get or create client ID - ensures we always have one
const getOrCreateClientId = (): string => {
  let clientId = localStorage.getItem('clientId');
  if (!clientId) {
    clientId = generateClientId();
    localStorage.setItem('clientId', clientId);
  }
  return clientId;
};

const savedState = localStorage.getItem('appState');
const initialState = savedState ? JSON.parse(savedState) : {
  language: 'en',
  translations: {} as any,
  errorTranslations: {} as any,
  availableLanguages: [] as string[],
  theme: 'primary',
  soundEnabled: true,
  scaleFactor: {},
  userData: {} as UserData, // user data will be set after login
  tournamentData: {} as TournamentData,
  // TODO: add other state properties that we need to persist
};

// Ensure clientId is always available
initialState.clientId = getOrCreateClientId();

console.log('State initialized with Client ID:', initialState.clientId);

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
export const state = new Proxy(initialState, {
  set(target, prop, value) {
    target[prop as keyof typeof target] = value;
    localStorage.setItem('appState', JSON.stringify(target));
    return true;
  }
});

export interface TournamentData {
  players: string[];
  matches: Match[];
  currentMatchIndex: number;
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

export let currentMatches: Match[] = [];
export let tournamentId: number | null = null;

