import { GameSize, PADDLE_SPEED } from '@/utils/gameUtils/types.js';
import { GameCourtBounds } from '@/game/objects/GameCourtBounds.js';

const { PADDLE_WIDTH_RATIO, PADDLE_HEIGHT_RATIO, PADDLE_MARGIN_X, PADDLE_TO_COURT_GAP } = GameSize;

export class Paddle {
  private width: number;
  private height: number;
  private x: number;
  private y: number;
  private color: string;

  constructor(
    private playerIndex: number, // 0 for left, 1 for right
    private canvasWidth: number,
    private canvasHeight: number,
    private courtBounds: GameCourtBounds,
    color: string = "white"
  ) {
    this.color = color;
    this.recalculate();
    this.resetPosition();
  }

  // calculate width, height, and initial position
  public recalculate() {
    this.width = this.canvasWidth * PADDLE_WIDTH_RATIO;
    this.height = (this.canvasHeight - this.courtBounds.specs.top * 2) * PADDLE_HEIGHT_RATIO;
    this.x = this.playerIndex === 0
      ? this.canvasWidth * PADDLE_MARGIN_X
      : this.canvasWidth * (1 - PADDLE_MARGIN_X) - this.width;
    this.resetPosition();
  }

  // center paddle vertically
  // TODO CONCEPT: check score?? centralize after every point is made?
  public resetPosition() {
    this.y = this.canvasHeight / 2 - this.height / 2;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  // move paddles using arrow keys and WASD keys (two players at the same time)
  // TODO CONCEPT: how to organise it when second player is AI?
  // does mouse movement needs to be handled too?
  public moveUp() {
    const { top } = this.courtBounds.specs;
    this.y = Math.max(this.y - PADDLE_SPEED, top + PADDLE_TO_COURT_GAP);
  }

  public moveDown() {
    const { bottom } = this.courtBounds.specs;
    this.y = Math.min(this.y + PADDLE_SPEED, (bottom - this.height) - PADDLE_TO_COURT_GAP);
  }

  public getX() { return this.x; }
  public getY() { return this.y; }
  public getWidth() { return this.width; }
  public getHeight() { return this.height; }
}
