import { ensureArraySize, applyEMA, applyNumericEMA } from "./utils.js";

export function createMACDIndicator({
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
  panelKey = "macd",
} = {}) {
  return {
    name: "macd",
    label: "MACD",
    category: "panel",
    panelKey,
    kind: "macd",
    dependsOn: [],
    createState(length = 0) {
      return {
        name: "macd",
        label: "MACD",
        type: "panel",
        panelKey,
        kind: "macd",
        colors: {
          macd: "rgba(143,123,255,0.95)",
          signal: "rgba(0,255,128,0.9)",
          histogramPositive: "rgba(0,255,128,0.35)",
          histogramNegative: "rgba(192,132,252,0.35)",
        },
        fastPeriod,
        slowPeriod,
        signalPeriod,
        fast: Array.from({ length }, () => null),
        slow: Array.from({ length }, () => null),
        macd: Array.from({ length }, () => null),
        signal: Array.from({ length }, () => null),
        histogram: Array.from({ length }, () => null),
        lastIndex: -1,
      };
    },
    compute({ series, state, startIndex = 0 }) {
      const begin = Math.max(0, Math.min(startIndex, series.length));
      const fastState = { values: state.fast || [], lastIndex: state.lastIndex };
      const slowState = { values: state.slow || [], lastIndex: state.lastIndex };
      applyEMA(series, fastState, begin, state.fastPeriod, (candle) => candle?.close);
      applyEMA(series, slowState, begin, state.slowPeriod, (candle) => candle?.close);
      state.fast = fastState.values;
      state.slow = slowState.values;
      ensureArraySize(state.macd, series.length, null);
      ensureArraySize(state.signal, series.length, null);
      ensureArraySize(state.histogram, series.length, null);
      for (let i = begin; i < series.length; i += 1) {
        const fastValue = state.fast[i];
        const slowValue = state.slow[i];
        if (!Number.isFinite(fastValue) || !Number.isFinite(slowValue)) {
          state.macd[i] = null;
          continue;
        }
        state.macd[i] = fastValue - slowValue;
      }
      const signalState = { values: state.signal || [], lastIndex: state.lastIndex };
      applyNumericEMA(state.macd, signalState, begin, state.signalPeriod);
      state.signal = signalState.values;
      for (let i = begin; i < series.length; i += 1) {
        const macdValue = state.macd[i];
        const signalValue = state.signal[i];
        if (!Number.isFinite(macdValue) || !Number.isFinite(signalValue)) {
          state.histogram[i] = null;
          continue;
        }
        state.histogram[i] = macdValue - signalValue;
      }
      state.lastIndex = series.length - 1;
      return state;
    },
  };
}
