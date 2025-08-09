import { GameSize, GameLevel, BallLevelConfig } from '@/utils/gameUtils/GameConstants.js';
import { GameCourtBounds } from '@/game/objects/GameCourtBounds.js';

const { PADDLE_WIDTH_RATIO, PADDLE_HEIGHT_RATIO, PADDLE_MARGIN_X, PADDLE_TO_COURT_GAP } = GameSize;

export class Paddle {
  private width: number;
  private height: number;
  private x: number;
  private y: number;
  private speed: number = 0; // paddle speed in pixels per second
  private color: string;

  constructor(
    private playerIndex: number, // 0 for left, 1 for right
    private canvasWidth: number,
    private canvasHeight: number,
    private courtBounds: GameCourtBounds,
    private level: GameLevel,
    color: string = "white"
  ) {
    this.color = color;
    this.setPaddleSpeed();
    this.resetPosition();
  }

  private setPaddleSpeed() {
    const { paddleSpeed } = BallLevelConfig[this.level];
    console.log("paddle.speed", paddleSpeed, this.level);
    this.speed = paddleSpeed;
  }

  // center paddle vertically
  // calculate width, height, and initial x position
  // TODO CONCEPT: check score?? centralize after every point is made?
  public resetPosition() {
    this.setPaddleSpeed();
    this.width = this.canvasWidth * PADDLE_WIDTH_RATIO;
    this.height = (this.canvasHeight - this.courtBounds.specs.top * 2) * PADDLE_HEIGHT_RATIO;
    this.x = this.playerIndex === 0
      ? this.canvasWidth * PADDLE_MARGIN_X
      : this.canvasWidth * (1 - PADDLE_MARGIN_X) - this.width;
    this.y = this.canvasHeight / 2 - this.height / 2;
  }

  public draw(ctx: CanvasRenderingContext2D, sizeX: number, sizeY: number) {
    const scaleX = ctx.canvas.width / this.canvasWidth;
    const scaleY = ctx.canvas.height / this.canvasHeight;
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.x * scaleX,
      this.y * scaleY,
      sizeX * scaleX,
      sizeY * scaleY
    );
  }

  // move paddles using arrow keys and WASD keys (two players at the same time)
  // TODO CONCEPT: how to organise it when second player is AI?
  // does mouse movement needs to be handled too?
  public moveUp(dt: number) {
    const { top } = this.courtBounds.specs;
    this.y = Math.max(this.y - this.speed * dt, top + (this.width * PADDLE_TO_COURT_GAP));
  }

  public moveDown(dt: number) {
    const { bottom } = this.courtBounds.specs;
    this.y = Math.min(this.y + this.speed * dt, (bottom - this.height) - (this.width * PADDLE_TO_COURT_GAP));
  }

  public getState() {
    return {
      x: this.x,
      y: this.y,
      height: this.height,
      width: this.width,
    };
  }

  public getX() { return this.x; }
  public getY() { return this.y; }
  public getWidth() { return this.width; }
  public getHeight() { return this.height; }
}
