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
    if (now - this.lastDecisionTime < 1000) return; // refresh 1s
    this.lastDecisionTime = now;

    if (this.isBallApproaching()) {
      const predictedY = this.predictBallY(1); // 1s à frente
      this.targetY = this.targetY === null
        ? predictedY
        : this.smoothTarget(this.targetY, predictedY);
    } else {
      this.targetY = null;
      this.gameCanvas.setPaddleDirection(this.playerIndex, null);
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

    // prever apenas se a bola está indo em direção ao paddle
    if ((this.playerIndex === 1 && ballVX > 0) || (this.playerIndex === 0 && ballVX < 0)) {
      // tempo até chegar na posição do paddle
      const distance = Math.abs(paddleX - ballX);
      const time = distance / Math.abs(ballVX) + secondsAhead; // antecipa

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

      // para Medium, adiciona leve imperfeição humana
      if (this.level === 'MEDIUM') {
        const offset = (Math.random() - 0.5) * this.paddle.getHeight() * 0.2;
        predictedY += offset;
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
      case 'EASY': range = fieldWidth * 0.2; break;
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
    const deadZone = this.level === 'HARD' ? 1 : (this.level === 'MEDIUM' ? 1.5 : 2);
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
      case 'EASY': return 0.3 * oldY + 0.7 * newY;
      case 'MEDIUM': return 0.7 * oldY + 0.3 * newY; // mais humano, mas preciso
      case 'HARD': return newY; // quase perfeito
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
      case 'MEDIUM': return fieldHeight * 0.02;
      case 'HARD': return fieldHeight * 0.001;
      default: return fieldHeight * 0.03;
    }
  }
}
