const MINUTE_IN_MS = 60 * 1000;

export function generateRandomSeries({
  count = 400,
  startPrice = 100,
  volatility = 0.6,
  startTime = Date.now(),
  intervalMinutes = 1,
} = {}) {
  const candles = [];
  let lastClose = startPrice;
  const step = Math.max(1, Math.floor(intervalMinutes)) * MINUTE_IN_MS;

  for (let i = count - 1; i >= 0; i -= 1) {
    const timestamp = startTime - i * step;
    const drift = (Math.random() - 0.5) * volatility;
    const open = lastClose;
    const close = Math.max(1, open + drift);
    const high = Math.max(open, close) + Math.random() * volatility * 1.2;
    const low = Math.max(0.5, Math.min(open, close) - Math.random() * volatility * 1.2);
    const volume = 500 + Math.random() * 200;

    candles.push({ time: timestamp, open, high, low, close, volume });
    lastClose = close;
  }

  return candles;
}
