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
  lineWidth: 1.5,
  lineStyle: "solid",
  opacity: 0.65,
};

const LEVELS = [
  { value: 0, label: "0.0", fill: "rgba(255,255,255,0.03)" },
  { value: 0.236, label: "0.236", fill: "rgba(255,64,64,0.06)" },
  { value: 0.382, label: "0.382", fill: "rgba(255,196,64,0.08)" },
  { value: 0.5, label: "0.5", fill: "rgba(192,132,252,0.1)" },
  { value: 0.618, label: "0.618", fill: "rgba(0,255,128,0.08)" },
  { value: 0.786, label: "0.786", fill: "rgba(143,143,255,0.08)" },
  { value: 1, label: "1.0", fill: "rgba(255,255,255,0.03)" },
];

function clonePoint(point = { index: 0, price: 0 }) {
  return {
    index: Number(point.index) || 0,
    price: Number(point.price) || 0,
  };
}

function formatPrice(value) {
  return Number(value).toFixed(2);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export class FibonacciRetracementTool extends BaseDrawingTool {
  constructor(options = {}) {
    super("fibonacci", {
      ...options,
      style: { ...DEFAULT_STYLE, ...(options.style || {}) },
    });
    this.anchor = options.anchor ? clonePoint(options.anchor) : null;
    this.range = options.range ? clonePoint(options.range) : null;
    this.levels = Array.isArray(options.levels) && options.levels.length
      ? options.levels.map((level) => ({
          value: Number(level.value),
          label: level.label || String(level.value),
          fill: level.fill || "rgba(255,255,255,0.05)",
        }))
      : LEVELS.map((level) => ({ ...level }));
    this.showLabels = options.showLabels !== undefined ? !!options.showLabels : true;
    this.showPrices = options.showPrices !== undefined ? !!options.showPrices : true;
    this.showDiagonal = !!options.showDiagonal;
  }

  begin(worldPoint) {
    const start = clonePoint(worldPoint);
    this.anchor = start;
    this.range = clonePoint(worldPoint);
  }

  update(worldPoint) {
    if (!this.anchor) {
      this.begin(worldPoint);
      return;
    }
    this.range = clonePoint(worldPoint);
  }

  translate(deltaIndex, deltaPrice) {
    if (!this.anchor || !this.range) return;
    this.anchor.index += deltaIndex;
    this.range.index += deltaIndex;
    this.anchor.price += deltaPrice;
    this.range.price += deltaPrice;
  }

  updateHandle(handleIndex, worldPoint) {
    if (!this.anchor || !this.range) {
      return;
    }
    if (handleIndex === 0) {
      this.anchor = clonePoint(worldPoint);
    } else {
      this.range = clonePoint(worldPoint);
    }
  }

  isValid() {
    if (!this.anchor || !this.range) {
      return false;
    }
    const deltaIndex = Math.abs(this.range.index - this.anchor.index);
    const deltaPrice = Math.abs(this.range.price - this.anchor.price);
    return deltaIndex > 1e-3 && deltaPrice > 1e-3;
  }

  _getBounds(transform) {
    if (!this.anchor || !this.range || !transform) {
      return null;
    }
    const start = this.anchor;
    const end = this.range;
    const lowPrice = Math.min(start.price, end.price);
    const highPrice = Math.max(start.price, end.price);
    const startIndex = Math.min(start.index, end.index);
    const endIndex = Math.max(start.index, end.index);
    const startPx = transform.worldToPixels({ index: startIndex, price: highPrice });
    const endPx = transform.worldToPixels({ index: endIndex, price: lowPrice });
    return {
      top: startPx.y,
      bottom: endPx.y,
      left: Math.min(startPx.x, endPx.x),
      right: Math.max(startPx.x, endPx.x),
      startIndex,
      endIndex,
      lowPrice,
      highPrice,
    };
  }

  draw(ctx, transform) {
    if (!ctx || !transform || !this.isValid()) {
      return;
    }
    const style = this.style || DEFAULT_STYLE;
    const bounds = this._getBounds(transform);
    if (!bounds) {
      return;
    }
    ctx.save();
    const rangePrice = bounds.highPrice - bounds.lowPrice;

    for (let i = 0; i < this.levels.length - 1; i += 1) {
      const current = this.levels[i];
      const next = this.levels[i + 1];
      const currentPrice = bounds.lowPrice + rangePrice * current.value;
      const nextPrice = bounds.lowPrice + rangePrice * next.value;
      const currentY = transform.priceToY(currentPrice);
      const nextY = transform.priceToY(nextPrice);
      const top = Math.min(currentY, nextY);
      const height = Math.max(Math.abs(currentY - nextY), 1);
      ctx.fillStyle = next.fill || "rgba(255,255,255,0.04)";
      ctx.globalAlpha = clamp(style.opacity ?? 0.65, 0.1, 1);
      ctx.fillRect(bounds.left, top, bounds.right - bounds.left, height);
    }

    ctx.globalAlpha = this.selected
      ? Math.min(1, (style.opacity ?? 0.65) + 0.2)
      : style.opacity ?? 0.65;
    ctx.strokeStyle = style.strokeColor || "#FFFFFF";
    ctx.lineWidth = this.selected ? Math.min((style.lineWidth || 1.5) + 0.5, 4) : style.lineWidth || 1.5;
    applyLineStyle(ctx, style);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "12px 'Inter', sans-serif";

    for (let i = 0; i < this.levels.length; i += 1) {
      const level = this.levels[i];
      const levelPrice = bounds.lowPrice + rangePrice * level.value;
      const y = transform.priceToY(levelPrice);
      ctx.beginPath();
      ctx.moveTo(bounds.left, y);
      ctx.lineTo(bounds.right, y);
      ctx.stroke();
      if (this.showLabels || this.showPrices) {
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const parts = [];
        if (this.showLabels) {
          parts.push(level.label || level.value);
        }
        if (this.showPrices) {
          parts.push(formatPrice(levelPrice));
        }
        const label = parts.join(" ");
        if (label) {
          ctx.fillText(label, bounds.right + 6, y);
        }
        ctx.restore();
      }
    }
    ctx.setLineDash([]);

    if (this.showDiagonal && this.anchor && this.range) {
      const start = transform.worldToPixels(this.anchor);
      const end = transform.worldToPixels(this.range);
      ctx.save();
      ctx.globalAlpha = (style.opacity ?? 0.65) * 0.6;
      ctx.strokeStyle = style.strokeColor || "#FFFFFF";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }

    if (this.selected) {
      ctx.globalAlpha = 1;
      const handles = [this.anchor, this.range].map((point) =>
        transform.worldToPixels(point)
      );
      ctx.fillStyle = HANDLE_COLORS.fill;
      ctx.strokeStyle = HANDLE_COLORS.stroke;
      handles.forEach((handle) => {
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, HANDLE_RADIUS + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  hitTest(x, y, transform) {
    if (!transform || !this.isValid()) {
      return null;
    }
    const handles = [this.anchor, this.range].map((point) => {
      const pixel = transform.worldToPixels(point);
      return { world: point, pixel };
    });
    for (let i = 0; i < handles.length; i += 1) {
      const handle = handles[i];
      const distance = distanceBetweenPoints(x, y, handle.pixel.x, handle.pixel.y);
      if (distance <= HIT_TOLERANCE + 2) {
        return { action: "handle", handleIndex: i };
      }
    }

    const bounds = this._getBounds(transform);
    if (!bounds) {
      return null;
    }
    if (
      x >= bounds.left - HIT_TOLERANCE &&
      x <= bounds.right + HIT_TOLERANCE &&
      y >= bounds.top - HIT_TOLERANCE &&
      y <= bounds.bottom + HIT_TOLERANCE
    ) {
      return { action: "move" };
    }

    for (let i = 0; i < this.levels.length; i += 1) {
      const level = this.levels[i];
      const levelPrice = bounds.lowPrice + (bounds.highPrice - bounds.lowPrice) * level.value;
      const lineY = transform.priceToY(levelPrice);
      const distance = Math.abs(lineY - y);
      if (distance <= HIT_TOLERANCE) {
        return { action: "move" };
      }
    }

    return null;
  }

  serialize() {
    return {
      ...super.serialize(),
      anchor: clonePoint(this.anchor),
      range: clonePoint(this.range),
      levels: this.levels.map((level) => ({
        value: level.value,
        label: level.label,
        fill: level.fill,
      })),
      showLabels: this.showLabels,
      showPrices: this.showPrices,
      showDiagonal: this.showDiagonal,
    };
  }

  getBoundingBoxInWorld() {
    if (!this.anchor || !this.range) {
      return null;
    }
    return {
      minIndex: Math.min(this.anchor.index, this.range.index),
      maxIndex: Math.max(this.anchor.index, this.range.index),
      minPrice: Math.min(this.anchor.price, this.range.price),
      maxPrice: Math.max(this.anchor.price, this.range.price),
    };
  }

  getToolbarReference(transform) {
    if (!transform || !this.anchor || !this.range) {
      return null;
    }
    const mid = {
      index: (this.anchor.index + this.range.index) / 2,
      price: (this.anchor.price + this.range.price) / 2,
    };
    return transform.worldToPixels(mid);
  }

  updateSettings(patch = {}) {
    if (typeof patch.showLabels === "boolean") {
      this.showLabels = patch.showLabels;
    }
    if (typeof patch.showPrices === "boolean") {
      this.showPrices = patch.showPrices;
    }
    if (typeof patch.showDiagonal === "boolean") {
      this.showDiagonal = patch.showDiagonal;
    }
  }
}
