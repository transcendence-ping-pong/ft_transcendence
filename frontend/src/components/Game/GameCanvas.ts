// TODO: first test, create a canvas and draw a ball that bounces off the walls

// single source of truth for the game limits
class GameCourtBounds {
  public left: number;
  public right: number;
  public top: number;
  public bottom: number;

  constructor(public width: number, public height: number) {
    const marginX = width * 0.15;
    const marginY = height * 0.10;
    this.left = marginX;
    this.right = width - marginX;
    this.top = marginY;
    this.bottom = height - marginY;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // is this overkill? maybe......
    ctx.save(); // save current state in stack, sp it doesn't affect other drawings
    ctx.strokeStyle = "white";
    ctx.lineWidth = this.width * 0.01;

    ctx.setLineDash([40, 20]); // line, space
    // top horizontal line
    ctx.beginPath();
    ctx.moveTo(this.left, this.top);
    ctx.lineTo(this.right, this.top);
    ctx.stroke();

    // bottom horizontal line
    ctx.beginPath();
    ctx.moveTo(this.left, this.bottom);
    ctx.lineTo(this.right, this.bottom);
    ctx.stroke();

    // center line
    ctx.beginPath();
    ctx.moveTo(this.width / 2, this.top);
    ctx.lineTo(this.width / 2, this.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore(); // restore previous state from stack
  }
}

class Ball {
  constructor(
    public x: number,
    public y: number,
    public dx: number,
    public dy: number,
    public size: number,
    public color: string = "white"
  ) { }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}

class Paddle {
  constructor(public x: number, public y: number, public width: number, public height: number, public color: string = "white") { }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

export class GameCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private ball: Ball;
  private paddles: Paddle[];
  private paddleDirections: { [player: number]: 'up' | 'down' | null } = { 0: null, 1: null };
  private courtBounds: GameCourtBounds;

  // initialise variables, create canvas, paddles, ball, event listeners(?)
  // TODO CONCEPT: where to put event listeners?
  constructor(containerId?: string, width?: number, height?: number) {
    // create and append canvas
    this.canvas = document.createElement('canvas');
    this.canvas.height = height;
    this.canvas.width = width; // width based on aspect ratio
    // this.canvas.className = "border bg-black";
    // document.getElementById(containerId)?.appendChild(this.canvas);

    this.courtBounds = new GameCourtBounds(width, height);

    const paddleWidth = width * 0.01;
    const paddleHeight = (height - this.courtBounds.top * 2) * 0.22;
    const paddleLeftX = width * 0.20; // 10% from left
    const paddleRightX = width * 0.80 - paddleWidth; // 10% from right
    const paddleY = height / 2 - paddleHeight / 2;

    const ballSize = height * 0.025;
    this.ball = new Ball(width / 2, height / 2, 4, 4, ballSize);

    this.paddles = [
      new Paddle(paddleLeftX, paddleY, paddleWidth, paddleHeight),
      new Paddle(paddleRightX, paddleY, paddleWidth, paddleHeight),
    ];

    window.addEventListener('keydown', (event) => {
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
    });

    window.addEventListener('keyup', (event) => {
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
    });

    // canvas 2D context
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");
    this.ctx = ctx;

    // start rendering/drawing stuff
    this.render = this.render.bind(this);
    this.render();
  }

  // draw stuff
  private render() {
    // clear!!!!!!!!!!!!!!!!!!!
    this.ctx.fillStyle = "rgba(10, 20, 40, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.courtBounds.draw(this.ctx);

    this.paddles.forEach(paddle => paddle.draw(this.ctx));

    this.ball.draw(this.ctx);

    // ball constantly moves... TODO CONCEPT: add some randomness to the ball movement
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    this.handleBallCollisions();

    const paddleSpeed = 12; // pixels per frame

    // Move paddles if direction is set
    for (let i = 0; i < this.paddles.length; i++) {
      const dir = this.paddleDirections[i];
      if (dir === 'up') this.movePaddle(i, 'up', paddleSpeed);
      if (dir === 'down') this.movePaddle(i, 'down', paddleSpeed);
    }

    // loop!!!!!!!!!!
    this.animationId = requestAnimationFrame(this.render);
  }

  // move paddles using arrow keys and WASD keys (two players at the same time)
  // TODO CONCEPT: how to organise it when second player is AI?
  // does mouse movement needs to be handled too?
  public movePaddle(player: number, direction: 'up' | 'down', step: number = 20, gap: number = 5) {
    const paddle = this.paddles[player];
    if (direction === 'up') {
      if (paddle.y - step >= this.courtBounds.top + gap) {
        paddle.y -= step;
      }
    } else if (direction === 'down') {
      if (paddle.y + paddle.height + step <= this.courtBounds.bottom - gap) {
        paddle.y += step;
      }
    }
  }

  private handleBallCollisions() {
    // left/right walls
    if (
      this.ball.x - this.ball.size / 2 <= this.courtBounds.left ||
      this.ball.x + this.ball.size / 2 >= this.courtBounds.right
    ) {
      this.ball.dx *= -1;
      // TODO CONCEPT: handle scoring???
    }

    // top/bottom walls
    if (
      this.ball.y - this.ball.size / 2 <= this.courtBounds.top ||
      this.ball.y + this.ball.size / 2 >= this.courtBounds.bottom
    ) {
      this.ball.dy *= -1;
    }

    // paddle collisions
    for (const paddle of this.paddles) {
      if (
        this.ball.x + this.ball.size / 2 > paddle.x &&
        this.ball.x - this.ball.size / 2 < paddle.x + paddle.width &&
        this.ball.y + this.ball.size / 2 > paddle.y &&
        this.ball.y - this.ball.size / 2 < paddle.y + paddle.height
      ) {
        this.ball.dx *= -1;
        // TODO CONCEPT: add some randomness or speed up the ball
      }
    }
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  public stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
