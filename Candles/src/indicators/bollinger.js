import { ensureArraySize, computeSMA, computeStandardDeviation } from "./utils.js";

export function createBollingerIndicator({ period = 20, stdDev = 2 } = {}) {
  return {
    name: `bollinger${period}`,
    label: `Bollinger (${period}, ${stdDev})`,
    category: "overlay",
    kind: "band",
    period,
    stdDev,
    dependsOn: [],
    createState(length = 0) {
      return {
        name: `bollinger${period}`,
        label: `Bollinger (${period}, ${stdDev})`,
        type: "overlay",
        kind: "band",
        color: "rgba(143,123,255,0.5)",
        fill: "rgba(143,123,255,0.12)",
        lineWidth: 1.5,
        opacity: 0.85,
        period,
        stdDev,
        middle: Array.from({ length }, () => null),
        upper: Array.from({ length }, () => null),
        lower: Array.from({ length }, () => null),
        lastIndex: -1,
      };
    },
    compute({ series, state, startIndex = 0 }) {
      const targetStart = Math.max(0, Math.min(startIndex, series.length));
      ensureArraySize(state.middle, series.length, null);
      ensureArraySize(state.upper, series.length, null);
      ensureArraySize(state.lower, series.length, null);
      const begin = Math.max(0, Math.min(targetStart, series.length));
      for (let i = begin; i < series.length; i += 1) {
        if (i < period - 1) {
          state.middle[i] = null;
          state.upper[i] = null;
          state.lower[i] = null;
          continue;
        }
        const mean = computeSMA(series, i, period);
        if (!Number.isFinite(mean)) {
          state.middle[i] = null;
          state.upper[i] = null;
          state.lower[i] = null;
          continue;
        }
        const deviation = computeStandardDeviation(series, i, period, mean);
        if (!Number.isFinite(deviation)) {
          state.middle[i] = null;
          state.upper[i] = null;
          state.lower[i] = null;
          continue;
        }
        state.middle[i] = mean;
        state.upper[i] = mean + deviation * stdDev;
        state.lower[i] = mean - deviation * stdDev;
      }
      state.lastIndex = series.length - 1;
      return state;
    },
  };
}
