import { GameManager } from '@/game/GameManager.js';
import { GameCourtBounds } from '@/game/objects/GameCourtBounds.js';
import { Ball } from '@/game/objects/Ball.js';
import { Paddle } from '@/game/objects/Paddle.js';
import { BallLevelConfig, GameLevel, GameSize, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/utils/gameUtils/types.js';
import { state } from '@/state';

/*
  Game Canvas responsabilities:
  - initialize and manage the 2D game canvas
  - create the game court, paddles, and ball
  - handle user input for paddle movement
  - manage the game loop for updating the game state and rendering
  - delegate game logic to GameManager

  Do not:
  - handle 3D rendering or Babylon.js specific logic
  - handle GUI logic or BabylonGUI specific logic
*/

export class GameCanvas extends EventTarget {
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
  constructor(level: GameLevel, containerId?: string, width?: number, height?: number) {
    super();
    // create and append canvas
    this.canvas = document.createElement('canvas');
    this.canvas.height = height;
    this.canvas.width = width;
    this.canvas.className = "";

    if (containerId) {
      document.getElementById(containerId)?.appendChild(this.canvas);
    }

    this.gameManager = new GameManager();

    const initialX = VIRTUAL_WIDTH / 2;
    const initialY = VIRTUAL_HEIGHT / 2;

    this.courtBounds = new GameCourtBounds(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    const ballSize = VIRTUAL_HEIGHT * GameSize.BALL_SIZE_RATIO;
    this.ball = new Ball(initialX, initialY, ballSize, level, this.courtBounds);

    this.paddles = [
      new Paddle(0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, this.courtBounds, level),
      new Paddle(1, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, this.courtBounds, level),
    ];

    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // canvas 2D context
    const ctx = this.canvas.getContext('2d', { alpha: true });
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
  public render2DGameCanvas(runLoop: boolean = false, deltaTime: number = 1) {

    // clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // update position ball + paddles
    // ball constantly moves... TODO CONCEPT: add some randomness to the ball movement
    if (this.gameManager.isStarted) {
      this.ball.updatePosition(
        deltaTime,
        this.paddles,
        () => { }, // onPaddleBounce callback, sound?? log?? messages?
        () => {
          this.gameManager.addScore(this.ball.scoringPlayer);
          this.dispatchEvent(new CustomEvent('scoreChanged', { detail: this.gameManager.score }));
          this.ball.resetPosition();

          // after updating the score, check if the game is over
          if (this.gameManager.isGameOver) {
            this.dispatchEvent(new CustomEvent('gameOver', { detail: this.gameManager.score }));
          }
        }
      );
    }

    // move paddles if direction is set
    for (let i = 0; i < this.paddles.length; i++) {
      const dir = this.paddleDirections[i];
      if (dir === 'up') this.paddles[i].moveUp(deltaTime);
      if (dir === 'down') this.paddles[i].moveDown(deltaTime);
    }

    // draw stuff
    const { PADDLE_WIDTH_RATIO, PADDLE_HEIGHT_RATIO } = GameSize;
    const paddleSizeX = VIRTUAL_WIDTH * PADDLE_WIDTH_RATIO;
    const paddleSizeY = (VIRTUAL_HEIGHT - this.courtBounds.specs.top * 2) * PADDLE_HEIGHT_RATIO;
    this.courtBounds.draw(this.ctx);
    this.paddles.forEach(paddle => paddle.draw(this.ctx, paddleSizeX, paddleSizeY));
    this.ball.draw(this.ctx);

    // runLoop when GameCanvas is responsible for the animation
    if (runLoop) {
      this.animationId = requestAnimationFrame(() => this.render2DGameCanvas(true));
    }
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  public getGameManager(): GameManager {
    return this.gameManager;
  }

  public setLevel(level: GameLevel): void {
    this.gameManager.setLevel(level);
  }

  public getLevel(): GameLevel {
    return this.gameManager.getLevel();
  }

  public startGame() {
    this.gameManager.startGame();
    // reset ball and paddles here?????
    this.reset();
  }

  public reset() {
    this.gameManager.getLevel();
    // Reset ball and paddles to initial positions
    this.ball.resetPosition();
    this.paddles[0].resetPosition();
    this.paddles[1].resetPosition();
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
