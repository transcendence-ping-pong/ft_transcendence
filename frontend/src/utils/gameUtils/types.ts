
export enum GameLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

// TODO CONCEPT: speed increases after hits, until reaches MAX?? Or after first hit?
export const BallLevelConfig = {
  [GameLevel.EASY]: { MIN: 4, MAX: 6, maxBounceAngle: Math.PI / 6 }, // 30°
  [GameLevel.MEDIUM]: { MIN: 4, MAX: 10, maxBounceAngle: Math.PI / 4 }, // 45°
  [GameLevel.HARD]: { MIN: 6, MAX: 16, maxBounceAngle: Math.PI / 3 }, // 60°
};

// constant speed, pixels per frame
export const PADDLE_SPEED = 6;

// traditional Pong game size constants
// paddle width: 1-2% screen width
// ball: 2 x 2 px, 1% screen height
// center line dashed 10 - 20 px
export enum GameSize {
  PADDLE_WIDTH_RATIO = 0.01,      // Paddle width as % of canvas width
  PADDLE_HEIGHT_RATIO = 0.15,     // Paddle height as % of playfield height
  PADDLE_MARGIN_X = 0.20,         // 20% margin for left/right paddles
  PADDLE_MARGIN_Y = 0.05,         // 5% margin for top/bottom paddles
  BALL_SIZE_RATIO = 0.025,        // Ball size as % of canvas height
  COURT_MARGIN_X = 0.15,          // 15% margin for left/right
  COURT_MARGIN_Y = 0.10,          // 10% margin for top/bottom
  LINE_WIDTH_RATIO = 0.01,        // Line width as % of canvas width
  DASH_LENGTH = 40,               // Center line dash length
  DASH_GAP = 20                   // Center line gap
}

export interface CourtBoundsSpecs {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
