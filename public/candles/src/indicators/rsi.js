import { ensureArraySize, ensurePanelRange } from "./utils.js";

function computeInitialAverages(series, endIndex, period) {
  const start = endIndex - period + 1;
  if (start < 1) {
    return { avgGain: null, avgLoss: null };
  }
  let gainSum = 0;
  let lossSum = 0;
  for (let i = start; i <= endIndex; i += 1) {
    const current = series[i]?.close;
    const previous = series[i - 1]?.close;
    if (!Number.isFinite(current) || !Number.isFinite(previous)) {
      return { avgGain: null, avgLoss: null };
    }
    const change = current - previous;
    if (change >= 0) {
      gainSum += change;
    } else {
      lossSum += -change;
    }
  }
  return {
    avgGain: gainSum / period,
    avgLoss: lossSum / period,
  };
}

function computeRSIValue(avgGain, avgLoss) {
  if (!Number.isFinite(avgGain) || !Number.isFinite(avgLoss)) {
    return null;
  }
  if (avgLoss === 0) {
    return 100;
  }
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function createRSIIndicator({ period = 14, panelKey = "rsi" } = {}) {
  return {
    name: `rsi${period}`,
    label: `RSI ${period}`,
    category: "panel",
    panelKey,
    kind: "oscillator",
    dependsOn: [],
    createState(length = 0) {
      const base = {
        name: `rsi${period}`,
        label: `RSI ${period}`,
        type: "panel",
        panelKey,
        kind: "oscillator",
        color: "rgba(143,123,255,0.95)",
        lineWidth: 2,
        fill: "rgba(143,123,255,0.08)",
        values: Array.from({ length }, () => null),
        avgGain: Array.from({ length }, () => null),
        avgLoss: Array.from({ length }, () => null),
        lastIndex: -1,
        period,
        levels: { overbought: 70, oversold: 30 },
      };
      ensurePanelRange(base);
      return base;
    },
    compute({ series, state, startIndex = 0 }) {
      const { period } = state;
      ensureArraySize(state.values, series.length, null);
      ensureArraySize(state.avgGain, series.length, null);
      ensureArraySize(state.avgLoss, series.length, null);
      ensurePanelRange(state);
      if (series.length === 0) {
        state.lastIndex = -1;
        return state;
      }
      const begin = Math.max(1, Math.min(startIndex, series.length - 1));
      for (let i = begin; i < series.length; i += 1) {
        if (i < period) {
          state.values[i] = null;
          state.avgGain[i] = null;
          state.avgLoss[i] = null;
          continue;
        }
        const current = series[i]?.close;
        const previous = series[i - 1]?.close;
        if (!Number.isFinite(current) || !Number.isFinite(previous)) {
          state.values[i] = null;
          state.avgGain[i] = null;
          state.avgLoss[i] = null;
          continue;
        }
        let avgGain = state.avgGain[i - 1];
        let avgLoss = state.avgLoss[i - 1];
        const change = current - previous;
        const gain = Math.max(change, 0);
        const loss = Math.max(-change, 0);
        if (!Number.isFinite(avgGain) || !Number.isFinite(avgLoss)) {
          const seed = computeInitialAverages(series, i, period);
          avgGain = seed.avgGain;
          avgLoss = seed.avgLoss;
        } else {
          avgGain = ((avgGain * (period - 1)) + gain) / period;
          avgLoss = ((avgLoss * (period - 1)) + loss) / period;
        }
        state.avgGain[i] = avgGain;
        state.avgLoss[i] = avgLoss;
        state.values[i] = computeRSIValue(avgGain, avgLoss);
      }
      state.lastIndex = series.length - 1;
      return state;
    },
  };
}
