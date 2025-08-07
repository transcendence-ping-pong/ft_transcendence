// Game constants for multiplayer Pong
// Use EXACT same coordinate system as single-player (0 to VIRTUAL_WIDTH/HEIGHT)
// This eliminates all coordinate conversion issues

// Single-player constants (from frontend)
const VIRTUAL_WIDTH = 1456;
const VIRTUAL_HEIGHT = 816;
const VIRTUAL_BORDER_TOP = 110;
const VIRTUAL_BORDER_BOTTOM = 130;
const VIRTUAL_BORDER_X = 120;

// Game area (same as single-player)
const GAME_AREA_HEIGHT = VIRTUAL_HEIGHT - VIRTUAL_BORDER_TOP - VIRTUAL_BORDER_BOTTOM;
const GAME_AREA_WIDTH = VIRTUAL_WIDTH - (VIRTUAL_BORDER_X * 2);

// Ball physics - EXACT same as single-player
const BALL_SPEED_MIN = VIRTUAL_WIDTH / 8; // 182 (EASY level)
const BALL_SPEED_MAX = VIRTUAL_WIDTH / 2; // 728 (HARD level)
const BALL_SIZE = VIRTUAL_HEIGHT * 0.025; // 2.5% of canvas height

// Paddle physics - EXACT same as single-player
const PADDLE_SPEED = VIRTUAL_HEIGHT / 4; // 204 (EASY level)
const PADDLE_HEIGHT = GAME_AREA_HEIGHT * 0.15; // 15% of playfield height
const PADDLE_WIDTH = VIRTUAL_WIDTH * 0.01; // 1% of canvas width
const PADDLE_MARGIN_X = 0.20; // 20% margin for left/right paddles

// Paddle positions (same as single-player)
const LEFT_PADDLE_X = VIRTUAL_WIDTH * PADDLE_MARGIN_X;
const RIGHT_PADDLE_X = VIRTUAL_WIDTH * (1 - PADDLE_MARGIN_X) - PADDLE_WIDTH;

// Game settings
const SCORE_MAX = 5;
const GAME_FPS = 60;

module.exports = {
	// Coordinate system
	VIRTUAL_WIDTH,
	VIRTUAL_HEIGHT,
	VIRTUAL_BORDER_TOP,
	VIRTUAL_BORDER_BOTTOM,
	VIRTUAL_BORDER_X,
	GAME_AREA_HEIGHT,
	GAME_AREA_WIDTH,

	// Ball physics
	BALL_SPEED_MIN,
	BALL_SPEED_MAX,
	BALL_SIZE,

	// Paddle physics
	PADDLE_SPEED,
	PADDLE_HEIGHT,
	PADDLE_WIDTH,
	PADDLE_MARGIN_X,
	LEFT_PADDLE_X,
	RIGHT_PADDLE_X,

	// Game settings
	SCORE_MAX,
	GAME_FPS
}; 