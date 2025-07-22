// frontend/src/game/BotPlayer.ts
import type { Paddle } from './objects/Paddle';
import type { Ball } from './objects/Ball';
import { GameLevel } from '@/utils/gameUtils/Constants';

export class BotPlayer {
  private paddle: Paddle;
  private ball: Ball;
  private canvasHeight: number;
  private level: GameLevel;

  constructor(paddle: Paddle, ball: Ball, canvasHeight: number, level: GameLevel) {
    this.paddle = paddle;
    this.ball = ball;
    this.canvasHeight = canvasHeight;
    this.level = level;
  }

  update(deltaTime: number): void {
    const ballY = this.ball.getY();
    const paddleY = this.paddle.getY();
    const paddleHeight = this.paddle.getHeight();
    const paddleCenter = paddleY + paddleHeight / 2;

    // Configurações por dificuldade
    let speed = 2;
    let precisionOffset = 0;
    let reactionThreshold = 0;

    switch (this.level) {
      case GameLevel.EASY:
        speed = 2;
        precisionOffset = 30;
        reactionThreshold = 40;
        break;
      case GameLevel.MEDIUM:
        speed = 3;
        precisionOffset = 15;
        reactionThreshold = 20;
        break;
      case GameLevel.HARD:
        speed = 4;
        precisionOffset = 0;
        reactionThreshold = 0;
        break;
    }

    const targetY = ballY + (Math.random() - 0.5) * precisionOffset;

    if (Math.abs(targetY - paddleCenter) > reactionThreshold) {
      if (targetY < paddleCenter) {
        this.paddle.moveUp(deltaTime * speed);
      } else {
        this.paddle.moveDown(deltaTime * speed);
      }
    }
  }
}
