import { applyEMA } from "./utils.js";

const SHORT_COLOR = "rgba(143,123,255,0.85)";
const LONG_COLOR = "rgba(102,74,182,0.85)";

export function createEMAIndicator(period) {
  const isShort = period <= 21;
  const color = isShort ? SHORT_COLOR : LONG_COLOR;
  return {
    name: `ema${period}`,
    label: `EMA ${period}`,
    category: "overlay",
    kind: "line",
    period,
    dependsOn: [],
    createState(length = 0) {
      return {
        name: `ema${period}`,
        label: `EMA ${period}`,
        type: "overlay",
        kind: "line",
        color,
        width: 2,
        opacity: 0.85,
        values: Array.from({ length }, () => null),
        lastIndex: -1,
        period,
      };
    },
    compute({ series, state, startIndex = 0 }) {
      applyEMA(series, state, startIndex, period, (candle) => candle?.close);
      return state;
    },
  };
}

export function createEMAIndicators(periods = [9, 21, 50, 200]) {
  const unique = Array.from(new Set(periods.filter((value) => Number.isFinite(value) && value > 0)));
  unique.sort((a, b) => a - b);
  return unique.map((period) => createEMAIndicator(period));
}
