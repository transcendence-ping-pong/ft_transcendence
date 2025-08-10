import { Paddle } from './objects/Paddle';
import { Ball } from './objects/Ball';
import { GameLevel } from '@/utils/gameUtils/GameConstants';

export class BotPlayer {
  private paddle: Paddle;
  private ball: Ball;
  private speedMultiplier: number;

  constructor(paddle: Paddle, ball: Ball, level: GameLevel) {
    this.paddle = paddle;
    this.ball = ball;

    switch (level) {
      case 'EASY':
        this.speedMultiplier = 0.5;
        break;
      case 'MEDIUM':
        this.speedMultiplier = 1.0;
        break;
      case 'HARD':
        this.speedMultiplier = 1.3;
        break;
      default:
        this.speedMultiplier = 1.0;
    }
  }

  update(deltaTime: number) {
    const paddleY = this.paddle.getY() + this.paddle.getHeight() / 2;
    const ballY = this.ball.getY();

    const threshold = 5;

    if (Math.abs(ballY - paddleY) > threshold) {
      if (ballY < paddleY) {
        this.paddle.moveUp(deltaTime * this.speedMultiplier);
      } else {
        this.paddle.moveDown(deltaTime * this.speedMultiplier);
      }
    }
  }
}

// TODO: SEE IF IS POSSIBLE TO USE THIS CODE FOR IMPLEMENTING SOME CARACTERISTICS OF AI MODULE

// // frontend/src/game/BotPlayer.ts
// import type { Paddle } from './objects/Paddle';
// import type { Ball } from './objects/Ball';
// import { GameLevel } from '@/utils/gameUtils/GameConstants';

// export class BotPlayer {
//   private paddle: Paddle;
//   private ball: Ball;
//   private canvasHeight: number;
//   private level: GameLevel;
//   private reactionDelayTimer = 0;

//   constructor(paddle: Paddle, ball: Ball, canvasHeight: number, level: GameLevel) {
//     this.paddle = paddle;
//     this.ball = ball;
//     this.canvasHeight = canvasHeight;
//     this.level = level;
//   }

//   update(deltaTime: number): void {

//     const ballY = this.ball.getY();
//     const paddleY = this.paddle.getY();
//     const paddleHeight = this.paddle.getHeight();
//     const paddleCenter = paddleY + paddleHeight / 2;

//     // Configurações por dificuldade
//     let speed = 2;
//     let precisionOffset = 0;
//     let reactionThreshold = 0;
//     let errorChance = 0;
//     let delay = 0;
    

//     switch (this.level) {
//       case GameLevel.EASY:
//         delay = 0.15;
//         speed = 3;
//         precisionOffset = 30;
//         reactionThreshold = 40;
//         errorChance = 0.15;
//         break;
//       case GameLevel.MEDIUM:
//         delay = 0.05;
//         speed = 3.5;
//         precisionOffset = 10;
//         reactionThreshold = 15;
//         errorChance = 0.03;
//         break;
//       case GameLevel.HARD:
//         delay = 0;
//         speed = 3.5;
//         precisionOffset = 5;
//         reactionThreshold = 10;
//         errorChance = 0.01;
//         break;
//     }

//     // Delay de reação (temporizador)
//     this.reactionDelayTimer += deltaTime;
//     if (this.reactionDelayTimer < delay) return;
//     this.reactionDelayTimer = 0;

//     // Chance de errar e ignorar o movimento
//     if (Math.random() < errorChance) return;

//     // Alvo com imprecisão
//     const targetY = ballY + (Math.random() - 0.5) * precisionOffset;

//     // Movimentação apenas se estiver longe o suficiente
//     if (Math.abs(targetY - paddleCenter) > reactionThreshold) {
//       if (targetY < paddleCenter) {
//         this.paddle.moveUp(deltaTime * speed);
//       } else {
//         this.paddle.moveDown(deltaTime * speed);
//       }
//     }
//   }
// }
