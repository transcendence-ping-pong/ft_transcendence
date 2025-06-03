
enum speedState {
  INITIAL = 0,
  BALL_DEFAULT = 4,
  PADDLE_DEFAULT = 12,
  BALL_SPEED_UP = 6,
  PADDLE_SPEED_UP = 16,
  BALL_SPEED_DOWN = 2,
  PADDLE_SPEED_DOWN = 8,
  BALL_MAX = 10,
  PADDLE_MAX = 20,
  BALL_MIN = 1,
  PADDLE_MIN = 4,
}

export enum BallSpeedState {
  INITIAL = speedState.INITIAL,
  DEFAULT = speedState.BALL_DEFAULT,
  SPEED_UP = speedState.BALL_SPEED_UP,
  SPEED_DOWN = speedState.BALL_SPEED_DOWN,
  MAX = speedState.BALL_MAX,
  MIN = speedState.BALL_MIN,
}

export enum PaddleSpeedState {
  INITIAL = speedState.INITIAL,
  DEFAULT = speedState.PADDLE_DEFAULT,
  SPEED_UP = speedState.PADDLE_SPEED_UP,
  SPEED_DOWN = speedState.PADDLE_SPEED_DOWN,
  MAX = speedState.PADDLE_MAX,
  MIN = speedState.PADDLE_MIN,
}

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
