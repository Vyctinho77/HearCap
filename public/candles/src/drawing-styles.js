const COLOR_PALETTE = ["#FFFFFF", "#F0F0F0", "#E0E0E0", "#CCCCCC", "#B8B8B8"];
const STYLE_DEFAULTS = {
  strokeColor: COLOR_PALETTE[0],
  fillColor: "rgba(255,255,255,0.08)",
  opacity: 1,
  lineWidth: 2,
  lineStyle: "solid",
};
const LINE_STYLES = new Set(["solid", "dashed", "dotted"]);
let paletteCursor = 0;

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function getNextToolColor() {
  const color = COLOR_PALETTE[paletteCursor % COLOR_PALETTE.length];
  paletteCursor = (paletteCursor + 1) % COLOR_PALETTE.length;
  return color;
}

export function normalizeStyle(style = {}) {
  const next = { ...STYLE_DEFAULTS };
  const source = typeof style === "object" && style ? style : {};
  if (typeof source.strokeColor === "string" && source.strokeColor.trim()) {
    next.strokeColor = source.strokeColor.trim();
  }
  if (typeof source.fillColor === "string" && source.fillColor.trim()) {
    next.fillColor = source.fillColor.trim();
  }
  if (Number.isFinite(source.opacity)) {
    next.opacity = clamp(source.opacity, 0.05, 1);
  }
  if (Number.isFinite(source.lineWidth)) {
    next.lineWidth = clamp(source.lineWidth, 0.5, 6);
  }
  if (typeof source.lineStyle === "string" && LINE_STYLES.has(source.lineStyle)) {
    next.lineStyle = source.lineStyle;
  }
  return next;
}

export function cloneStyle(style = {}) {
  const normalized = normalizeStyle(style);
  return { ...normalized };
}

export function serializeStyle(style = {}) {
  return cloneStyle(style);
}

export function deserializeStyle(payload = {}) {
  return cloneStyle(payload);
}
