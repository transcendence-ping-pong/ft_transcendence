import { GameSize, CourtBoundsSpecs } from '../../utils/gameUtils/types.js';

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
    // is this overkill? maybe......
    ctx.save(); // save current state in stack, sp it doesn't affect other drawings
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width * GameSize.LINE_WIDTH_RATIO;

    ctx.setLineDash([GameSize.DASH_LENGTH, GameSize.DASH_GAP]);
    // top horizontal line
    ctx.beginPath();
    ctx.moveTo(this.specs.left, this.specs.top);
    ctx.lineTo(this.specs.right, this.specs.top);
    ctx.stroke();

    // bottom horizontal line
    ctx.beginPath();
    ctx.moveTo(this.specs.left, this.specs.bottom);
    ctx.lineTo(this.specs.right, this.specs.bottom);
    ctx.stroke();

    // center line
    ctx.beginPath();
    ctx.moveTo(this.width / 2, this.specs.top);
    ctx.lineTo(this.width / 2, this.specs.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore(); // restore previous state from stack
  }
}
