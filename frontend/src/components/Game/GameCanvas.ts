// TODO: first test, create a canvas and draw a ball that bounces off the walls
import { GameManager } from './GameManager.js';
import { GameLevel, BallLevelConfig, PADDLE_SPEED, GameSize, CourtBoundsSpecs } from '../../utils/gameUtils/types.js';

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
    public vx: number, // velocity: x axis direction (positive or negative) + step for jumping pixels (speed) 
    public vy: number, // idem, but for y axis
    public size: number, // size of the ball (it is a square, as the original Pong game)
    public color: string = "white",
    // public currentLevel: GameLevel = GameLevel.EASY
  ) { }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }

  // https://www.youtube.com/watch?v=6i5kZV_KOCU
  updatePosition(
    dt: number,
    courtBounds: GameCourtBounds,
    paddles: Paddle[],
    currentLevel: GameLevel,
    onPaddleBounce?: () => void // optional callback for speed increase, sound, etc.
  ) {
    const { MIN, MAX, maxBounceAngle } = BallLevelConfig[currentLevel];
    const { top, bottom, right, left } = courtBounds.specs;
    const isCollisionWithPaddle = (paddle: Paddle) => {
      return (
        this.x + this.size / 2 >= paddle.getX() &&
        this.x - this.size / 2 <= paddle.getX() + paddle.getWidth() &&
        this.y + this.size / 2 >= paddle.getY() &&
        this.y - this.size / 2 <= paddle.getY() + paddle.getHeight()
      );
    };

    const isOutOfBounds = () => {
      return (
        this.x - this.size / 2 < left || // left side wall courtBounds
        this.x + this.size / 2 > right // right side wall courtBounds
      );
    };

    // reminder: for...in - iterate over keys (indexes) of an object or array
    for (const paddle of paddles) {
      // check if the ball is colliding with the paddle
      if (isCollisionWithPaddle(paddle)) {
        // prevent sticking to the paddle
        if (this.vx < 0) {
          this.x = paddle.getX() + paddle.getWidth() + this.size / 2; // left paddle
        } else {
          this.x = paddle.getX() - this.size / 2; // right paddle
        }

        // calculate normalized hit position (-1 to 1)
        const relativeIntersectY = (this.y - (paddle.getY() + paddle.getHeight() / 2));
        const normalized = relativeIntersectY / (paddle.getHeight() / 2);
        const bounceAngle = normalized * maxBounceAngle;

        // TODO CONCEPT: should we increase speed after each hit? or after first hit?
        // calculate current speed and increase by 10% (cap at MAX_BALL_SPEED)
        let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        speed = Math.min(speed * 1.1, MAX);

        // update velocity: always right direction after left paddle, or left direction after right paddle
        this.vx = (this.vx < 0 ? Math.abs(speed * Math.cos(bounceAngle)) : -Math.abs(speed * Math.cos(bounceAngle)));
        this.vy = speed * Math.sin(bounceAngle);

        if (onPaddleBounce) onPaddleBounce(); // TODO CONCEPT: sound?? log??
      } else if (isOutOfBounds()) {
        // TODO CONCEPT: score??? reset to center?? Check if score is less than 11?

        this.x = (left + right) / 2;
        this.y = (top + bottom) / 2;

        // TODO FIX: check!!!!!!!!!!!!!!!!!!!!!
        const angle = (Math.random() - 0.5) * maxBounceAngle; // random angle?
        const direction = (this.vx < 0 ? 1 : -1); // send ball to the opposite direction???
        this.vx = direction * MIN * Math.cos(angle);
        this.vy = MIN * Math.sin(angle);
      }
    }

    // top/bottom wall collision CourtBounds
    // TODO CONCEPT: add more getters?
    if (this.y - this.size / 2 < top) {
      this.y = top + this.size / 2;
      this.vy = -this.vy;
    }
    if (this.y + this.size / 2 > bottom) {
      this.y = bottom - this.size / 2;
      this.vy = -this.vy;
    }

    // position = position + velocity
    // velocity = velocity + acceleration
    this.x += this.vx * dt; // update x position
    this.y += this.vy * dt; // update y position
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

  // calculate width, height, and initial position
  public recalculate() {
    this.width = this.canvasWidth * GameSize.PADDLE_WIDTH_RATIO;
    this.height = (this.canvasHeight - this.courtBounds.specs.top * 2) * GameSize.PADDLE_HEIGHT_RATIO;
    this.x = this.playerIndex === 0
      ? this.canvasWidth * GameSize.PADDLE_MARGIN_X
      : this.canvasWidth * (1 - GameSize.PADDLE_MARGIN_X) - this.width;
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
    this.y = Math.max(this.y - PADDLE_SPEED, top);
  }

  public moveDown() {
    const { bottom } = this.courtBounds.specs;
    this.y = Math.min(this.y + PADDLE_SPEED, bottom - this.height);
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
  private handleKeyDown: (event: KeyboardEvent) => void;
  private handleKeyUp: (event: KeyboardEvent) => void;
  // TODO CONCEPT: public so it is possible to access it from BabylonCanvas?
  public gameManager: GameManager;

  // initialise variables, create canvas, paddles, ball, event listeners(?)
  // TODO CONCEPT: where to put event listeners?
  constructor(containerId?: string, width?: number, height?: number) {
    // create and append canvas
    this.canvas = document.createElement('canvas');
    this.canvas.height = height;
    this.canvas.width = width;
    this.canvas.className = "";

    if (containerId) {
      document.getElementById(containerId)?.appendChild(this.canvas);
    }

    this.gameManager = new GameManager();
    this.courtBounds = new GameCourtBounds(width, height);

    const ballSize = height * GameSize.BALL_SIZE_RATIO;
    this.ball = new Ball(width / 2, height / 2, 4, -2, ballSize);

    this.paddles = [
      new Paddle(0, width, height, this.courtBounds),
      new Paddle(1, width, height, this.courtBounds),
    ];

    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // canvas 2D context
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");
    this.ctx = ctx;

    // SINGLE ANIMATION LOOP running in BabylonCanvas
    // if there is the intention of instantiating this class outside Babylon 3D...
    // run animation loop here. Otherwise, BabylonCanvas will be responsible for it
    if (containerId) {
      // start rendering/drawing stuff
      this.render2DGameCanvas = this.render2DGameCanvas.bind(this);
      this.render2DGameCanvas(true);
    }
  }

  // draw stuff
  public render2DGameCanvas(runLoop: boolean = false) {
    // clear!!!!!!!!!!!!!!!!!!!
    this.ctx.fillStyle = "rgba(10, 20, 40, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.courtBounds.draw(this.ctx);

    this.paddles.forEach(paddle => paddle.draw(this.ctx));

    this.ball.draw(this.ctx);

    // ball constantly moves... TODO CONCEPT: add some randomness to the ball movement
    if (this.gameManager.isStarted) {
      this.ball.updatePosition(
        1, // or your delta time... delta time???
        this.courtBounds,
        this.paddles,
        this.gameManager.getLevel(),
        () => {
          // sound?? log?? messages?
        }
      );
    }

    // Move paddles if direction is set
    for (let i = 0; i < this.paddles.length; i++) {
      const dir = this.paddleDirections[i];
      if (dir === 'up') this.paddles[i].moveUp();
      if (dir === 'down') this.paddles[i].moveDown();
    }

    // runLoop when GameCanvas is responsible for the animation
    if (runLoop) {
      this.animationId = requestAnimationFrame(() => this.render2DGameCanvas(true));
    }
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  private onKeyDown(event: KeyboardEvent) {
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
  }

  private onKeyUp(event: KeyboardEvent) {
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
  }

  public stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
