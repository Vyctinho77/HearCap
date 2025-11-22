import {
  BaseDrawingTool,
  HANDLE_COLORS,
  HANDLE_RADIUS,
  HIT_TOLERANCE,
  applyLineStyle,
  distanceBetweenPoints,
  distancePointToSegment,
} from "./base-tool.js";

const DEFAULT_STYLE = {
  strokeColor: "#FFFFFF",
  lineWidth: 2,
  lineStyle: "solid",
  opacity: 1,
};

function clonePoint(point = { index: 0, price: 0 }) {
  return {
    index: Number(point.index) || 0,
    price: Number(point.price) || 0,
  };
}

export class TrendlineProTool extends BaseDrawingTool {
  constructor(options = {}) {
    super("trendline-pro", {
      ...options,
      style: { ...DEFAULT_STYLE, ...(options.style || {}) },
    });
    this.points = Array.isArray(options.points)
      ? options.points.map(clonePoint)
      : [];
    if (this.points.length === 1) {
      this.points.push(clonePoint(this.points[0]));
    }
  }

  getBoundingBoxInWorld() {
    if (this.points.length < 2) {
      return null;
    }
    const indices = this.points.map((point) => point.index);
    const prices = this.points.map((point) => point.price);
    return {
      minIndex: Math.min(...indices),
      maxIndex: Math.max(...indices),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  }

  getToolbarReference(transform) {
    if (!transform || this.points.length < 2) {
      return null;
    }
    const mid = {
      index: (this.points[0].index + this.points[1].index) / 2,
      price: (this.points[0].price + this.points[1].price) / 2,
    };
    return transform.worldToPixels(mid);
  }

  begin(worldPoint) {
    const start = clonePoint(worldPoint);
    this.points = [start, clonePoint(worldPoint)];
  }

  update(worldPoint) {
    if (!this.points.length) {
      this.begin(worldPoint);
      return;
    }
    this.points[1] = clonePoint(worldPoint);
  }

  updateHandle(handleIndex, worldPoint) {
    if (!this.points[handleIndex]) {
      return;
    }
    this.points[handleIndex] = clonePoint(worldPoint);
  }

  translate(deltaIndex, deltaPrice) {
    for (let i = 0; i < this.points.length; i += 1) {
      this.points[i].index += deltaIndex;
      this.points[i].price += deltaPrice;
    }
  }

  isValid() {
    if (this.points.length < 2) return false;
    const dx = this.points[1].index - this.points[0].index;
    const dy = this.points[1].price - this.points[0].price;
    return Math.abs(dx) > 1e-3 || Math.abs(dy) > 1e-3;
  }

  draw(ctx, transform) {
    if (!ctx || !transform || this.points.length < 2) {
      return;
    }
    const [start, end] = this.points;
    const startPx = transform.worldToPixels(start);
    const endPx = transform.worldToPixels(end);
    const style = this.style || DEFAULT_STYLE;
    ctx.save();
    ctx.globalAlpha = this.selected
      ? Math.min(1, (style.opacity ?? 1) + 0.15)
      : style.opacity ?? 1;
    const width = style.lineWidth || 2;
    ctx.lineWidth = this.selected ? Math.min(width + 1, width + 2) : width;
    ctx.strokeStyle = style.strokeColor || "#FFFFFF";
    applyLineStyle(ctx, style);
    ctx.beginPath();
    ctx.moveTo(startPx.x, startPx.y);
    ctx.lineTo(endPx.x, endPx.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.selected) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = HANDLE_COLORS.fill;
      ctx.strokeStyle = HANDLE_COLORS.stroke;
      [startPx, endPx].forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  hitTest(x, y, transform) {
    if (!transform || this.points.length < 2) {
      return null;
    }
    const handles = this.points.map((point) => {
      const pixel = transform.worldToPixels(point);
      return { world: point, pixel };
    });
    for (let i = 0; i < handles.length; i += 1) {
      const handle = handles[i];
      const distance = distanceBetweenPoints(x, y, handle.pixel.x, handle.pixel.y);
      if (distance <= HIT_TOLERANCE) {
        return { action: "handle", handleIndex: i };
      }
    }
    const start = handles[0].pixel;
    const end = handles[1].pixel;
    const distance = distancePointToSegment(x, y, start.x, start.y, end.x, end.y);
    if (distance <= HIT_TOLERANCE) {
      return { action: "move" };
    }
    return null;
  }

  serialize() {
    return {
      ...super.serialize(),
      points: this.points.map(clonePoint),
    };
  }
}
