// TODO: first test, create a canvas and draw a ball that bounces off the walls
import { GameManager } from './GameManager.js';
import { BallSpeedState, PaddleSpeedState, GameSize, CourtBoundsSpecs } from '../../utils/gameUtils/types.js';

// single source of truth for the game limits
class GameCourtBounds {
  public specs: CourtBoundsSpecs = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  constructor(private width: number, private height: number, private color: string = "white") {
    const marginX = width * GameSize.COURT_MARGIN_X;
    const marginY = height * GameSize.COURT_MARGIN_Y;
    this.specs.left = marginX;
    this.specs.right = width - marginX;
    this.specs.top = marginY;
    this.specs.bottom = height - marginY;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // is this overkill? maybe......
    ctx.save(); // save current state in stack, sp it doesn't affect other drawings
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width * GameSize.LINE_WIDTH_RATIO;

    ctx.setLineDash([GameSize.DASH_LENGTH, GameSize.DASH_GAP]);
    // top horizontal line
    ctx.beginPath();
    ctx.moveTo(this.specs.left, this.specs.top);
    ctx.lineTo(this.specs.right, this.specs.top);
    ctx.stroke();

    // bottom horizontal line
    ctx.beginPath();
    ctx.moveTo(this.specs.left, this.specs.bottom);
    ctx.lineTo(this.specs.right, this.specs.bottom);
    ctx.stroke();

    // center line
    ctx.beginPath();
    ctx.moveTo(this.width / 2, this.specs.top);
    ctx.lineTo(this.width / 2, this.specs.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore(); // restore previous state from stack
  }
}

class Ball {
  constructor(
    public x: number, // x coordinate
    public y: number, // y coordinate
    public speedX: number, // horizontal speed
    public speedY: number, // vertical speed
    public size: number, // size of the ball (it is a square, as the original Pong game)
    public color: string = "white",
    public speedState: BallSpeedState = BallSpeedState.INITIAL
  ) { }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}

class Paddle {
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

  // Calculate width, height, and initial position
  public recalculate() {
    this.width = this.canvasWidth * GameSize.PADDLE_WIDTH_RATIO;
    this.height = (this.canvasHeight - this.courtBounds.specs.top * 2) * GameSize.PADDLE_HEIGHT_RATIO;
    this.x = this.playerIndex === 0
      ? this.canvasWidth * GameSize.PADDLE_MARGIN_X
      : this.canvasWidth * (1 - GameSize.PADDLE_MARGIN_X) - this.width;
    this.resetPosition();
  }

  // Center paddle vertically
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
  public moveUp(step: number) {
    this.y = Math.max(this.y - step, this.courtBounds.specs.top);
  }

  public moveDown(step: number) {
    this.y = Math.min(this.y + step, this.courtBounds.specs.bottom - this.height);
  }

  public getX() { return this.x; }
  public getY() { return this.y; }
  public getWidth() { return this.width; }
  public getHeight() { return this.height; }
}

export class GameCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private ball: Ball;
  private paddles: Paddle[];
  private paddleDirections: { [player: number]: 'up' | 'down' | null } = { 0: null, 1: null };
  private courtBounds: GameCourtBounds;
  public gameManager: GameManager;

  // initialise variables, create canvas, paddles, ball, event listeners(?)
  // TODO CONCEPT: where to put event listeners?
  constructor(containerId?: string, width?: number, height?: number) {
    // create and append canvas
    this.canvas = document.createElement('canvas');
    this.canvas.height = height;
    this.canvas.width = width; // width based on aspect ratio
    // this.canvas.className = "border bg-black";
    // document.getElementById(containerId)?.appendChild(this.canvas);

    this.gameManager = new GameManager();
    this.courtBounds = new GameCourtBounds(width, height);

    const ballSize = height * GameSize.BALL_SIZE_RATIO;
    this.ball = new Ball(width / 2, height / 2, 4, 4, ballSize);

    this.paddles = [
      new Paddle(0, width, height, this.courtBounds),
      new Paddle(1, width, height, this.courtBounds),
    ];

    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp':
          this.paddleDirections[1] = 'up';
          break;
        case 'ArrowDown':
          this.paddleDirections[1] = 'down';
          break;
        case 'w':
        case 'W':
          this.paddleDirections[0] = 'up';
          break;
        case 's':
        case 'S':
          this.paddleDirections[0] = 'down';
          break;
      }
    });

    window.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowDown':
          this.paddleDirections[1] = null;
          break;
        case 'w':
        case 'W':
        case 's':
        case 'S':
          this.paddleDirections[0] = null;
          break;
      }
    });

    // canvas 2D context
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");
    this.ctx = ctx;

    // start rendering/drawing stuff
    this.render = this.render.bind(this);
    this.render();
  }

  // draw stuff
  private render() {
    // clear!!!!!!!!!!!!!!!!!!!
    this.ctx.fillStyle = "rgba(10, 20, 40, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.courtBounds.draw(this.ctx);

    this.paddles.forEach(paddle => paddle.draw(this.ctx));

    this.ball.draw(this.ctx);

    // ball constantly moves... TODO CONCEPT: add some randomness to the ball movement
    if (this.gameManager.isStarted) {
      this.ball.x += this.ball.speedX;
      this.ball.y += this.ball.speedY;
    }

    this.handleBallCollisions();

    const paddleSpeed = 12; // pixels per frame

    // Move paddles if direction is set
    for (let i = 0; i < this.paddles.length; i++) {
      const dir = this.paddleDirections[i];
      if (dir === 'up') this.paddles[i].moveUp(paddleSpeed);
      if (dir === 'down') this.paddles[i].moveDown(paddleSpeed);
    }

    // loop!!!!!!!!!!
    this.animationId = requestAnimationFrame(this.render);
  }

  private handleBallCollisions() {
    // left/right walls
    if (
      this.ball.x - this.ball.size / 2 <= this.courtBounds.specs.left ||
      this.ball.x + this.ball.size / 2 >= this.courtBounds.specs.right
    ) {
      this.ball.speedX *= -1;
      // TODO CONCEPT: handle scoring???
    }

    // top/bottom walls
    if (
      this.ball.y - this.ball.size / 2 <= this.courtBounds.specs.top ||
      this.ball.y + this.ball.size / 2 >= this.courtBounds.specs.bottom
    ) {
      this.ball.speedY *= -1;
    }

    // paddle collisions
    for (const paddle of this.paddles) {
      if (
        this.ball.x + this.ball.size / 2 > paddle.getX() &&
        this.ball.x - this.ball.size / 2 < paddle.getX() + paddle.getWidth() &&
        this.ball.y + this.ball.size / 2 > paddle.getY() &&
        this.ball.y - this.ball.size / 2 < paddle.getY() + paddle.getHeight()
      ) {
        this.ball.speedX *= -1;
        // TODO CONCEPT: add some randomness or speed up the ball
      }
    }
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  public stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
