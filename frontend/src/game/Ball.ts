import { Paddle } from './Paddle.js';
import { GameLevel, BallLevelConfig } from '../utils/gameUtils/types.js';
import { GameCourtBounds } from './GameCourtBounds.js';

export class Ball {
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
