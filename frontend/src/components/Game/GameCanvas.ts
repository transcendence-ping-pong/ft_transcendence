// TODO: first test, create a canvas and draw a ball that bounces off the walls

class Ball {
  constructor(public x: number, public y: number, public dx: number, public dy: number, public radius: number, public color: string = "white") { }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
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
  private ball = new Ball(400, 200, 2, 2, 10);
  private paddles: Paddle[];

  constructor(containerId?: string, width?: number, height?: number) {
    // create and append canvas
    this.canvas = document.createElement('canvas');
    this.canvas.height = height;
    this.canvas.width = width; // width based on aspect ratio
    this.canvas.className = "border bg-black";
    // document.getElementById(containerId)?.appendChild(this.canvas);

    this.paddles = [
      new Paddle(50, 150, 10, 100),
      new Paddle(740, 150, 10, 100),
    ];

    // get canvas context
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");
    this.ctx = ctx;

    // start rendering
    this.render = this.render.bind(this);
    this.render();
  }

  private render() {
    // clear
    this.ctx.fillStyle = "rgba(10, 20, 40, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // draw paddles
    this.paddles.forEach(paddle => paddle.draw(this.ctx));

    // draw ball
    this.ball.draw(this.ctx);

    // TODO: encapsulate ball movement, bouncing, collision detection (?)
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // FOR TESTING ONLY
    // bounce ball off walls
    if (this.ball.x <= this.ball.radius || this.ball.x >= this.canvas.width - this.ball.radius)
      this.ball.dx *= -1;
    if (this.ball.y <= this.ball.radius || this.ball.y >= this.canvas.height - this.ball.radius)
      this.ball.dy *= -1;

    // TODO: paddle collision
    // this.paddles.forEach(paddle => {
    //   if (
    //     this.ball.x - this.ball.radius < paddle.x + paddle.width && // ball left edge < paddle right edge
    //     this.ball.x + this.ball.radius > paddle.x &&                // ball right edge > paddle left edge
    //     this.ball.y + this.ball.radius > paddle.y &&                // ball bottom edge > paddle top edge
    //     this.ball.y - this.ball.radius < paddle.y + paddle.height   // ball top edge < paddle bottom edge
    //   ) {
    //     this.ball.dx *= -1;
    //   }
    // });

    // loop
    this.animationId = requestAnimationFrame(this.render);
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  public stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
