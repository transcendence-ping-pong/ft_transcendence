import { GameSize, CourtBoundsSpecs } from '@/utils/gameUtils/GameConstants.js';

// single source of truth for the game limits
export class GameCourtBounds {
  public specs: CourtBoundsSpecs = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  constructor(private width: number, private height: number, private color: string = "white") {
    const marginX = width * GameSize.COURT_MARGIN_X;
    const marginY = height * GameSize.COURT_MARGIN_Y;
    this.specs.left = marginX;
    this.specs.right = width - marginX;
    this.specs.top = marginY;
    this.specs.bottom = height - marginY;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const scaleX = ctx.canvas.width / this.width;
    const scaleY = ctx.canvas.height / this.height;

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width * GameSize.LINE_WIDTH_RATIO * scaleX;

    ctx.setLineDash([this.width * GameSize.DASH_LENGTH * scaleX, this.width * GameSize.DASH_GAP * scaleX]);

    // top horizontal line
    ctx.beginPath();
    ctx.moveTo(this.specs.left * scaleX, this.specs.top * scaleY);
    ctx.lineTo(this.specs.right * scaleX, this.specs.top * scaleY);
    ctx.stroke();

    // bottom horizontal line
    ctx.beginPath();
    ctx.moveTo(this.specs.left * scaleX, this.specs.bottom * scaleY);
    ctx.lineTo(this.specs.right * scaleX, this.specs.bottom * scaleY);
    ctx.stroke();

    // center line
    ctx.beginPath();
    ctx.moveTo((this.width / 2) * scaleX, this.specs.top * scaleY);
    ctx.lineTo((this.width / 2) * scaleX, this.specs.bottom * scaleY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
  }
}
