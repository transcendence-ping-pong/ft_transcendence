import { getThemeColors, ThemeColors } from '@/utils/gameUtils/BabylonColors.js';
import { state } from '@/state';

export enum GameLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum PlayerMode {
  ONE_PLAYER = 'ONE PLAYER',
  TWO_PLAYER = 'TWO PLAYERS'
}

export enum GameScore {
  WIN = 1,
  LOSE = -1,
  DRAW = 0,
  POINT = 1,
  NO_POINT = 0,
  // SCORE_MAX = 11,
  SCORE_MAX = 1, // testing purposes
  LEFT = 'LEFT',   // Player is on the left side
  RIGHT = 'RIGHT',  // Player is on the right side
}

export type BallLevelConfigValue = {
  MIN: number;
  MAX: number;
  maxBounceAngle: number;
  paddleSpeed: number;
};

export const VIRTUAL_WIDTH = 1000;
export const VIRTUAL_HEIGHT = 500;

// TODO CONCEPT: speed increases after hits, until reaches MAX?? Or after first hit?
// MIN/MAX: Ball starts at MIN px/sec, can reach up to MAX px/sec.
// ball and paddle speed/angle configuration per level
const EASY_MIN = VIRTUAL_WIDTH / 8;
const EASY_MAX = VIRTUAL_WIDTH / 5;
const EASY_PADDLE = VIRTUAL_HEIGHT / 4;
const EASY_BOUNCE = Math.PI / 6; // 30°

const MEDIUM_MIN = VIRTUAL_WIDTH / 5;
const MEDIUM_MAX = VIRTUAL_WIDTH / 3;
const MEDIUM_PADDLE = VIRTUAL_HEIGHT / 3;
const MEDIUM_BOUNCE = Math.PI / 4; // 45°

const HARD_MIN = VIRTUAL_WIDTH / 3;
const HARD_MAX = VIRTUAL_WIDTH / 2;
const HARD_PADDLE = VIRTUAL_HEIGHT / 1;
const HARD_BOUNCE = Math.PI / 3; // 60°

export const BallLevelConfig = {
  [GameLevel.EASY]: {
    MIN: EASY_MIN,
    MAX: EASY_MAX,
    maxBounceAngle: EASY_BOUNCE,
    paddleSpeed: EASY_PADDLE,
  },
  [GameLevel.MEDIUM]: {
    MIN: MEDIUM_MIN,
    MAX: MEDIUM_MAX,
    maxBounceAngle: MEDIUM_BOUNCE,
    paddleSpeed: MEDIUM_PADDLE,
  },
  [GameLevel.HARD]: {
    MIN: HARD_MIN,
    MAX: HARD_MAX,
    maxBounceAngle: HARD_BOUNCE,
    paddleSpeed: HARD_PADDLE,
  },
} as Record<GameLevel, BallLevelConfigValue>;

// traditional Pong game size constants
// paddle width: 1-2% screen width
// ball: 2 x 2 px, 1% screen height
// center line dashed 10 - 20 px
export enum GameSize {
  PADDLE_WIDTH_RATIO = 0.01,      // Paddle width as % of canvas width
  PADDLE_HEIGHT_RATIO = 0.15,     // Paddle height as % of playfield height
  PADDLE_MARGIN_X = 0.20,         // 20% margin for left/right paddles
  PADDLE_MARGIN_Y = 0.05,         // 5% margin for top/bottom paddles
  PADDLE_TO_COURT_GAP = 0.02,     // Space between paddles and court bounds
  BALL_SIZE_RATIO = 0.025,        // Ball size as % of canvas height
  COURT_MARGIN_X = 0.15,          // 15% margin for left/right
  COURT_MARGIN_Y = 0.10,          // 10% margin for top/bottom
  LINE_WIDTH_RATIO = 0.01,        // Line width as % of canvas width
  DASH_LENGTH = 0.03,             // Center line dash length
  DASH_GAP = 0.01                 // Center line gap
}

export interface CourtBoundsSpecs {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

type GUIConstants = {
  SCENE_BACKGROUND_COLOR: string;
  BUTTON_HEIGHT: string;
  BUTTON_WIDTH: string;
  BUTTON_GAP: number;
  BUTTON_FONT_SIZE: number;
  BUTTON_FONT_WEIGHT: string;
  BUTTON_FONT_COLOR: string;
  BUTTON_BORDER_COLOR: string;
  BUTTON_CORNER_RADIUS: number;
  BUTTON_THICKNESS: number;
  BUTTON_BACKGROUND_COLOR: string;
  BUTTON_SHADOW_OFFSET_X: number;
  BUTTON_SHADOW_OFFSET_Y: number;
  BUTTON_SHADOW_COLOR: string;
  BUTTON_SHADOW_BLUR: number;
  COUNTDOWN_DURATION: number;
  COUNTDOWN_FONT_SIZE: number;
  COUNTDOWN_FONT_WEIGHT: string;
  COUNTDOWN_FONT_COLOR: string;
};

export function getGUIConstants(): GUIConstants {
  const colors: ThemeColors = getThemeColors(state.theme);

  return {
    SCENE_BACKGROUND_COLOR: colors.gameGradientEnd,
    BUTTON_HEIGHT: '150px',
    BUTTON_WIDTH: '400px',
    BUTTON_GAP: 32,
    BUTTON_FONT_SIZE: 42,
    BUTTON_FONT_WEIGHT: 'bold',
    BUTTON_FONT_COLOR: colors.border,
    BUTTON_BORDER_COLOR: colors.border,
    BUTTON_CORNER_RADIUS: 20,
    BUTTON_THICKNESS: 4,
    BUTTON_BACKGROUND_COLOR: colors.gameGradientStart,
    BUTTON_SHADOW_OFFSET_X: 2,
    BUTTON_SHADOW_OFFSET_Y: 2,
    BUTTON_SHADOW_COLOR: colors.border,
    BUTTON_SHADOW_BLUR: 8,
    COUNTDOWN_DURATION: 3,
    COUNTDOWN_FONT_SIZE: 250,
    COUNTDOWN_FONT_WEIGHT: 'bold',
    COUNTDOWN_FONT_COLOR: colors.border,
  };
}
