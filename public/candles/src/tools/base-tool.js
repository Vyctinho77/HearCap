import {
  cloneStyle,
  normalizeStyle,
  serializeStyle,
} from "../drawing-styles.js";

export const HIT_TOLERANCE = 8;
export const HANDLE_RADIUS = 5;
export const HANDLE_COLORS = {
  fill: "rgba(13,11,22,0.95)",
  stroke: "rgba(255,255,255,0.85)",
};

function generateRandomId(type = "tool") {
  return `${type}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
}

export function applyLineStyle(ctx, style) {
  if (!ctx || !style) {
    return;
  }
  if (style.lineStyle === "dashed") {
    ctx.setLineDash([10, 6]);
  } else if (style.lineStyle === "dotted") {
    ctx.setLineDash([3, 5]);
  } else {
    ctx.setLineDash([]);
  }
}

export function distanceBetweenPoints(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distancePointToSegment(px, py, ax, ay, bx, by) {
  const lengthSq = (bx - ax) ** 2 + (by - ay) ** 2;
  if (lengthSq === 0) {
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  }
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * (bx - ax);
  const projY = ay + t * (by - ay);
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export class BaseDrawingTool {
  constructor(type, options = {}) {
    this.type = type;
    this.id = options.id || generateRandomId(type);
    this.style = normalizeStyle(options.style || {});
    this.selected = false;
  }

  setSelected(selected) {
    this.selected = !!selected;
  }

  setStyle(style = {}) {
    this.style = normalizeStyle({ ...this.style, ...style });
  }

  updateStyle(partial = {}) {
    this.style = normalizeStyle({ ...this.style, ...partial });
  }

  getStyle() {
    return cloneStyle(this.style);
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      style: serializeStyle(this.style),
    };
  }
}
