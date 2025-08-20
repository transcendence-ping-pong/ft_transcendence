import { Paddle } from '@/game/objects/Paddle.js';
import { GameLevel, GameScore, BallLevelConfig, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/utils/gameUtils/GameConstants.js';
import { GameCourtBounds } from '@/game/objects/GameCourtBounds.js';
import { state } from '@/state';

/*
  Ball responsabilities:
  - mantain its own position, velocity, size
  - provide methods to update its state (move, bounce, reset)
  - provide information about its state:
    - am I out of bounds, on each side?
    - which one is the scoring player?
    - am I colliding with a paddle?

  Do not:
  - handle out of bounds/ scoring logic (it is GameManager's responsibility)
*/

export class Ball {
  // ball moves px/sec horizontally, -px/sec vertically
  private vx: number; // velocity: x axis direction (positive or negative) + step for jumping pixels (speed) 
  private vy: number; // idem, but for y axis
  private virtualX: number;
  private virtualY: number;
  public scoringPlayer: GameScore; // which player scored last, or DRAW if no one scored yet

  constructor(
    public x: number,
    public y: number,
    public size: number, // size of the ball (it is a square, as the original Pong game)
    private level: GameLevel,
    private courtBounds: GameCourtBounds,
    public color: string = "white",
  ) {
    this.virtualX = x;
    this.virtualY = y;
    this.setInitialVelocity();
  }

  private setInitialVelocity() {
    const { MIN } = BallLevelConfig[this.level];
    this.vx = MIN;
    this.vy = -MIN;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const scaleX = ctx.canvas.width / VIRTUAL_WIDTH;
    const scaleY = ctx.canvas.height / VIRTUAL_HEIGHT;
    const drawX = this.virtualX * scaleX;
    const drawY = this.virtualY * scaleY;
    const drawSize = this.size * Math.min(scaleX, scaleY);

    ctx.fillStyle = this.color;
    ctx.fillRect(drawX - drawSize / 2, drawY - drawSize / 2, drawSize, drawSize);
  }

  collidesWithPaddle = (paddle: Paddle) => {
    // only consider collision if ball is moving toward this paddle (mirrors remote logic)
    const isPaddleOnLeft = paddle.getX() < this.virtualX;
    if ((isPaddleOnLeft && this.vx >= 0) || (!isPaddleOnLeft && this.vx <= 0)) {
      return false;
    }

    // aabb overlap check, mirrors remote collision for robustness
    const ballLeft = this.virtualX - this.size / 2;
    const ballRight = this.virtualX + this.size / 2;
    const ballTop = this.virtualY - this.size / 2;
    const ballBottom = this.virtualY + this.size / 2;

    const paddleLeft = paddle.getX();
    const paddleRight = paddle.getX() + paddle.getWidth();
    const paddleTop = paddle.getY();
    const paddleBottom = paddle.getY() + paddle.getHeight();

    return (
      ballRight >= paddleLeft &&
      ballLeft <= paddleRight &&
      ballBottom >= paddleTop &&
      ballTop <= paddleBottom
    );
  };

  public getY(): number {
    return this.virtualY;
  }

  public getX(): number {
    return this.virtualX;
  }

  public getVelocityX(): number {
    return this.vx;
  }

  public getVelocityY(): number {
    return this.vy;
  }

  isOutOfBounds = (left: number, right: number) => {
    return (
      this.virtualX - this.size / 2 < left || // left side wall courtBounds
      this.virtualX + this.size / 2 > right // right side wall courtBounds
    );
  };

  bounceOffPaddle(paddle: Paddle, onPaddleBounce?: () => void) {
    const { MAX, MIN, maxBounceAngle } = BallLevelConfig[this.level];

    // determine side based on pre-bounce velocity
    const comingFromLeft = this.vx > 0 ? true : false; // vx>0 means moving right, hit right paddle; else left paddle

    // prevent sticking to the paddle: push ball just outside with a 1px buffer
    if (!comingFromLeft) {
      // moving left, collided with left paddle
      this.virtualX = paddle.getX() + paddle.getWidth() + this.size / 2 + 1;
    } else {
      // moving right, collided with right paddle
      this.virtualX = paddle.getX() - this.size / 2 - 1;
    }

    // calculate bounce angle based on contact point
    const relativeIntersectY = this.virtualY - (paddle.getY() + paddle.getHeight() / 2);
    const normalized = relativeIntersectY / (paddle.getHeight() / 2);
    const bounceAngle = normalized * maxBounceAngle;

    // increase speed slightly, clamp within level min/max
    let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    speed = Math.max(Math.min(speed * 1.2, MAX), MIN);

    // update velocity: reflect horizontally and set according to angle
    this.vx = (comingFromLeft ? -Math.abs(speed * Math.cos(bounceAngle)) : Math.abs(speed * Math.cos(bounceAngle)));
    this.vy = speed * Math.sin(bounceAngle);

    if (onPaddleBounce) onPaddleBounce();
  }

  // bounceOffPaddle(paddle: Paddle, onPaddleBounce?: () => void) {
  //   const { MAX, MIN, maxBounceAngle } = BallLevelConfig[this.level];

  //   // prevent sticking to the paddle
  //   if (this.vx < 0) {
  //     this.virtualX = paddle.getX() + paddle.getWidth() + this.size / 2; // left paddle
  //   } else {
  //     this.virtualX = paddle.getX() - this.size / 2; // right paddle
  //   }

  //   // calculate normalized hit position (-1 to 1)
  //   const relativeIntersectY = (this.virtualY - (paddle.getY() + paddle.getHeight() / 2));
  //   const normalized = relativeIntersectY / (paddle.getHeight() / 2);
  //   const bounceAngle = normalized * maxBounceAngle;

  //   // TODO CONCEPT: should we increase speed after each hit? or after first hit?
  //   // calculate current speed and increase by 20% (cap at MAX_BALL_SPEED)
  //   let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  //   speed = Math.max(Math.min(speed * 1.5, MAX), MIN);

  //   // update velocity: always right direction after left paddle, or left direction after right paddle
  //   this.vx = (this.vx < 0 ? Math.abs(speed * Math.cos(bounceAngle)) : -Math.abs(speed * Math.cos(bounceAngle)));
  //   this.vy = speed * Math.sin(bounceAngle);

  //   if (onPaddleBounce) onPaddleBounce(); // TODO CONCEPT: sound?? log??
  // }

  // https://www.virtualYoutube.com/watch?v=6i5kZV_KOCU
  updatePosition(
    dt: number,
    paddles: Paddle[],
    onPaddleBounce?: () => void, // callback
    onOutOfBounds?: () => void // callback
  ) {
    // Paddle collision
    for (const paddle of paddles) {
      if (this.collidesWithPaddle(paddle)) {
        this.bounceOffPaddle(paddle, onPaddleBounce);
      }
    }

    // wall collision (top/bottom)
    const { top, bottom, left, right } = this.courtBounds.specs;
    if (this.virtualY - this.size / 2 < top) {
      this.virtualY = top + this.size / 2;
      this.vy = -this.vy;
    }
    if (this.virtualY + this.size / 2 > bottom) {
      this.virtualY = bottom - this.size / 2;
      this.vy = -this.vy;
    }

    // wall collision (left/right) = out of bounds
    if (this.virtualX - this.size / 2 < left) this.scoringPlayer = GameScore.RIGHT;
    if (this.virtualX + this.size / 2 > right) this.scoringPlayer = GameScore.LEFT;
    if (this.scoringPlayer && onOutOfBounds) onOutOfBounds();

    // position = position + velocity
    // velocity = velocity + acceleration
    this.virtualX += this.vx * dt;
    this.virtualY += this.vy * dt;
  }

  // the player who just lost the point serves the next ball
  resetPosition() {
    const { maxBounceAngle } = BallLevelConfig[this.level];
    const { left, right, top, bottom } = this.courtBounds.specs;

    this.virtualX = (left + right) / 2;
    this.virtualY = (top + bottom) / 2;

    const angle = (Math.random() - 0.5) * maxBounceAngle;
    const direction = this.scoringPlayer === GameScore.LEFT ? 1 : -1;
    this.setInitialVelocity();
    this.vx *= direction * Math.cos(angle);
    this.vy *= Math.sin(angle);
    this.scoringPlayer = GameScore.DRAW;
  }
}
