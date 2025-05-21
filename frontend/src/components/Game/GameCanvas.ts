// TODO: first test, create a canvas and draw a ball that bounces off the walls
// TODO: create FE structure
export class GameCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private ball = { x: 400, y: 200, dx: 2, dy: 2, radius: 10 };

  constructor(containerId: string) {
    // create and append canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 400;
    this.canvas.className = "border bg-black";
    document.getElementById(containerId)?.appendChild(this.canvas);

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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // draw ball
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "white";
    this.ctx.fill();
    this.ctx.closePath();

    // move ball
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // bounce ball off walls
    if (this.ball.x <= this.ball.radius || this.ball.x >= this.canvas.width - this.ball.radius)
      this.ball.dx *= -1;
    if (this.ball.y <= this.ball.radius || this.ball.y >= this.canvas.height - this.ball.radius)
      this.ball.dy *= -1;

    // loop
    this.animationId = requestAnimationFrame(this.render);
  }

  public stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
