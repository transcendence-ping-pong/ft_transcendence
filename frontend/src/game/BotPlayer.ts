import { Paddle } from './objects/Paddle';
import { Ball } from './objects/Ball';
import { GameLevel } from '@/utils/gameUtils/GameConstants';
import { GameCanvas } from '@/game/GameCanvas';

export class BotPlayer {
  private paddle: Paddle;
  private ball: Ball;
  private gameCanvas: GameCanvas;
  private playerIndex: 0 | 1;
  private lastDecisionTime = 0;
  private level: GameLevel;
  private targetY: number | null = null;

  constructor(
    paddle: Paddle,
    ball: Ball,
    gameCanvas: GameCanvas,
    playerIndex: 0 | 1,
    level: GameLevel
  ) {
    this.paddle = paddle;
    this.ball = ball;
    this.gameCanvas = gameCanvas;
    this.playerIndex = playerIndex;
    this.level = level;
  }

  update() {
    const now = Date.now();
    if (now - this.lastDecisionTime < 1000) return;
    this.lastDecisionTime = now;

    const threshold = this.getReactionThreshold();
    const paddleCenter = this.getPaddleCenter();

    if (this.isBallApproaching()) {
      const predictedY = this.predictBallY();
      this.targetY = this.targetY === null
        ? predictedY
        : this.smoothTarget(this.targetY, predictedY);
      this.moveTowards(this.targetY, paddleCenter, threshold);
    } else {
      if (this.level === 'HARD' || this.level === 'MEDIUM') {
        if (this.targetY !== null)
          //this.centerPaddle(threshold);
          this.gameCanvas.setPaddleDirection(this.playerIndex, null);
        // } else {
        //   this.centerPaddle(threshold);
        // }
      } else {
        this.targetY = null;
        this.centerPaddle(threshold);
      }
    }
  }

  private predictBallY(): number {
    let ballY = this.ball.getY();
    let ballX = this.ball.getX();
    let ballVY = this.ball.getVelocityY();
    let ballVX = this.ball.getVelocityX();
    let paddleX = this.paddle.getX();
    const { top, bottom } = this.gameCanvas.getCourtBounds().specs;

    if ((this.playerIndex === 1 && ballVX > 0) || (this.playerIndex === 0 && ballVX < 0)) {
      const distance = Math.abs(paddleX - ballX);
      const time = distance / Math.abs(ballVX);

      let predictedY = ballY;
      let vy = ballVY;
      let t = time;

      while (t > 0) {
        const timeToWall = vy > 0
          ? (bottom - predictedY) / vy
          : (top - predictedY) / vy;

        if (timeToWall > t) {
          predictedY += vy * t;
          t = 0;
        } else {
          predictedY += vy * timeToWall;
          vy = -vy;
          t -= timeToWall;
          predictedY = Math.max(top, Math.min(bottom, predictedY));
        }
      }
      return predictedY;
    }
    return (top + bottom) / 2;
  }

  private isBallApproaching(): boolean {
    const ballVX = this.ball.getVelocityX();
    const ballX = this.ball.getX();
    const paddleX = this.paddle.getX();
    let range;

    switch (this.level) {
      case 'EASY': range = 500; break;
      case 'MEDIUM': range = 450; break;
      case 'HARD': range = 400; break;
      default: range = 400;
    }  
    return (
      ((this.playerIndex === 1 && ballVX > 0 && ballX < paddleX) ||
        (this.playerIndex === 0 && ballVX < 0 && ballX > paddleX)) &&
      Math.abs(ballX - paddleX) < range
    );
  }

  private moveTowards(targetY: number, paddleCenter: number, threshold: number) {
  const deadZone = 2;
  const diff = Math.abs(targetY - paddleCenter);
  if (diff > threshold) {
    if (targetY < paddleCenter) {
      this.gameCanvas.setPaddleDirection(this.playerIndex, 'up');
    } else {
      this.gameCanvas.setPaddleDirection(this.playerIndex, 'down');
    }
  } else if (diff > deadZone && this.level === 'HARD') {
    if (targetY < paddleCenter) {
      this.gameCanvas.setPaddleDirection(this.playerIndex, 'up');
    } else {
      this.gameCanvas.setPaddleDirection(this.playerIndex, 'down');
    }
  } else {
    this.gameCanvas.setPaddleDirection(this.playerIndex, null);
  }
}

  private centerPaddle(threshold: number) {
    const { top, bottom } = this.gameCanvas.getCourtBounds().specs;
    const centerY = (top + bottom) / 2 - this.paddle.getHeight() / 2;
    if (Math.abs(this.paddle.getY() - centerY) > threshold) {
      if (this.paddle.getY() < centerY) {
        this.gameCanvas.setPaddleDirection(this.playerIndex, 'down');
      } else {
        this.gameCanvas.setPaddleDirection(this.playerIndex, 'up');
      }
    } else {
      this.gameCanvas.setPaddleDirection(this.playerIndex, null);
    }
  }

  private smoothTarget(oldY: number, newY: number): number {
    switch (this.level) {
      case 'EASY': return 0.6 * oldY + 0.3 * newY;;
      case 'MEDIUM': return newY;
      case 'HARD': return newY;
      default: return newY;
    }
  }

  private getPaddleCenter(): number {
    return this.paddle.getY() + this.paddle.getHeight() / 2;
  }

  private getReactionThreshold(): number {
    switch (this.level) {
      case 'EASY': return 6;
      case 'MEDIUM': return 6;
      case 'HARD': return 3;
      default: return 6;
    }
  }
}
