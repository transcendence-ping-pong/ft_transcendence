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
    if (this.targetY === null || now - this.lastDecisionTime >= 1000) {
      this.lastDecisionTime = now;
      if (this.isBallApproaching()) {
        let predictedY;
        if (this.targetY === null) {
          predictedY = this.ball.getY();
        } else {
          predictedY = this.predictBallY();
        }

        this.targetY = this.targetY === null
          ? predictedY
          : this.smoothTarget(this.targetY, predictedY);

      } else {
        this.targetY = null;
        this.gameCanvas.setPaddleDirection(this.playerIndex, null);
      }
    }

    const paddleCenter = this.getPaddleCenter();
    const threshold = this.getReactionThreshold();

    if (this.targetY !== null) {
      this.moveTowards(this.targetY, paddleCenter, threshold);
    } else {
      if (this.level === 'EASY') {
        this.centerPaddle(threshold);
      } else {
        this.gameCanvas.setPaddleDirection(this.playerIndex, null);
      }
    }
  }

  private predictBallY(secondsAhead: number = 0): number {
    let ballY = this.ball.getY();
    let ballX = this.ball.getX();
    let ballVY = this.ball.getVelocityY();
    let ballVX = this.ball.getVelocityX();
    const paddleX = this.paddle.getX();
    const { top, bottom } = this.gameCanvas.getCourtBounds().specs;
    if ((this.playerIndex === 1 && ballVX > 0) || (this.playerIndex === 0 && ballVX < 0)) {
      const distance = Math.abs(paddleX - ballX);
      const time = distance / Math.abs(ballVX) + secondsAhead;

      let predictedY = ballY;
      let vy = ballVY;
      let t = time;

      while (t > 0) {
        const timeToWall = vy > 0 ? (bottom - predictedY) / vy : (top - predictedY) / vy;

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
    const fieldWidth = this.gameCanvas.getWidth();

    let range;
    switch (this.level) {
      case 'EASY': range = fieldWidth * 0.3; break;
      case 'MEDIUM': range = fieldWidth * 0.6; break;
      case 'HARD': range = fieldWidth * 0.95; break;
      default: range = fieldWidth * 0.5;
    }

    return (
      ((this.playerIndex === 1 && ballVX > 0 && ballX < paddleX) ||
        (this.playerIndex === 0 && ballVX < 0 && ballX > paddleX)) &&
      Math.abs(ballX - paddleX) < range
    );
  }

  private moveTowards(targetY: number, paddleCenter: number, threshold: number) {
    let deadZone = 1;
    if (this.level === 'HARD') {
      deadZone = 2;
    }
    const diff = targetY - paddleCenter;

    if (Math.abs(diff) > threshold || Math.abs(diff) > deadZone) {
      this.gameCanvas.setPaddleDirection(this.playerIndex, diff < 0 ? 'up' : 'down');
    } else {
      this.gameCanvas.setPaddleDirection(this.playerIndex, null);
    }
  }

  private centerPaddle(threshold: number) {
    const { top, bottom } = this.gameCanvas.getCourtBounds().specs;
    const centerY = (top + bottom) / 2 - this.paddle.getHeight() / 2;
    if (Math.abs(this.paddle.getY() - centerY) > threshold) {
      this.gameCanvas.setPaddleDirection(this.playerIndex, this.paddle.getY() < centerY ? 'down' : 'up');
    } else {
      this.gameCanvas.setPaddleDirection(this.playerIndex, null);
    }
  }

  private smoothTarget(oldY: number, newY: number): number {
    switch (this.level) {
      case 'EASY': return 0.6 * oldY + 0.3 * newY;
      case 'MEDIUM': return newY;
      case 'HARD': return newY;
      default: return newY;
    }
  }

  private getPaddleCenter(): number {
    return this.paddle.getY() + this.paddle.getHeight() / 2;
  }

  private getReactionThreshold(): number {
    const fieldHeight = this.gameCanvas.getHeight();
    switch (this.level) {
      case 'EASY': return fieldHeight * 0.04;
      case 'MEDIUM': return fieldHeight * 0.05;
      case 'HARD': return fieldHeight * 0.01;
      default: return fieldHeight * 0.03;
    }
  }
}
