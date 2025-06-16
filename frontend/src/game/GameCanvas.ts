import { GameManager } from '@/game/GameManager.js';
import { GameCourtBounds } from '@/game/objects/GameCourtBounds.js';
import { Ball } from '@/game/objects/Ball.js';
import { Paddle } from '@/game/objects/Paddle.js';
import { GameLevel, GameSize } from '@/utils/gameUtils/types.js';

/*
  Game Canvas responsabilities:
  - initialize and manage the 2D game canvas
  - create the game court, paddles, and ball
  - handle user input for paddle movement
  - provide methods to start, reset, and stop the game
  - manage the game loop for updating the game state and rendering
  - delegate game logic to GameManager

  Do not:
  - handle 3D rendering or Babylon.js specific logic
  - handle GUI logic or BabylonGUI specific logic
*/

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

  public setLevel(level: GameLevel) {
    this.gameManager.setLevel(level);
  }

  public startGame() {
    this.gameManager.startGame();
    // Optionally reset ball and paddles here if needed
    this.reset();
  }

  public reset() {
    // Reset ball and paddles to initial positions
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ballSize = height * GameSize.BALL_SIZE_RATIO;
    this.ball = new Ball(width / 2, height / 2, 4, -2, ballSize);
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
