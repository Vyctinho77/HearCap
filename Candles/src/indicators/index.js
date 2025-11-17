import { createEMAIndicators } from "./ema.js";
import { createBollingerIndicator } from "./bollinger.js";
import { createRSIIndicator } from "./rsi.js";
import { createMACDIndicator } from "./macd.js";

const DEFAULT_INDICATORS = [
  ...createEMAIndicators([9, 21, 50, 200]),
  createBollingerIndicator({ period: 20, stdDev: 2 }),
  createRSIIndicator({ period: 14, panelKey: "rsi" }),
  createMACDIndicator({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, panelKey: "macd" }),
];

export function buildIndicatorRegistry() {
  return DEFAULT_INDICATORS.map((indicator) => ({ ...indicator }));
}

export const PANEL_INDICATOR_KEYS = ["rsi", "macd"];
