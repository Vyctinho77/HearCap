const isNumber = (value) => Number.isFinite(value);

export function ensureArraySize(target = [], length, fillValue = null) {
  if (!Array.isArray(target)) {
    target = [];
  }
  if (target.length < length) {
    const prevLength = target.length;
    target.length = length;
    for (let i = prevLength; i < length; i += 1) {
      target[i] = fillValue;
    }
  }
  return target;
}

export function computeSMA(series, endIndex, period) {
  if (!Array.isArray(series) || period <= 0) {
    return null;
  }
  const start = endIndex - period + 1;
  if (start < 0) {
    return null;
  }
  let sum = 0;
  for (let i = start; i <= endIndex; i += 1) {
    const candle = series[i];
    if (!candle || !isNumber(candle.close)) {
      return null;
    }
    sum += candle.close;
  }
  return sum / period;
}

export function computeStandardDeviation(series, endIndex, period, mean) {
  if (!Array.isArray(series) || period <= 0) {
    return null;
  }
  const start = endIndex - period + 1;
  if (start < 0) {
    return null;
  }
  let sum = 0;
  for (let i = start; i <= endIndex; i += 1) {
    const candle = series[i];
    const close = candle?.close;
    if (!isNumber(close)) {
      return null;
    }
    const diff = close - mean;
    sum += diff * diff;
  }
  return Math.sqrt(sum / period);
}

export function applyEMA(series, state, startIndex, period, accessor = (candle) => candle?.close) {
  const multiplier = 2 / (period + 1);
  const values = ensureArraySize(state.values, series.length, null);
  let begin = Math.max(0, startIndex);
  begin = Math.min(begin, series.length);
  if (begin > 0 && !Number.isFinite(values[begin - 1])) {
    for (let i = begin - 1; i >= 0; i -= 1) {
      if (Number.isFinite(values[i])) {
        begin = i + 1;
        break;
      }
      if (i === 0) {
        begin = 0;
      }
    }
  }
  let ema = begin > 0 ? values[begin - 1] : null;
  for (let i = begin; i < series.length; i += 1) {
    const price = accessor(series[i], i);
    if (!Number.isFinite(price)) {
      values[i] = ema;
      continue;
    }
    if (ema === null) {
      if (i >= period - 1) {
        const sma = computeSMA(series, i, period);
        if (!Number.isFinite(sma)) {
          values[i] = null;
          continue;
        }
        ema = sma;
      } else {
        values[i] = null;
        continue;
      }
    }
    ema = (price - ema) * multiplier + ema;
    values[i] = ema;
  }
  state.values = values;
  state.lastIndex = series.length - 1;
  return state;
}

function computeNumericSMA(values, endIndex, period) {
  const start = endIndex - period + 1;
  if (start < 0) {
    return null;
  }
  let sum = 0;
  for (let i = start; i <= endIndex; i += 1) {
    const value = values[i];
    if (!Number.isFinite(value)) {
      return null;
    }
    sum += value;
  }
  return sum / period;
}

export function applyNumericEMA(sourceValues, state, startIndex, period) {
  const multiplier = 2 / (period + 1);
  const values = ensureArraySize(state.values, sourceValues.length, null);
  let begin = Math.max(0, Math.min(startIndex, sourceValues.length));
  if (begin > 0 && !Number.isFinite(values[begin - 1])) {
    for (let i = begin - 1; i >= 0; i -= 1) {
      if (Number.isFinite(values[i])) {
        begin = i + 1;
        break;
      }
      if (i === 0) {
        begin = 0;
      }
    }
  }
  let ema = begin > 0 ? values[begin - 1] : null;
  for (let i = begin; i < sourceValues.length; i += 1) {
    const current = sourceValues[i];
    if (!Number.isFinite(current)) {
      values[i] = ema;
      continue;
    }
    if (ema === null) {
      if (i >= period - 1) {
        const sma = computeNumericSMA(sourceValues, i, period);
        if (!Number.isFinite(sma)) {
          values[i] = null;
          continue;
        }
        ema = sma;
      } else {
        values[i] = null;
        continue;
      }
    }
    ema = (current - ema) * multiplier + ema;
    values[i] = ema;
  }
  state.values = values;
  state.lastIndex = sourceValues.length - 1;
  return state;
}

export function ensurePanelRange(state, min = 0, max = 100) {
  state.range = {
    min,
    max,
  };
  return state;
}

export function cloneValues(source, start = 0) {
  if (!Array.isArray(source)) {
    return [];
  }
  return source.slice(start);
}
