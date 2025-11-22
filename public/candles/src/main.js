import { DataProvider } from "./data-provider.js";
import { MusicMarketSimulator } from "./music-market-simulator.js";
import { createDrawingManager } from "./drawing-tools.js";
import { initDrawingToolbar } from "./ui/drawing-toolbar.js";
import { initializeHotkeys } from "./ui/hotkeys.js";

const canvas = document.getElementById("chart");
const overlayCanvas = document.getElementById("chart-overlay");
const drawingCanvas = document.getElementById("drawing-layer");
const priceScaleCanvas = document.getElementById("price-scale");
const tooltip = document.getElementById("tooltip");
const followButton = document.getElementById("follow-button");
const toggleIndicatorsButton = document.getElementById("toggle-indicators");
const cinemaModeButton = document.getElementById("toggle-cinema-mode");
const drawingToolbar = document.querySelector(".chart-toolbar");
const modeButtons = Array.from(document.querySelectorAll("[data-chart-mode]"));
const timeframeButtons = Array.from(document.querySelectorAll("[data-timeframe]"));
const complexityButtons = Array.from(document.querySelectorAll("[data-visual-mode]"));
const timeframeGroup = document.querySelector(".chart-timeframes");
const visualModeGroup = document.querySelector(".chart-visual-mode");
const chartModesGroup = document.querySelector(".chart-modes");
const ctx = canvas.getContext("2d");
const overlayCtx = overlayCanvas ? overlayCanvas.getContext("2d") : null;
const drawingCtx = drawingCanvas ? drawingCanvas.getContext("2d") : null;
const priceScaleCtx = priceScaleCanvas ? priceScaleCanvas.getContext("2d") : null;
const container = canvas.parentElement;
const priceScaleContainer = priceScaleCanvas ? priceScaleCanvas.parentElement : null;
const interactionCanvas = drawingCanvas || overlayCanvas || canvas;

let dpr = window.devicePixelRatio || 1;
const isBullishCandle = (candle) => candle.close >= candle.open;
const isBearishCandle = (candle) => !isBullishCandle(candle);
const supportsPointerEvents = "PointerEvent" in window;
const MINUTE_IN_MS = 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const YEAR_IN_MS = 365 * DAY_IN_MS;
const FOLLOW_TIMEFRAMES = new Set(["1m", "5m", "15m"]);
const VIEWPORT_END_PADDING_RATIO = 0.15;
const MIN_VIEWPORT_END_PADDING = 6;

const simulatorConfigs = [
  {
    artistId: "hearcap-aurora",
    symbol: "HRCP-AUR",
    basePrice: 148,
    volatility: 0.52,
    trendBias: 0.12,
    liquidity: 0.68,
    eventImpact: 0.75,
    mode: "volatile",
    seed: 42017,
    initialPeriods: 960,
  },
];

const activeSimulatorConfig = simulatorConfigs[0];

const dataProvider = new DataProvider({
  symbol: activeSimulatorConfig.symbol,
});

const musicSimulator = new MusicMarketSimulator(activeSimulatorConfig, dataProvider, {
  seed: activeSimulatorConfig.seed,
  initialPeriods: activeSimulatorConfig.initialPeriods,
});

let candles = dataProvider.getActiveSeries();
let eventMarkers = dataProvider.getEvents();
const initialTimeframe = dataProvider.getCurrentTimeframe();
const initialTimeframeKey =
  typeof initialTimeframe === "string" ? initialTimeframe.trim().toLowerCase() : "";

const canvasSize = { width: 0, height: 0 };
const priceScaleSize = { width: 0, height: 0 };

const localeState = {
  value: navigator.language || "pt-BR",
};

let drawingManager = null;
let drawingToolbarController = null;
let activeToolbarButton = null;
let selectedDrawingTool = null;
let pendingToolbarUpdate = false;

const formatterCache = new Map();
let themeCache = null;

function detectPriceFormat(minMovement = 1, precisionHint = 2) {
  const clampedMovement = Number.isFinite(minMovement) && minMovement > 0 ? minMovement : 1;
  const fractionDigits = Math.max(
    0,
    Math.min(8, Math.round(Math.log10(1 / clampedMovement)))
  );
  const digits = Number.isFinite(fractionDigits) ? fractionDigits : precisionHint;
  return {
    fractionDigits: digits,
    base: digits > 0 ? 10 ** digits : 1,
    minMovement: clampedMovement,
  };
}

// Portions of the price tick span calculation are adapted from
// TradingView Lightweight Charts (https://github.com/tradingview/lightweight-charts)
// and licensed under the Apache License, Version 2.0.
class PriceTickSpanCalculator {
  constructor(base, integralDividers) {
    this.base = base;
    this.integralDividers = integralDividers;
    if (isBaseDecimal(base)) {
      this.fractionalDividers = [2, 2.5, 2];
    } else {
      this.fractionalDividers = [];
      let rest = base;
      while (rest !== 1) {
        if (rest % 2 === 0) {
          this.fractionalDividers.push(2);
          rest /= 2;
        } else if (rest % 5 === 0) {
          this.fractionalDividers.push(2, 2.5);
          rest /= 5;
        } else {
          throw new Error("Unexpected base for tick span calculation");
        }

        if (this.fractionalDividers.length > 100) {
          throw new Error("Invalid fractional divider sequence");
        }
      }
    }
  }

  tickSpan(high, low, maxTickSpan) {
    const minMovement = this.base === 0 ? 0 : 1 / this.base;
    let resultTickSpan = 10 ** Math.max(0, Math.ceil(Math.log10(high - low)));
    let index = 0;
    let c = this.integralDividers[0];

    while (true) {
      const resultTickSpanLargerMinMovement =
        greaterOrEqual(resultTickSpan, minMovement) &&
        resultTickSpan > minMovement + 1e-14;
      const resultTickSpanLargerMaxTickSpan =
        greaterOrEqual(resultTickSpan, maxTickSpan * c);
      const resultTickSpanLarger1 = greaterOrEqual(resultTickSpan, 1);
      if (!(resultTickSpanLargerMinMovement && resultTickSpanLargerMaxTickSpan && resultTickSpanLarger1)) {
        break;
      }
      resultTickSpan /= c;
      index += 1;
      c = this.integralDividers[index % this.integralDividers.length];
    }

    if (resultTickSpan <= minMovement + 1e-14) {
      resultTickSpan = minMovement;
    }

    resultTickSpan = Math.max(1, resultTickSpan);

    if (this.fractionalDividers.length > 0 && approximatelyEqual(resultTickSpan, 1)) {
      index = 0;
      c = this.fractionalDividers[0];
      while (
        greaterOrEqual(resultTickSpan, maxTickSpan * c) &&
        resultTickSpan > minMovement + 1e-14
      ) {
        resultTickSpan /= c;
        index += 1;
        c = this.fractionalDividers[index % this.fractionalDividers.length];
      }
    }

    return resultTickSpan;
  }
}

function isBaseDecimal(value) {
  if (value < 0) return false;
  if (value > 1e18) return true;
  for (let current = value; current > 1; current /= 10) {
    if (current % 10 !== 0) return false;
  }
  return true;
}

function greaterOrEqual(x1, x2) {
  return x2 - x1 <= 1e-14;
}

function approximatelyEqual(x1, x2) {
  return Math.abs(x1 - x2) < 1e-14;
}

let priceFormat = detectPriceFormat(dataProvider.getMinMovement());
let priceTickCalculators = [];

const layoutConfig = {
  priceScaleWidth: 80,
  timeScaleHeight: 28,
  indicatorPanelSpacing: 16,
  axisPadding: 8,
};

const MAIN_PANEL_RATIO = 0.65;

const indicatorPanelConfig = [
  {
    key: "volume",
    indicator: "volume",
    baseRatio: 0.12,
    isActive: (features) => features.showVolume && state.panelVisibility.volume !== false,
  },
  {
    key: "rsi",
    indicator: "rsi14",
    baseRatio: 0.12,
    isActive: () => state.panelVisibility.rsi !== false,
  },
  {
    key: "macd",
    indicator: "macd",
    baseRatio: 0.11,
    isActive: () => state.panelVisibility.macd !== false,
  },
];

const marginPresets = {
  advanced: {
    top: 12,
    left: 12,
    right: layoutConfig.priceScaleWidth + 8,
    bottom: layoutConfig.timeScaleHeight + 2,
  },
  basic: {
    top: 32,
    left: 60,
    right: layoutConfig.axisPadding + 16,
    bottom: layoutConfig.timeScaleHeight + 20,
  },
};

const visualFeatureSets = {
  advanced: {
    allowCandles: true,
    showVolume: true,
    showGrid: true,
    showSessionSeparators: true,
    showDetailedPriceScale: true,
    showDetailedTimeScale: true,
    showCrosshair: true,
    showTooltip: true,
    showHeader: true,
    detailedHeader: true,
    showEvents: true,
  },
  basic: {
    allowCandles: false,
    showVolume: false,
    showGrid: false,
    showSessionSeparators: false,
    showDetailedPriceScale: false,
    showDetailedTimeScale: false,
    showCrosshair: false,
    showTooltip: false,
    showHeader: true,
    detailedHeader: false,
    showEvents: true,
  },
};

const initialViewport = Math.max(0, candles.length - 150);

const complexityState = {
  value: "advanced",
};

const state = {
  viewportIndex: initialViewport,
  targetViewportIndex: initialViewport,
  scale: 1.08,
  targetScale: 1.08,
  easingFactor: 0.2,
  baseSpacing: 8,
  margins: { ...marginPresets.advanced },
  layout: { ...layoutConfig },
  panelVisibility: { volume: true, rsi: true, macd: true },
  indicatorsVisibility: { overlays: true, panels: true, all: true },
  ui: {
    cinemaMode: false,
    previousPanelVisibility: null,
  },
  isDragging: false,
  activePointerId: null,
  lastPointer: { x: 0, y: 0 },
  pointer: { x: 0, y: 0, inside: false },
  crosshair: { active: false, x: 0, y: 0, candleIndex: -1, lineWidth: 1.05 },
  priceFormat,
  visualMode: complexityState.value,
  hoveredEventId: null,
  timeframe: initialTimeframe,
  followMode: FOLLOW_TIMEFRAMES.has(initialTimeframeKey),
  userDisabledFollow: false,
  density: 1,
  candleWidth: 0.9,
  lineWidth: 1.2,
  fontSize: 12,
  hitboxSize: 18,
  indicatorPanelHeight: 128,
};

state.padding = state.margins;

const densityBaseMetrics = {
  spacing: state.baseSpacing,
  layout: { ...state.layout },
  paddingPresets: {
    advanced: { ...marginPresets.advanced },
    basic: { ...marginPresets.basic },
  },
  candleWidth: state.candleWidth,
  lineWidth: state.lineWidth,
  fontSize: state.fontSize,
  hitboxSize: state.hitboxSize,
  crosshairWidth: state.crosshair.lineWidth,
  indicatorPanelHeight: state.indicatorPanelHeight,
};

function getDensityScale() {
  return Number.isFinite(state?.density) && state.density > 0 ? state.density : 1;
}

function scaleMetric(value) {
  return value * getDensityScale();
}

function getFontPixels(multiplier = 1) {
  const base = state?.fontSize || densityBaseMetrics.fontSize || 12;
  const size = Math.max(9, base * multiplier);
  return Math.round(size);
}

const chartModeOptions = new Set(["candles", "line", "area"]);
const chartModeState = {
  stable: "candles",
  previous: "candles",
  target: "candles",
  startTime: 0,
  duration: 220,
  progress: 1,
  transitioning: false,
};

const modeBlendState = { candles: 1, line: 0, area: 0 };

const statsCache = {
  start: -1,
  end: -1,
  value: null,
};

const timeFormattingCache = {
  start: -1,
  end: -1,
  value: null,
};

const priceTickCache = {
  key: "",
  ticks: [],
};

const layoutCache = {
  width: 0,
  height: 0,
  marginsKey: "",
  layoutKey: "",
  value: null,
};

const frameState = {
  width: 0,
  height: 0,
  metadata: null,
  areas: null,
  stats: null,
  timeFormatting: null,
  theme: null,
  modeBlend: modeBlendState,
  features: getActiveFeatures(),
  events: eventMarkers,
  indicators: [],
  transform: null,
};

const seriesPointCache = {
  capacity: 0,
  xs: new Float32Array(0),
  ys: new Float32Array(0),
  count: 0,
};

const areaGradientCache = {
  height: 0,
  top: 0,
  colorTop: "",
  colorBottom: "",
  gradient: null,
};

function normalizeTimeframeKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isAutoFollowEligible(timeframe = state.timeframe) {
  return FOLLOW_TIMEFRAMES.has(normalizeTimeframeKey(timeframe));
}

function updateFollowButtonState() {
  if (!followButton) {
    return;
  }
  const eligible = isAutoFollowEligible();
  const shouldShow = eligible && !state.followMode;
  followButton.classList.toggle("follow-button--visible", shouldShow);
  followButton.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  followButton.setAttribute("aria-pressed", state.followMode ? "true" : "false");
  followButton.disabled = !eligible;
}

function disableFollowModeFromUser() {
  if (!state.followMode || !isAutoFollowEligible()) {
    return;
  }
  state.userDisabledFollow = true;
  state.followMode = false;
  updateFollowButtonState();
}

const liveValueKeys = ["open", "high", "low", "close"];

const liveCandleState = {
  index: -1,
  visible: false,
  smoothingRate: 9.5,
  values: { open: 0, high: 0, low: 0, close: 0 },
  target: { open: 0, high: 0, low: 0, close: 0 },
  lastSmoothingTime: 0,
  lastBreathTime: 0,
  breathPhase: 0,
  glowPhase: 0,
  glowIntensity: 0.6,
  closeOffset: 0,
  overlayAnimating: false,
};

const LIVE_OFFSET_AMPLITUDE = 1.6;
const CANVAS_BORDER_RADIUS = 0;

const DensityEngine = (() => {
  let activePreset = complexityState.value || "advanced";
  let lastDensity = getDensityScale();

  function clampDensity(value) {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1;
    }
    return Math.min(2, Math.max(0.35, parsed));
  }

  function readDensityToken() {
    if (typeof window === "undefined" || !window.getComputedStyle) {
      return lastDensity;
    }
    const computed = window.getComputedStyle(document.documentElement);
    if (!computed) {
      return lastDensity;
    }
    const token = computed.getPropertyValue("--density");
    if (!token) {
      return lastDensity;
    }
    return clampDensity(token.trim());
  }

  function applyPadding(density) {
    const preset =
      densityBaseMetrics.paddingPresets[activePreset] ||
      densityBaseMetrics.paddingPresets.advanced;
    if (!preset) {
      return;
    }
    state.margins.top = preset.top * density;
    state.margins.right = preset.right * density;
    state.margins.bottom = preset.bottom * density;
    state.margins.left = preset.left * density;
    state.padding = state.margins;
  }

  function applyLayout(density) {
    const layout = densityBaseMetrics.layout;
    state.layout.axisPadding = layout.axisPadding * density;
    state.layout.timeScaleHeight = layout.timeScaleHeight * density;
    state.layout.indicatorPanelSpacing = layout.indicatorPanelSpacing * density;
  }

  function applyMetrics(density) {
    state.candleWidth = densityBaseMetrics.candleWidth * density;
    state.lineWidth = densityBaseMetrics.lineWidth * density;
    state.fontSize = densityBaseMetrics.fontSize * density;
    state.hitboxSize = densityBaseMetrics.hitboxSize * density;
    state.crosshair.lineWidth = densityBaseMetrics.crosshairWidth * density;
    state.indicatorPanelHeight =
      densityBaseMetrics.indicatorPanelHeight * density;
  }

  function applyUIScale() {
    const scale = getDensityScale();
    const targets = [
      { element: drawingToolbar, origin: "top left" },
      { element: timeframeGroup, origin: "top left" },
      { element: visualModeGroup, origin: "top left" },
      { element: chartModesGroup, origin: "top left" },
      { element: toggleIndicatorsButton, origin: "top right" },
      { element: cinemaModeButton, origin: "top right" },
      { element: followButton, origin: "top right" },
    ];
    targets.forEach(({ element, origin }) => {
      if (!element) return;
      element.style.transformOrigin = origin;
      element.style.transform = `scale(${scale})`;
    });
    if (tooltip) {
      tooltip.style.fontSize = `${getFontPixels()}px`;
    }
  }

  function update(options = {}) {
    const density = clampDensity(
      options.override !== undefined ? options.override : readDensityToken()
    );
    lastDensity = density;
    state.density = density;
    state.baseSpacing = densityBaseMetrics.spacing * density;
    applyPadding(density);
    applyLayout(density);
    applyMetrics(density);
    applyUIScale();
    if (options.skipRender) {
      return density;
    }
    invalidateViewportCaches();
    scheduleRender();
    scheduleOverlayRender();
    scheduleDrawingRender();
    return density;
  }

  return {
    update,
    applyUIScale,
    setPaddingPreset(mode) {
      activePreset = visualFeatureSets[mode] ? mode : "advanced";
      update({ override: lastDensity });
    },
    setDensity(value) {
      const density = clampDensity(value);
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.style.setProperty("--density", `${density}`);
      }
      update({ override: density });
    },
    getDensity() {
      return lastDensity;
    },
  };
})();

const resizeObserver =
  typeof ResizeObserver === "function"
    ? new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== container) continue;
        const { width, height } = entry.contentRect;
        resizeCanvases(width, height);
        invalidateViewportCaches();
        scheduleRender();
        DensityEngine.update();
      }
    })
    : null;

let renderPending = false;
let overlayRenderPending = false;
let drawingRenderPending = false;
let pendingTimeframeAnchor = null;
let pendingTimeframeChange = null;

function scheduleRender() {
  if (renderPending) {
    return;
  }
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    render();
  });
}

function scheduleOverlayRender() {
  if (overlayRenderPending) {
    return;
  }
  overlayRenderPending = true;
  requestAnimationFrame(() => {
    overlayRenderPending = false;
    renderOverlay();
  });
}

function scheduleDrawingRender() {
  if (drawingRenderPending) {
    return;
  }
  drawingRenderPending = true;
  requestAnimationFrame(() => {
    drawingRenderPending = false;
    renderDrawingLayer();
  });
}

function getActiveFeatures(mode = complexityState.value) {
  return visualFeatureSets[mode] || visualFeatureSets.advanced;
}

function getDefaultCursor() {
  return getActiveFeatures().showCrosshair ? "crosshair" : "default";
}

function setPanelVisibility(panelKey, visible = true) {
  if (!panelKey || !state.panelVisibility || !(panelKey in state.panelVisibility)) {
    return false;
  }
  const next = Boolean(visible);
  if (state.panelVisibility[panelKey] === next) {
    return true;
  }
  state.panelVisibility = { ...state.panelVisibility, [panelKey]: next };
  invalidateViewportCaches();
  scheduleRender();
  return true;
}

function togglePanelVisibility(panelKey) {
  if (!panelKey || !state.panelVisibility || !(panelKey in state.panelVisibility)) {
    return false;
  }
  return setPanelVisibility(panelKey, !state.panelVisibility[panelKey]);
}

const INDICATOR_VISIBILITY_STORAGE_PREFIX = "hearcap:indicator-visibility";

function getIndicatorVisibilityStorageKey(
  symbol = dataProvider.getSymbol(),
  timeframe = state.timeframe
) {
  const symbolPart = typeof symbol === "string" && symbol.trim().length > 0 ? symbol.trim() : "default";
  const timeframePart =
    typeof timeframe === "string" && timeframe.trim().length > 0 ? timeframe.trim() : "default";
  return `${INDICATOR_VISIBILITY_STORAGE_PREFIX}:${symbolPart}:${timeframePart}`;
}

function persistIndicatorsVisibility() {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const key = getIndicatorVisibilityStorageKey();
    window.localStorage.setItem(key, JSON.stringify(state.indicatorsVisibility));
  } catch {
    // ignore storage errors
  }
}

function updateIndicatorVisibility(partial = {}, { skipPersist = false, skipRender = false } = {}) {
  const current = state.indicatorsVisibility || { overlays: true, panels: true, all: true };
  const overlays =
    typeof partial.overlays === "boolean" ? partial.overlays : current.overlays;
  const panels =
    typeof partial.panels === "boolean" ? partial.panels : current.panels;
  const all =
    typeof partial.all === "boolean" ? partial.all : overlays && panels;
  const changed =
    overlays !== current.overlays || panels !== current.panels || all !== current.all;
  state.indicatorsVisibility = { overlays, panels, all };
  updateIndicatorToggleLabel();
  if (!skipPersist) {
    persistIndicatorsVisibility();
  }
  if (!skipRender && changed) {
    handleIndicatorsVisibilityChange();
  }
}

function handleIndicatorsVisibilityChange() {
  invalidateViewportCaches();
  scheduleRender();
  scheduleOverlayRender();
  scheduleDrawingRender();
}

function loadIndicatorVisibilityFromStorage({ skipRender = false } = {}) {
  let overlays = true;
  let panels = true;
  let all = true;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const key = getIndicatorVisibilityStorageKey();
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        overlays = typeof parsed.overlays === "boolean" ? parsed.overlays : overlays;
        panels = typeof parsed.panels === "boolean" ? parsed.panels : panels;
        all =
          typeof parsed.all === "boolean"
            ? parsed.all
            : overlays && panels;
      }
    } catch {
      overlays = true;
      panels = true;
      all = true;
    }
  }
  updateIndicatorVisibility(
    { overlays, panels, all },
    { skipPersist: true, skipRender }
  );
}

function syncIndicatorVisibilityContext({ skipRender = false } = {}) {
  loadIndicatorVisibilityFromStorage({ skipRender });
}

function setIndicatorsVisibility(value) {
  const next = Boolean(value);
  updateIndicatorVisibility(
    { overlays: next, panels: next, all: next },
    { skipRender: false }
  );
}

function toggleAllIndicators() {
  const next = !state.indicatorsVisibility.all;
  setIndicatorsVisibility(next);
}

function getIndicatorsVisibility() {
  const vis = state.indicatorsVisibility || { overlays: true, panels: true, all: true };
  return { ...vis };
}

function updateIndicatorToggleLabel() {
  if (!toggleIndicatorsButton) {
    return;
  }
  const allVisible = state.indicatorsVisibility.all !== false;
  toggleIndicatorsButton.textContent = allVisible
    ? "👁 Ocultar Indicadores"
    : "👁 Mostrar Indicadores";
}

function updateCinemaButtonLabel() {
  if (!cinemaModeButton) {
    return;
  }
  cinemaModeButton.textContent = state.ui.cinemaMode
    ? "⛶ Sair do Cinema"
    : "⛶ Cinema Mode";
}

function setupDrawingToolbar() {
  if (!drawingToolbar) {
    return;
  }
  const buttons = Array.from(drawingToolbar.querySelectorAll("button"));
  if (!buttons.length) {
    return;
  }
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const toolType = button.dataset.tool;
      const action = button.dataset.action;
      if (toolType) {
        setActiveDrawingTool(toolType);
        setActiveToolbarButton(button);
        return;
      }
      if (action === "delete") {
        deleteSelectedTool();
      } else if (action === "clear") {
        clearAllDrawingTools();
        setActiveToolbarButton(null);
      } else if (action === "duplicate") {
        duplicateSelectedTool();
      }
    });
  });
}

function setActiveToolbarButton(button) {
  if (activeToolbarButton === button) {
    activeToolbarButton?.classList.add("chart-toolbar__button--active");
    return;
  }
  if (activeToolbarButton) {
    activeToolbarButton.classList.remove("chart-toolbar__button--active");
  }
  activeToolbarButton = button || null;
  if (activeToolbarButton) {
    activeToolbarButton.classList.add("chart-toolbar__button--active");
  }
}

function updateVisualModeButtons(active = complexityState.value) {
  for (let i = 0; i < complexityButtons.length; i += 1) {
    const button = complexityButtons[i];
    const mode = button.dataset.visualMode;
    const isActive = mode === active;
    button.classList.toggle("chart-visual-mode__button--active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function updateTimeframeButtons(active = dataProvider.getCurrentTimeframe()) {
  const activeKey = typeof active === "string" ? active.toLowerCase() : "";
  for (let i = 0; i < timeframeButtons.length; i += 1) {
    const button = timeframeButtons[i];
    const tf = (button.dataset.timeframe || "").toLowerCase();
    const isActive = tf === activeKey;
    button.classList.toggle("chart-timeframe__button--active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function captureViewportAnchorTime() {
  const metadata = frameState.metadata;
  if (metadata && candles.length) {
    const lastVisible = Math.min(metadata.endIndex - 1, candles.length - 1);
    if (lastVisible >= metadata.startIndex) {
      const candle = candles[lastVisible];
      if (candle && Number.isFinite(candle.time)) {
        return candle.time;
      }
    }
  }
  if (candles.length) {
    const fallback = candles[candles.length - 1];
    if (fallback && Number.isFinite(fallback.time)) {
      return fallback.time;
    }
  }
  return null;
}

function handleTimeframeSwitch(timeframe) {
  const target = typeof timeframe === "string" ? timeframe.toLowerCase() : "";
  if (!target) {
    return;
  }

  if (!dataProvider.supportsTimeframe(target)) {
    return;
  }

  if (target === dataProvider.getCurrentTimeframe()) {
    return;
  }

  pendingTimeframeAnchor = captureViewportAnchorTime();
  pendingTimeframeChange = target;
  dataProvider.setTimeframe(target);
  updateTimeframeButtons(target);
}

function applyTimeframeViewportAnchor(timeframe = dataProvider.getCurrentTimeframe()) {
  const width = getDrawableChartWidth();
  const barSpacing = getBarSpacing();
  const visibleCount = Math.max(1, Math.ceil(width / barSpacing) + 3);

  const anchorTime = pendingTimeframeAnchor ?? captureViewportAnchorTime();
  pendingTimeframeAnchor = null;
  const requested = pendingTimeframeChange;
  pendingTimeframeChange = null;

  const activeTimeframe = typeof timeframe === "string" && timeframe ? timeframe : requested;
  if (activeTimeframe) {
    state.timeframe = activeTimeframe;
    updateTimeframeButtons(activeTimeframe);
    syncFollowModeWithTimeframe(activeTimeframe, { resetUserOverride: true });
  }

  if (state.followMode && isAutoFollowEligible(activeTimeframe || state.timeframe)) {
    anchorViewportToLatest(width);
    return;
  }

  let anchorIndex = -1;
  if (Number.isFinite(anchorTime)) {
    anchorIndex = dataProvider.findIndexByTime(anchorTime);
  }

  if (anchorIndex === -1 && candles.length) {
    anchorIndex = candles.length - 1;
  }

  const lookback = Math.max(1, visibleCount - 2);
  let nextIndex = Math.max(0, anchorIndex - lookback);
  const maxStart = getMaxViewportStart(visibleCount);
  if (nextIndex > maxStart) {
    nextIndex = maxStart;
  }

  state.viewportIndex = nextIndex;
  state.targetViewportIndex = nextIndex;
  clampViewportTargets(width);
}

function getDrawableChartWidth() {
  const cached = frameState.areas?.chartWidth;
  if (Number.isFinite(cached) && cached > 0) {
    return cached;
  }
  const fallback =
    (canvasSize.width || canvas.clientWidth || 0) - state.margins.left - state.margins.right;
  return Math.max(1, fallback);
}

function anchorViewportToLatest(chartWidthOverride, barSpacingOverride) {
  if (!candles.length) {
    return;
  }
  const width = Math.max(
    1,
    Number.isFinite(chartWidthOverride) && chartWidthOverride > 0
      ? chartWidthOverride
      : getDrawableChartWidth()
  );
  const spacing = Math.max(
    1e-4,
    Number.isFinite(barSpacingOverride) && barSpacingOverride > 0
      ? barSpacingOverride
      : getBarSpacing()
  );
  const visibleCount = Math.max(1, Math.ceil(width / spacing) + 3);
  const nextIndex = getMaxViewportStart(visibleCount);
  state.viewportIndex = nextIndex;
  state.targetViewportIndex = nextIndex;
  clampViewportTargets(width);
}

function scrollToEnd({ schedule = true } = {}) {
  if (!candles.length) {
    if (schedule) {
      scheduleRender();
    }
    return;
  }
  const width =
    canvasSize.width ||
    canvas.clientWidth ||
    canvas.width ||
    interactionCanvas.clientWidth ||
    0;
  const height =
    canvasSize.height ||
    canvas.clientHeight ||
    canvas.height ||
    interactionCanvas.clientHeight ||
    0;
  const areas = computeLayout(Math.max(1, width), Math.max(1, height || 1));
  anchorViewportToLatest(areas?.chartWidth);
  invalidateViewportCaches();
  if (schedule) {
    scheduleRender();
  }
}

function isAtEnd(tolerance = 1, lengthOverride = candles.length) {
  if (!candles.length) {
    return true;
  }
  const width = getDrawableChartWidth();
  const spacing = getBarSpacing();
  const visibleCount = Math.max(1, Math.ceil(width / spacing) + 3);
  const maxStart = getMaxViewportStart(visibleCount, lengthOverride);
  return Math.abs(state.viewportIndex - maxStart) < tolerance;
}

function updateWithNewCandle(newCandle) {
  if (!newCandle) {
    return;
  }
  const wasAtEnd = isAtEnd();
  dataProvider.appendFromWebSocket(newCandle);
  if (wasAtEnd) {
    scrollToEnd();
  } else {
    scheduleRender();
  }
}

function syncFollowModeWithTimeframe(timeframe = state.timeframe, { resetUserOverride = false } = {}) {
  if (resetUserOverride) {
    state.userDisabledFollow = false;
  }
  const eligible = isAutoFollowEligible(timeframe);
  if (!eligible) {
    state.followMode = false;
  } else if (!state.userDisabledFollow) {
    state.followMode = true;
  }
  updateFollowButtonState();
}

function restoreFollowMode({ anchor = true } = {}) {
  state.userDisabledFollow = false;
  if (!isAutoFollowEligible()) {
    updateFollowButtonState();
    return;
  }
  state.followMode = true;
  if (anchor) {
    anchorViewportToLatest();
  }
  updateFollowButtonState();
  scheduleRender();
}

function maybeAutoFollowAfterData() {
  if (!state.followMode || !isAutoFollowEligible()) {
    return;
  }
  anchorViewportToLatest();
}

function invalidateViewportCaches() {
  statsCache.start = -1;
  statsCache.end = -1;
  statsCache.value = null;
  timeFormattingCache.start = -1;
  timeFormattingCache.end = -1;
  timeFormattingCache.value = null;
  priceTickCache.key = "";
  priceTickCache.ticks = [];
  layoutCache.width = 0;
  layoutCache.height = 0;
  layoutCache.marginsKey = "";
  layoutCache.layoutKey = "";
  layoutCache.value = null;
}

function isChartModeEnabled(mode, features = getActiveFeatures()) {
  if (mode === "candles") {
    return !!features.allowCandles;
  }
  return true;
}

function applyVisualMode(mode) {
  if (!visualFeatureSets[mode]) {
    return;
  }
  if (complexityState.value === mode) {
    return;
  }

  complexityState.value = mode;
  state.visualMode = mode;

  updateVisualModeButtons(mode);

  const features = getActiveFeatures();
  const margins = marginPresets[mode] || marginPresets.advanced;
  if (margins) {
    densityBaseMetrics.paddingPresets[mode] = { ...margins };
  }
  DensityEngine.setPaddingPreset(mode);

  if (!features.allowCandles) {
    if (chartModeState.target === "candles") {
      setChartMode("area");
    }
    if (chartModeState.stable === "candles") {
      chartModeState.stable = "area";
      chartModeState.previous = "area";
      chartModeState.target = "area";
      chartModeState.transitioning = false;
      chartModeState.progress = 1;
    }
  }

  updateModeButtons(chartModeState.target);

  if (!features.showTooltip) {
    hideTooltip();
  }

  if (!features.showCrosshair) {
    state.crosshair.active = false;
    state.crosshair.candleIndex = -1;
  }

  setCursor(getDefaultCursor());
  invalidateViewportCaches();
  scheduleRender();
  scheduleOverlayRender();
}

function clearFormatterNamespace(prefix) {
  for (const key of formatterCache.keys()) {
    if (key.startsWith(prefix)) {
      formatterCache.delete(key);
    }
  }
}

function getCachedFormatter(key, factory) {
  const cached = formatterCache.get(key);
  if (cached && cached.locale === localeState.value) {
    return cached.formatter;
  }

  const formatter = factory(localeState.value);
  formatterCache.set(key, { locale: localeState.value, formatter });
  return formatter;
}

function getPriceFormatter(digits) {
  return getCachedFormatter(`number:price:${digits}`, (locale) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}

function getPercentFormatter() {
  return getCachedFormatter("number:percent", (locale) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function getDateFormatter(key, options) {
  return getCachedFormatter(`time:${key}`, (locale) => new Intl.DateTimeFormat(locale, options));
}

function rebuildPriceScale() {
  priceFormat = detectPriceFormat(dataProvider.getMinMovement(), priceFormat.fractionDigits);
  state.priceFormat = priceFormat;
  priceTickCalculators = [
    new PriceTickSpanCalculator(priceFormat.base, [2, 2.5, 2]),
    new PriceTickSpanCalculator(priceFormat.base, [2, 2, 2.5]),
    new PriceTickSpanCalculator(priceFormat.base, [2.5, 2, 2]),
  ];
  clearFormatterNamespace("number:price");
  priceTickCache.key = "";
  priceTickCache.ticks = [];
}

rebuildPriceScale();

function refreshDevicePixelRatio() {
  const next = window.devicePixelRatio || 1;
  if (Math.abs(next - dpr) > 1e-4) {
    dpr = next;
    return true;
  }
  return false;
}

function resizeCanvases(width, height) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  refreshDevicePixelRatio();
  canvasSize.width = w;
  canvasSize.height = h;
  const pixelWidth = Math.max(1, Math.round(w * dpr));
  const pixelHeight = Math.max(1, Math.round(h * dpr));

  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;

  if (overlayCanvas) {
    overlayCanvas.style.width = `${w}px`;
    overlayCanvas.style.height = `${h}px`;
    overlayCanvas.width = pixelWidth;
    overlayCanvas.height = pixelHeight;
  }
  if (drawingCanvas) {
    drawingCanvas.style.width = `${w}px`;
    drawingCanvas.style.height = `${h}px`;
    drawingCanvas.width = pixelWidth;
    drawingCanvas.height = pixelHeight;
  }

  if (priceScaleCanvas && priceScaleCtx) {
    let scaleWidth, scaleHeight;
    if (priceScaleContainer) {
      scaleWidth = Math.max(1, Math.round(priceScaleContainer.clientWidth));
      scaleHeight = Math.max(1, Math.round(priceScaleContainer.clientHeight));
    } else {
      // No embed-trading mode, price-scale is a layer, use canvas dimensions
      scaleWidth = w;
      scaleHeight = h;
    }
    priceScaleSize.width = scaleWidth;
    priceScaleSize.height = scaleHeight;
    const scaledWidth = Math.max(1, Math.round(scaleWidth * dpr));
    const scaledHeight = Math.max(1, Math.round(scaleHeight * dpr));
    priceScaleCanvas.style.width = `${scaleWidth}px`;
    priceScaleCanvas.style.height = `${scaleHeight}px`;
    priceScaleCanvas.width = scaledWidth;
    priceScaleCanvas.height = scaledHeight;
  }
}

function clearBaseCanvas() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clearOverlayCanvas() {
  if (!overlayCanvas || !overlayCtx) return;
  overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clearPriceScaleCanvas() {
  if (!priceScaleCanvas || !priceScaleCtx) return;
  priceScaleCtx.setTransform(1, 0, 0, 1, 0, 0);
  priceScaleCtx.clearRect(0, 0, priceScaleCanvas.width, priceScaleCanvas.height);
  priceScaleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clearDrawingCanvas() {
  if (!drawingCanvas || !drawingCtx) return;
  drawingCtx.setTransform(1, 0, 0, 1, 0, 0);
  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  drawingCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function applyCanvasClip(context, width, height, radius = CANVAS_BORDER_RADIUS) {
  if (!context || !Number.isFinite(width) || !Number.isFinite(height)) {
    return;
  }
  const maxRadius = Math.min(width, height) / 2;
  const r = Math.max(0, Math.min(radius, maxRadius));
  if (r <= 0) {
    return;
  }
  context.beginPath();
  context.moveTo(r, 0);
  context.lineTo(width - r, 0);
  context.quadraticCurveTo(width, 0, width, r);
  context.lineTo(width, height - r);
  context.quadraticCurveTo(width, height, width - r, height);
  context.lineTo(r, height);
  context.quadraticCurveTo(0, height, 0, height - r);
  context.lineTo(0, r);
  context.quadraticCurveTo(0, 0, r, 0);
  context.closePath();
  context.clip();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setCursor(value) {
  if (canvas) {
    canvas.style.cursor = value;
  }
  if (overlayCanvas) {
    overlayCanvas.style.cursor = value;
  }
}

function getNow() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function easeInOutQuad(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function updateModeButtons(activeMode = chartModeState.target) {
  const features = getActiveFeatures();
  for (let i = 0; i < modeButtons.length; i += 1) {
    const button = modeButtons[i];
    const mode = button.dataset.chartMode;
    const isActive = mode === activeMode;
    const enabled = isChartModeEnabled(mode, features);
    button.classList.toggle("chart-mode__button--active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.classList.toggle("chart-mode__button--disabled", !enabled);
    if (!enabled) {
      button.setAttribute("disabled", "true");
      button.setAttribute("aria-disabled", "true");
    } else {
      button.removeAttribute("disabled");
      button.removeAttribute("aria-disabled");
    }
  }
}

function setChartMode(nextMode) {
  if (!chartModeOptions.has(nextMode)) {
    return;
  }

  if (!isChartModeEnabled(nextMode)) {
    return;
  }

  if (!chartModeState.transitioning && chartModeState.stable === nextMode) {
    chartModeState.target = nextMode;
    updateModeButtons(nextMode);
    return;
  }

  const now = getNow();

  if (chartModeState.transitioning) {
    const elapsed = Math.max(0, now - chartModeState.startTime);
    const progress = clamp(elapsed / (chartModeState.duration || 1), 0, 1);
    const eased = easeInOutQuad(progress);
    if (eased >= 0.5) {
      chartModeState.stable = chartModeState.target;
    }
  }

  chartModeState.previous = chartModeState.stable;
  chartModeState.target = nextMode;
  chartModeState.startTime = now;
  chartModeState.progress = 0;
  chartModeState.transitioning = chartModeState.previous !== chartModeState.target;

  if (!chartModeState.transitioning) {
    chartModeState.stable = nextMode;
    chartModeState.previous = nextMode;
    chartModeState.progress = 1;
  }

  updateModeButtons(nextMode);
  scheduleRender();
}

function updateChartModeTransition(now) {
  if (!chartModeState.transitioning) {
    chartModeState.progress = 1;
    chartModeState.stable = chartModeState.target;
    chartModeState.previous = chartModeState.target;
    return false;
  }

  const duration = Math.max(16, chartModeState.duration);
  const elapsed = Math.max(0, now - chartModeState.startTime);
  chartModeState.progress = clamp(elapsed / duration, 0, 1);

  if (chartModeState.progress >= 1) {
    chartModeState.transitioning = false;
    chartModeState.stable = chartModeState.target;
    chartModeState.previous = chartModeState.target;
    chartModeState.progress = 1;
    return false;
  }

  return true;
}

function computeModeBlend() {
  modeBlendState.candles = 0;
  modeBlendState.line = 0;
  modeBlendState.area = 0;

  if (chartModeState.transitioning) {
    const eased = easeInOutQuad(clamp(chartModeState.progress, 0, 1));
    const fadeOutMode = chartModeState.previous;
    const fadeInMode = chartModeState.target;
    if (chartModeOptions.has(fadeOutMode)) {
      modeBlendState[fadeOutMode] = 1 - eased;
    }
    if (chartModeOptions.has(fadeInMode)) {
      modeBlendState[fadeInMode] = eased;
    }
  } else {
    const stable = chartModeState.stable;
    if (chartModeOptions.has(stable)) {
      modeBlendState[stable] = 1;
    } else {
      modeBlendState.candles = 1;
    }
  }

  return modeBlendState;
}

function ensureSeriesPointCapacity(count) {
  if (count <= seriesPointCache.capacity) {
    return;
  }

  const nextCapacity = Math.max(count, Math.ceil((seriesPointCache.capacity || 32) * 1.5));
  seriesPointCache.xs = new Float32Array(nextCapacity);
  seriesPointCache.ys = new Float32Array(nextCapacity);
  seriesPointCache.capacity = nextCapacity;
}

function computeSeriesPoints(metadata, areas, range) {
  const count = Math.max(0, metadata.endIndex - metadata.startIndex);
  ensureSeriesPointCapacity(count);

  const xs = seriesPointCache.xs;
  const ys = seriesPointCache.ys;
  const liveIndex = liveCandleState.index;
  const liveValues = liveCandleState.values;

  for (let i = metadata.startIndex, local = 0; i < metadata.endIndex; i += 1, local += 1) {
    const candle = candles[i];
    const x = metadata.offsetX + (local + 0.5) * metadata.barSpacing;
    xs[local] = x;
    if (!candle) {
      ys[local] = priceToY(range.minPrice, range, areas.price);
      continue;
    }
    const source = i === liveIndex ? liveValues : candle;
    ys[local] = priceToY(source.close, range, areas.price);
  }

  seriesPointCache.count = count;
  return seriesPointCache;
}

function getAreaGradient(areas, theme) {
  const height = areas.price.height;
  const top = areas.price.top;
  const topColor = theme.seriesAreaTop;
  const bottomColor = theme.seriesAreaBottom;

  if (
    !areaGradientCache.gradient ||
    areaGradientCache.height !== height ||
    areaGradientCache.top !== top ||
    areaGradientCache.colorTop !== topColor ||
    areaGradientCache.colorBottom !== bottomColor
  ) {
    const gradient = ctx.createLinearGradient(0, top, 0, top + height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    areaGradientCache.gradient = gradient;
    areaGradientCache.height = height;
    areaGradientCache.top = top;
    areaGradientCache.colorTop = topColor;
    areaGradientCache.colorBottom = bottomColor;
  }

  return areaGradientCache.gradient;
}

function drawAreaSeries(points, areas, theme, alpha) {
  if (!points || points.count <= 0 || alpha <= 0) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(state.margins.left, areas.price.top, areas.chartWidth, areas.price.height);
  ctx.clip();

  ctx.globalAlpha = alpha;
  ctx.fillStyle = getAreaGradient(areas, theme);
  ctx.beginPath();
  ctx.moveTo(points.xs[0], points.ys[0]);
  for (let i = 1; i < points.count; i += 1) {
    ctx.lineTo(points.xs[i], points.ys[i]);
  }
  ctx.lineTo(points.xs[points.count - 1], areas.price.bottom);
  ctx.lineTo(points.xs[0], areas.price.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = Math.min(1, 0.45 + alpha * 0.55);
  ctx.strokeStyle = theme.seriesLine;
  ctx.lineWidth = scaleMetric(2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = theme.seriesLine;
  ctx.shadowBlur = 8 * alpha;
  ctx.beginPath();
  ctx.moveTo(points.xs[0], points.ys[0]);
  for (let i = 1; i < points.count; i += 1) {
    ctx.lineTo(points.xs[i], points.ys[i]);
  }
  ctx.stroke();

  ctx.restore();
}

function drawLineSeries(points, areas, theme, alpha) {
  if (!points || points.count <= 0 || alpha <= 0) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(state.margins.left, areas.price.top, areas.chartWidth, areas.price.height);
  ctx.clip();

  ctx.globalAlpha = Math.min(1, 0.45 + alpha * 0.55);
  ctx.strokeStyle = theme.seriesLine;
  ctx.lineWidth = scaleMetric(2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = theme.seriesLine;
  ctx.shadowBlur = 9 * alpha;
  ctx.beginPath();
  ctx.moveTo(points.xs[0], points.ys[0]);
  for (let i = 1; i < points.count; i += 1) {
    ctx.lineTo(points.xs[i], points.ys[i]);
  }
  ctx.stroke();

  ctx.restore();
}

function initializeLiveCandle(index, candle) {
  liveCandleState.index = index;
  liveCandleState.visible = false;
  for (let i = 0; i < liveValueKeys.length; i += 1) {
    const key = liveValueKeys[i];
    const value = candle[key];
    liveCandleState.values[key] = value;
    liveCandleState.target[key] = value;
  }
  const timestamp = getNow();
  liveCandleState.lastSmoothingTime = timestamp;
  liveCandleState.lastBreathTime = timestamp;
  liveCandleState.breathPhase = 0;
  liveCandleState.glowPhase = 0;
  liveCandleState.glowIntensity = 0.6;
  liveCandleState.closeOffset = 0;
}

function updateLiveCandleSmoothing(metadata) {
  if (!candles.length) {
    liveCandleState.visible = false;
    return false;
  }

  const lastIndex = candles.length - 1;
  const candle = candles[lastIndex];
  if (!candle) {
    liveCandleState.visible = false;
    return false;
  }

  if (liveCandleState.index !== lastIndex) {
    initializeLiveCandle(lastIndex, candle);
  }

  const inView =
    !!metadata &&
    lastIndex >= metadata.startIndex &&
    lastIndex < metadata.endIndex;
  liveCandleState.visible = inView;

  for (let i = 0; i < liveValueKeys.length; i += 1) {
    const key = liveValueKeys[i];
    liveCandleState.target[key] = candle[key];
  }

  const now = getNow();
  if (!liveCandleState.lastSmoothingTime) {
    liveCandleState.lastSmoothingTime = now;
    return false;
  }

  const deltaSeconds = Math.min(
    0.25,
    Math.max(0, (now - liveCandleState.lastSmoothingTime) / 1000)
  );
  liveCandleState.lastSmoothingTime = now;

  if (deltaSeconds <= 0) {
    let needsFrame = false;
    for (let i = 0; i < liveValueKeys.length; i += 1) {
      const key = liveValueKeys[i];
      if (Math.abs(liveCandleState.target[key] - liveCandleState.values[key]) > 1e-5) {
        needsFrame = true;
        break;
      }
    }
    return needsFrame;
  }

  const factor = 1 - Math.exp(-deltaSeconds * liveCandleState.smoothingRate);
  let animating = false;

  for (let i = 0; i < liveValueKeys.length; i += 1) {
    const key = liveValueKeys[i];
    const current = liveCandleState.values[key];
    const target = liveCandleState.target[key];
    const diff = target - current;
    if (Math.abs(diff) <= 1e-8) {
      liveCandleState.values[key] = target;
      continue;
    }
    const next = current + diff * factor;
    if (Math.abs(target - next) <= 1e-5) {
      liveCandleState.values[key] = target;
    } else {
      liveCandleState.values[key] = next;
      animating = true;
    }
  }

  return animating;
}

function stepLiveCandleOverlay(range) {
  if (!liveCandleState.visible) {
    liveCandleState.overlayAnimating = false;
    return false;
  }

  const now = getNow();
  if (!liveCandleState.lastBreathTime) {
    liveCandleState.lastBreathTime = now;
    return false;
  }

  const deltaSeconds = Math.min(
    0.25,
    Math.max(0, (now - liveCandleState.lastBreathTime) / 1000)
  );
  liveCandleState.lastBreathTime = now;

  if (deltaSeconds <= 0) {
    return liveCandleState.overlayAnimating;
  }

  liveCandleState.breathPhase += deltaSeconds * 1.08;
  liveCandleState.glowPhase += deltaSeconds * 1.6;

  if (liveCandleState.breathPhase > Math.PI * 2) {
    liveCandleState.breathPhase -= Math.PI * 2;
  }
  if (liveCandleState.glowPhase > Math.PI * 2) {
    liveCandleState.glowPhase -= Math.PI * 2;
  }

  const breathWave = (Math.sin(liveCandleState.breathPhase) + 1) * 0.5;
  const glowWave = (Math.sin(liveCandleState.glowPhase) + 1) * 0.5;

  const priceSpan = range ? Math.max(1e-6, range.maxPrice - range.minPrice) : 1;
  const momentum = Math.abs(liveCandleState.target.close - liveCandleState.values.close);
  const momentumFactor = Math.min(1, (momentum / priceSpan) * 12);

  liveCandleState.closeOffset = (breathWave - 0.5) * 2 * LIVE_OFFSET_AMPLITUDE;
  liveCandleState.glowIntensity = Math.min(
    1,
    Math.max(0.25, 0.35 + glowWave * 0.35 + momentumFactor * 0.4)
  );
  liveCandleState.overlayAnimating = true;
  return true;
}

function readTheme() {
  const styles = getComputedStyle(document.documentElement);
  const read = (prop, fallback) => (styles.getPropertyValue(prop) || fallback).trim();
  return {
    panel: read("--panel", "#141b25"),
    gridLine: read("--grid-line", "rgba(255,255,255,0.06)"),
    gridStrong: read("--grid-strong", "rgba(255,255,255,0.12)"),
    gridDashed: read("--grid-dashed", "rgba(255,255,255,0.12)"),
    bullish: read("--bullish", "#00ff80"),
    bearish: read("--bearish", "#c084fc"),
    bullishBorder: read("--bullish-border", "rgba(0,255,128,0.7)"),
    bearishBorder: read("--bearish-border", "rgba(192,132,252,0.7)"),
    text: read("--text", "rgba(236,240,255,0.94)"),
    muted: read("--muted", "rgba(236,240,255,0.6)"),
    crosshair: read("--crosshair", "rgba(183,173,246,0.45)"),
    lastPriceLine: read("--last-price-line", "rgba(0,255,128,0.45)"),
    priceGlow: read("--price-glow", "rgba(131,94,226,0.28)"),
    priceScaleBg: read("--price-scale-bg", "rgba(19,14,32,0.95)"),
    priceScaleBorder: read("--price-scale-border", "rgba(192,132,252,0.16)"),
    timeScaleBg: read("--time-scale-bg", "rgba(13,11,22,0.92)"),
    timeScaleBorder: read("--time-scale-border", "rgba(192,132,252,0.12)"),
    volumeBull: read("--volume-bull", "rgba(0,255,128,0.24)"),
    volumeBear: read("--volume-bear", "rgba(192,132,252,0.24)"),
    seriesLine: read("--series-line", "#8f7bff"),
    seriesAreaTop: read("--series-area-top", "rgba(143,123,255,0.25)"),
    seriesAreaBottom: read("--series-area-bottom", "rgba(143,123,255,0.05)"),
    linePoint: read("--line-point", "rgba(192,132,252,0.95)"),
    eventMarkerLine: read("--event-marker-line", "rgba(255,255,255,0.28)"),
    eventMarkerFill: read("--event-marker-fill", "rgba(192,132,252,0.9)"),
    eventMarkerGlow: read("--event-marker-glow", "rgba(192,132,252,0.5)"),
    eventBadgeBg: read("--event-badge-bg", "rgba(16,14,28,0.95)"),
    eventBadgeBorder: read("--event-badge-border", "rgba(192,132,252,0.22)"),
    eventBadgeText: read("--event-badge-text", "rgba(255,255,255,0.94)"),
    eventBadgeMuted: read("--event-badge-muted", "rgba(192,184,255,0.72)"),
  };
}

function getTheme() {
  if (!themeCache) {
    themeCache = readTheme();
  }
  return themeCache;
}

const themeObserver =
  typeof MutationObserver === "function"
    ? new MutationObserver(() => {
      themeCache = null;
      scheduleRender();
    })
    : null;

if (themeObserver) {
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  });
}

const colorSchemeMedia = typeof window.matchMedia === "function"
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;
if (colorSchemeMedia) {
  const listener = () => {
    themeCache = null;
    scheduleRender();
  };
  if (typeof colorSchemeMedia.addEventListener === "function") {
    colorSchemeMedia.addEventListener("change", listener);
  } else if (typeof colorSchemeMedia.addListener === "function") {
    colorSchemeMedia.addListener(listener);
  }
}

function computeLayout(width, height) {
  const features = getActiveFeatures();
  const marginsKey = `${state.margins.top}|${state.margins.right}|${state.margins.bottom}|${state.margins.left}`;
  const layoutKey = `${state.layout.timeScaleHeight}|${state.layout.indicatorPanelSpacing}|${features.showVolume ? 1 : 0}|${state.panelVisibility.volume ? 1 : 0}|${state.panelVisibility.rsi ? 1 : 0}|${state.panelVisibility.macd ? 1 : 0}|${state.indicatorsVisibility.panels ? 1 : 0}`;

  if (
    layoutCache.value &&
    layoutCache.width === width &&
    layoutCache.height === height &&
    layoutCache.marginsKey === marginsKey &&
    layoutCache.layoutKey === layoutKey
  ) {
    return layoutCache.value;
  }

  const priceScaleWidth = features.showDetailedPriceScale !== false ? layoutConfig.priceScaleWidth : 0;
  const chartWidth = width - state.margins.left - state.margins.right;
  const chartHeight = height - state.margins.top - state.margins.bottom;
  const panelSpacing = Math.max(0, state.layout.indicatorPanelSpacing || layoutConfig.indicatorPanelSpacing);
  const panelsEnabled = state.indicatorsVisibility.panels !== false;
  const panelLayout = panelsEnabled
    ? computeLayoutPanels(chartHeight, features, panelSpacing)
    : {
      priceHeight: chartHeight,
      panels: [],
      panelMap: {},
    };
  const priceTop = state.margins.top;
  const priceHeight = panelLayout.priceHeight;
  const panels = panelLayout.panels;
  const panelMap = panelLayout.panelMap;
  const priceBottom = priceTop + priceHeight;
  const volumeArea =
    panelMap.volume ||
    {
      key: "volume",
      top: priceBottom,
      height: 0,
      bottom: priceBottom,
    };

  layoutCache.width = width;
  layoutCache.height = height;
  layoutCache.marginsKey = marginsKey;
  layoutCache.layoutKey = layoutKey;
  layoutCache.value = {
    chartWidth,
    price: {
      top: priceTop,
      height: priceHeight,
      bottom: priceBottom,
    },
    volume: volumeArea,
    panels,
    panelMap,
    timeAxis: {
      top: height - state.layout.timeScaleHeight,
      height: state.layout.timeScaleHeight,
    },
  };

  return layoutCache.value;
}

function computeLayoutPanels(chartHeight, features, spacing) {
  const activePanels = [];
  for (let i = 0; i < indicatorPanelConfig.length; i += 1) {
    const panel = indicatorPanelConfig[i];
    const enabled = typeof panel.isActive === "function" ? panel.isActive(features) : true;
    if (enabled) {
      activePanels.push(panel);
    }
  }
  const gap = Math.max(0, spacing);
  const totalSpacing = gap * activePanels.length;
  const availableHeight = Math.max(chartHeight - totalSpacing, 0);
  let totalRatio = MAIN_PANEL_RATIO;
  for (let i = 0; i < activePanels.length; i += 1) {
    totalRatio += activePanels[i].baseRatio || 0;
  }
  if (totalRatio <= 0) {
    totalRatio = 1;
  }
  const unit = availableHeight / totalRatio;
  let priceHeight = unit * MAIN_PANEL_RATIO;
  const minPanelHeight = Math.max(32, state.indicatorPanelHeight || 0);
  const rawPanelHeights = [];
  for (let i = 0; i < activePanels.length; i += 1) {
    const panel = activePanels[i];
    const baseHeight = unit * (panel.baseRatio || 0);
    rawPanelHeights.push(Math.max(minPanelHeight, baseHeight));
  }
  const panelHeightsSum = rawPanelHeights.reduce((sum, value) => sum + value, 0);
  const compressibleHeight = priceHeight + panelHeightsSum;
  const heightBudget = Math.max(availableHeight, 0);
  const scale =
    compressibleHeight > 0 ? Math.min(1, heightBudget / compressibleHeight) : 1;
  priceHeight *= scale;
  const panelHeights = rawPanelHeights.map((value) => value * scale);

  const layoutPanels = [];
  const panelMap = {};
  let nextTop = state.margins.top + priceHeight;
  for (let i = 0; i < activePanels.length; i += 1) {
    const panel = activePanels[i];
    const panelHeight = panelHeights[i];
    nextTop += gap;
    const area = {
      key: panel.key,
      indicator: panel.indicator,
      top: nextTop,
      height: panelHeight,
      bottom: nextTop + panelHeight,
    };
    layoutPanels.push(area);
    panelMap[panel.key] = area;
    nextTop += panelHeight;
  }
  return {
    priceHeight,
    panels: layoutPanels,
    panelMap,
  };
}

function priceToY(price, range, area) {
  return (
    area.top +
    (1 - (price - range.minPrice) / (range.maxPrice - range.minPrice || 1)) *
    area.height
  );
}

function yToPrice(y, range, area) {
  const clamped = clamp(y, area.top, area.top + area.height);
  const ratio = 1 - (clamped - area.top) / (area.height || 1);
  return range.minPrice + ratio * (range.maxPrice - range.minPrice);
}

function createChartTransform(metadata, areas, stats) {
  if (!metadata || !areas?.price || !stats) {
    return null;
  }
  const viewport = {
    left: state.margins.left,
    right: state.margins.left + areas.chartWidth,
    top: areas.price.top,
    bottom: areas.price.bottom,
    width: areas.chartWidth,
    height: areas.price.height,
  };
  const transform = {
    metadata,
    viewport,
  };
  transform.priceToY = (price) => priceToY(price, stats, areas.price);
  transform.indexToX = (index) =>
    metadata.offsetX + (index - metadata.startIndex) * metadata.barSpacing;
  transform.xToIndex = (x) =>
    metadata.startIndex + (x - metadata.offsetX) / (metadata.barSpacing || 1);
  transform.yToPrice = (y) => yToPrice(y, stats, areas.price);
  transform.pixelsToWorld = (x, y) => ({
    index: transform.xToIndex(x),
    price: transform.yToPrice(y),
  });
  transform.worldToPixels = (point) => ({
    x: transform.indexToX(point.index),
    y: transform.priceToY(point.price),
  });
  return transform;
}

function getBarSpacingForScale(scaleValue) {
  return Math.max(2.5, state.baseSpacing * scaleValue);
}

function getBarSpacing() {
  return getBarSpacingForScale(state.scale);
}

function getTargetBarSpacing() {
  return getBarSpacingForScale(state.targetScale);
}

function computeVisibleCountForScale(scaleValue, width = getDrawableChartWidth()) {
  const spacing = getBarSpacingForScale(scaleValue);
  return Math.max(1, Math.ceil(width / spacing) + 3);
}

function getEndPadding(visibleCount) {
  const safeVisible = Math.max(1, Math.ceil(visibleCount));
  const ratioPadding = Math.floor(safeVisible * VIEWPORT_END_PADDING_RATIO);
  return Math.max(MIN_VIEWPORT_END_PADDING, ratioPadding);
}

function getMaxViewportStart(
  visibleCount,
  lengthOverride = candles.length,
  paddingOverride = null
) {
  const safeVisible = Math.max(1, Math.ceil(visibleCount));
  const total = Math.max(0, Math.floor(Number.isFinite(lengthOverride) ? lengthOverride : candles.length));
  const padding =
    Number.isFinite(paddingOverride) && paddingOverride !== null
      ? Math.max(0, Math.floor(paddingOverride))
      : getEndPadding(safeVisible);
  return Math.max(0, total - safeVisible + padding);
}

function clampViewportTargets(chartWidth) {
  if (!Number.isFinite(chartWidth) || chartWidth <= 0) {
    return;
  }

  const currentSpacing = getBarSpacing();
  const targetSpacing = getTargetBarSpacing();
  const currentVisible = Math.ceil(chartWidth / currentSpacing) + 3;
  const targetVisible = Math.ceil(chartWidth / targetSpacing) + 3;
  const currentMaxStart = getMaxViewportStart(currentVisible);
  const targetMaxStart = getMaxViewportStart(targetVisible);

  state.viewportIndex = clamp(state.viewportIndex, 0, currentMaxStart);
  state.targetViewportIndex = clamp(state.targetViewportIndex, 0, targetMaxStart);
}

function applyViewportEasing(areas) {
  if (!areas) {
    return false;
  }

  clampViewportTargets(areas.chartWidth);

  const easing = state.easingFactor;
  let scaleAnimating = false;
  let indexAnimating = false;
  const followActive = state.followMode && isAutoFollowEligible();

  const scaleDelta = state.targetScale - state.scale;
  if (Math.abs(scaleDelta) > 1e-4) {
    state.scale += scaleDelta * easing;
    if (Math.abs(state.targetScale - state.scale) <= 1e-4) {
      state.scale = state.targetScale;
    } else {
      scaleAnimating = true;
    }
  } else {
    state.scale = state.targetScale;
  }

  if (followActive) {
    const width = Math.max(1, areas.chartWidth || getDrawableChartWidth());
    const currentVisible = computeVisibleCountForScale(state.scale, width);
    const targetVisible = computeVisibleCountForScale(state.targetScale, width);
    state.viewportIndex = getMaxViewportStart(currentVisible);
    state.targetViewportIndex = getMaxViewportStart(targetVisible);
    clampViewportTargets(width);
    return scaleAnimating;
  }

  clampViewportTargets(areas.chartWidth);

  const indexDelta = state.targetViewportIndex - state.viewportIndex;
  if (Math.abs(indexDelta) > 1e-3) {
    state.viewportIndex += indexDelta * easing;
    if (Math.abs(state.targetViewportIndex - state.viewportIndex) <= 1e-3) {
      state.viewportIndex = state.targetViewportIndex;
    } else {
      indexAnimating = true;
    }
  } else {
    state.viewportIndex = state.targetViewportIndex;
  }

  clampViewportTargets(areas.chartWidth);

  return scaleAnimating || indexAnimating;
}

function getVisibleMetadata(width, areas) {
  const barSpacing = getBarSpacing();
  const visibleCount = Math.ceil(areas.chartWidth / barSpacing) + 3;
  const padding = getEndPadding(visibleCount);
  const maxStart = getMaxViewportStart(visibleCount, candles.length, padding);
  state.viewportIndex = clamp(state.viewportIndex, 0, maxStart);

  const startIndex = Math.floor(state.viewportIndex);
  const fractional = state.viewportIndex - startIndex;
  const offsetX = state.margins.left - fractional * barSpacing;
  const endIndex = Math.min(candles.length, startIndex + visibleCount);

  return { startIndex, endIndex, visibleCount, barSpacing, offsetX };
}

function computeSeriesStats(metadata) {
  if (metadata.endIndex <= metadata.startIndex) {
    return { minPrice: 0, maxPrice: 1, maxVolume: 1 };
  }

  if (
    statsCache.start === metadata.startIndex &&
    statsCache.end === metadata.endIndex &&
    statsCache.value
  ) {
    return statsCache.value;
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let maxVolume = 0;

  for (let i = metadata.startIndex; i < metadata.endIndex; i += 1) {
    const item = candles[i];
    if (!item) continue;
    minPrice = Math.min(minPrice, item.low);
    maxPrice = Math.max(maxPrice, item.high);
    maxVolume = Math.max(maxVolume, item.volume || 0);
  }

  const spread = Math.max(maxPrice - minPrice, 0.0001);
  const padding = spread * 0.08;
  const value = {
    minPrice: minPrice - padding,
    maxPrice: maxPrice + padding,
    maxVolume: Math.max(maxVolume, 1),
  };
  statsCache.start = metadata.startIndex;
  statsCache.end = metadata.endIndex;
  statsCache.value = value;
  return value;
}

function buildPriceTicks(range, areas) {
  if (!(range && Number.isFinite(range.minPrice) && Number.isFinite(range.maxPrice))) {
    return [];
  }

  const span = Math.max(range.maxPrice - range.minPrice, 1e-8);
  if (span <= 0) {
    return [];
  }

  const cacheKey = `${range.minPrice.toFixed(6)}:${range.maxPrice.toFixed(6)}:${areas.price.height.toFixed(2)}`;
  if (priceTickCache.key === cacheKey) {
    return priceTickCache.ticks;
  }

  const fontSize = 12;
  const markHeight = Math.ceil(fontSize * 2.5);
  const maxTickSpan = (range.maxPrice - range.minPrice) * (markHeight / areas.price.height);
  const rawSpan = Math.min(
    ...priceTickCalculators.map((calculator) => calculator.tickSpan(range.maxPrice, range.minPrice, maxTickSpan || 1))
  );
  const tickSpan = Number.isFinite(rawSpan) && rawSpan > 0 ? rawSpan : span / 6;

  const minTickIndex = Math.floor(range.minPrice / tickSpan) - 1;
  const maxTickIndex = Math.ceil(range.maxPrice / tickSpan) + 1;
  const ticks = [];

  for (let tickIndex = minTickIndex; tickIndex <= maxTickIndex; tickIndex += 1) {
    const price = tickIndex * tickSpan;
    if (price < range.minPrice - tickSpan || price > range.maxPrice + tickSpan) {
      continue;
    }
    const precisePrice =
      Math.round(price * state.priceFormat.base) / state.priceFormat.base;
    const y = priceToY(precisePrice, range, areas.price);
    if (y < areas.price.top - 12 || y > areas.price.bottom + 12) {
      continue;
    }
    ticks.push({ price: precisePrice, y });
  }

  priceTickCache.key = cacheKey;
  priceTickCache.ticks = ticks;
  return ticks;
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawAxisBox({
  text,
  x,
  y,
  paddingX = 8,
  paddingY = 4,
  radius = 6,
  fill,
  stroke,
  textColor,
  align = "left",
}, context = ctx) {
  context.save();
  const scaledPaddingX = scaleMetric(paddingX);
  const scaledPaddingY = scaleMetric(paddingY);
  const cornerRadius = Math.max(3, scaleMetric(radius));
  const fontSize = getFontPixels();
  context.font = `${fontSize}px 'Inter', sans-serif`;
  const metrics = context.measureText(text);
  const textHeight =
    (metrics.actualBoundingBoxAscent || 8) +
    (metrics.actualBoundingBoxDescent || 4);
  const boxHeight = textHeight + scaledPaddingY * 2;
  const boxWidth = metrics.width + scaledPaddingX * 2;

  let rectX = x;
  if (align === "center") {
    rectX = x - boxWidth / 2;
  } else if (align === "right") {
    rectX = x - boxWidth;
  }

  // Garante que o card não saia para fora da área visível do canvas,
  // especialmente para rótulos de tempo próximos às bordas.
  const canvasWidth = context.canvas ? context.canvas.width / dpr : null;
  if (Number.isFinite(canvasWidth) && canvasWidth > 0) {
    // margem maior para garantir que cards de data como "16 de nov"
    // fiquem bem dentro da área visível
    const margin = Math.max(12, scaleMetric(24));
    const minX = margin;
    const maxX = Math.max(minX, canvasWidth - boxWidth - margin);
    if (rectX < minX) rectX = minX;
    if (rectX > maxX) rectX = maxX;
  }

  const rectY = y;

  drawRoundedRect(context, rectX, rectY, boxWidth, boxHeight, cornerRadius);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.stroke();
  }

  context.fillStyle = textColor;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, rectX + boxWidth / 2, rectY + boxHeight / 2 + 0.5);
  context.restore();

  return { x: rectX, width: boxWidth, height: boxHeight };
}

function drawGrid(width, metadata, areas, theme, priceTicks) {
  ctx.save();
  ctx.lineWidth = scaleMetric(1);

  const desiredPixelStep = Math.max(scaleMetric(140), 60);
  const barsPerColumn = Math.max(1, Math.round(desiredPixelStep / metadata.barSpacing));

  ctx.strokeStyle = theme.gridLine;
  ctx.setLineDash([]);
  const startColumn = metadata.startIndex - barsPerColumn * 2;
  const endColumn = metadata.endIndex + barsPerColumn * 2;

  for (let i = startColumn; i <= endColumn; i += barsPerColumn) {
    const x =
      metadata.offsetX +
      (i - metadata.startIndex) * metadata.barSpacing +
      metadata.barSpacing / 2;
    if (x < state.margins.left || x > width - state.margins.right) continue;
    ctx.beginPath();
    const crispX = Math.round(x) + 0.5;
    ctx.moveTo(crispX, areas.price.top);
    ctx.lineTo(crispX, areas.price.bottom);
    ctx.stroke();
  }

  const horizontalYs = new Set();
  priceTicks.forEach((tick) => {
    const crisp = Math.round(tick.y) + 0.5;
    const isEdge =
      Math.abs(crisp - (Math.round(areas.price.top) + 0.5)) < 0.51 ||
      Math.abs(crisp - (Math.round(areas.price.bottom) + 0.5)) < 0.51;
    if (isEdge || horizontalYs.has(crisp)) return;
    horizontalYs.add(crisp);
  });

  ctx.strokeStyle = theme.gridDashed;
  ctx.setLineDash([4, 6]);
  horizontalYs.forEach((crispY) => {
    if (crispY <= areas.price.top || crispY >= areas.price.bottom) return;
    ctx.beginPath();
    ctx.moveTo(state.margins.left, crispY);
    ctx.lineTo(width - state.margins.right, crispY);
    ctx.stroke();
  });

  ctx.setLineDash([]);
  ctx.strokeStyle = theme.gridStrong;
  ctx.beginPath();
  ctx.moveTo(state.margins.left, Math.round(areas.price.top) + 0.5);
  ctx.lineTo(width - state.margins.right, Math.round(areas.price.top) + 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(state.margins.left, Math.round(areas.price.bottom) + 0.5);
  ctx.lineTo(width - state.margins.right, Math.round(areas.price.bottom) + 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawSessionSeparators(metadata, areas, theme, timeFormatting) {
  if (metadata.endIndex - metadata.startIndex < 2) return;

  const firstCandle = candles[metadata.startIndex];
  if (!firstCandle) return;

  ctx.save();
  ctx.lineWidth = scaleMetric(1);
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = theme.gridDashed;

  let lastKey = getTimeKey(firstCandle.time, timeFormatting.major);
  for (let i = metadata.startIndex + 1; i < metadata.endIndex; i += 1) {
    const candle = candles[i];
    if (!candle) continue;
    const key = getTimeKey(candle.time, timeFormatting.major);
    if (key === lastKey) continue;

    const x = metadata.offsetX + (i - metadata.startIndex) * metadata.barSpacing;
    const crispX = Math.round(x) + 0.5;
    ctx.beginPath();
    ctx.moveTo(crispX, areas.price.top);
    ctx.lineTo(crispX, areas.timeAxis.top + areas.timeAxis.height);
    ctx.stroke();

    lastKey = key;
  }

  ctx.restore();
}

function drawSeriesHeader(context, candle, theme, features = getActiveFeatures()) {
  if (!candle || features.showHeader === false) return;

  const change = candle.close - candle.open;
  const percent = candle.open ? (change / candle.open) * 100 : 0;
  const directionColor = change >= 0 ? theme.bullish : theme.bearish;
  const y = Math.max(18, state.margins.top - 18);

  context.save();
  context.font = `${getFontPixels(1.05)}px 'Inter', sans-serif`;
  context.textBaseline = "middle";
  let x = state.margins.left;

  if (features.detailedHeader) {
    const items = [
      { label: "O", value: formatPrice(candle.open), color: theme.text },
      { label: "H", value: formatPrice(candle.high), color: theme.text },
      { label: "L", value: formatPrice(candle.low), color: theme.text },
      { label: "C", value: formatPrice(candle.close), color: directionColor },
      {
        label: "Δ",
        value: `${formatSigned(change)} (${formatSignedPercent(percent)})`,
        color: directionColor,
      },
    ];

    items.forEach((item, index) => {
      context.fillStyle = theme.muted;
      context.fillText(item.label, x, y);
      x += context.measureText(`${item.label} `).width;

      context.fillStyle = item.color;
      context.fillText(item.value, x, y);
      x += context.measureText(`${item.value}  `).width;

      if (index === 0) {
        x += 6;
      }
    });
  } else {
    const lastLabel = `Último ${formatPrice(candle.close)}`;
    context.fillStyle = theme.text;
    context.fillText(lastLabel, x, y);
    x += context.measureText(`${lastLabel}  `).width;

    context.fillStyle = directionColor;
    context.fillText(`${formatSigned(change)} (${formatSignedPercent(percent)})`, x, y);
  }

  context.restore();
}

function drawEventCallout(context, hovered, theme, width) {
  if (!hovered || !hovered.event) {
    return;
  }

  const title = hovered.event.title || "Evento HearCap";
  const subtitle = hovered.event.subtitle || "";
  const paddingX = scaleMetric(12);
  const paddingY = scaleMetric(8);
  const pointerHeight = scaleMetric(10);
  const baseLineHeight = scaleMetric(14);
  const subtitleGap = subtitle ? scaleMetric(4) : 0;
  const titleFont = `600 ${getFontPixels()}px 'Inter', sans-serif`;
  const subtitleFont = `${getFontPixels(0.92)}px 'Inter', sans-serif`;

  context.save();
  context.font = titleFont;
  const titleWidth = context.measureText(title).width;
  let contentWidth = titleWidth;
  if (subtitle) {
    context.font = subtitleFont;
    const subtitleWidth = context.measureText(subtitle).width;
    contentWidth = Math.max(contentWidth, subtitleWidth);
  }

  const lines = subtitle ? 2 : 1;
  const boxWidth = Math.ceil(contentWidth) + paddingX * 2;
  const boxHeight = paddingY * 2 + baseLineHeight * lines + subtitleGap;
  let boxX = Math.round(hovered.x - boxWidth / 2);
  const minX = state.margins.left;
  const maxX = width - state.margins.right - boxWidth;
  if (boxX < minX) boxX = minX;
  if (boxX > maxX) boxX = maxX;
  const pointerClamp = Math.max(8, scaleMetric(14));
  const pointerBase = clamp(hovered.x, boxX + pointerClamp, boxX + boxWidth - pointerClamp);
  const boxY = Math.max(6, hovered.y - boxHeight - pointerHeight - 6);

  drawRoundedRect(context, boxX, boxY, boxWidth, boxHeight, Math.max(8, scaleMetric(12)));
  context.fillStyle = theme.eventBadgeBg;
  context.globalAlpha = 0.96;
  context.fill();
  if (theme.eventBadgeBorder) {
    context.globalAlpha = 1;
    context.strokeStyle = theme.eventBadgeBorder;
    context.stroke();
  }

  const textX = boxX + paddingX;
  let textY = boxY + paddingY;
  context.globalAlpha = 1;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillStyle = theme.eventBadgeText;
  context.font = titleFont;
  context.fillText(title, textX, textY);
  if (subtitle) {
    context.fillStyle = theme.eventBadgeMuted;
    context.font = subtitleFont;
    textY += baseLineHeight + subtitleGap;
    context.fillText(subtitle, textX, textY);
  }

  const pointerY = boxY + boxHeight;
  const pointerHalf = Math.max(6, scaleMetric(8));
  context.beginPath();
  context.moveTo(pointerBase, pointerY + pointerHeight);
  context.lineTo(pointerBase - pointerHalf, pointerY);
  context.lineTo(pointerBase + pointerHalf, pointerY);
  context.closePath();
  context.fillStyle = theme.eventBadgeBg;
  context.globalAlpha = 0.96;
  context.fill();
  if (theme.eventBadgeBorder) {
    context.globalAlpha = 1;
    context.strokeStyle = theme.eventBadgeBorder;
    context.stroke();
  }

  context.restore();
}

function drawEventMarkers(context, metadata, areas, events, theme, width) {
  if (!Array.isArray(events) || events.length === 0) {
    if (state.hoveredEventId) {
      state.hoveredEventId = null;
    }
    return;
  }

  const pointer = state.pointer || { x: 0, y: 0, inside: false };
  const pointerInside = !!pointer.inside;
  const pointerX = pointer.x;
  const pointerY = pointer.y;
  const stemBottom = Math.max(areas.price.top - scaleMetric(2), scaleMetric(14));
  const markerY = Math.max(scaleMetric(10), stemBottom - scaleMetric(16));
  const baseRadius = Math.max(3, scaleMetric(4.2));
  const highlightRadius = Math.max(baseRadius * 1.2, scaleMetric(6));
  let hovered = null;
  let bestDistance = Infinity;

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const index = typeof event.index === "number" ? event.index : -1;
    if (index < metadata.startIndex || index >= metadata.endIndex) {
      continue;
    }

    const localIndex = index - metadata.startIndex;
    const x = metadata.offsetX + (localIndex + 0.5) * metadata.barSpacing;
    if (x < state.margins.left - metadata.barSpacing || x > width - state.margins.right + metadata.barSpacing) {
      continue;
    }

    const hoverRangeX = Math.max(state.hitboxSize * 0.45, metadata.barSpacing * 0.45);
    const hoverRangeTop = markerY - state.hitboxSize * 1.4;
    const hoverRangeBottom = stemBottom + state.hitboxSize * 0.9;
    const isHovered =
      pointerInside &&
      Math.abs(pointerX - x) <= hoverRangeX &&
      pointerY >= hoverRangeTop &&
      pointerY <= hoverRangeBottom;

    context.save();
    context.strokeStyle = theme.eventMarkerLine;
    context.globalAlpha = isHovered ? 1 : 0.85;
    context.lineWidth = isHovered ? scaleMetric(1.5) : scaleMetric(1);
    context.beginPath();
    context.moveTo(x, stemBottom);
    context.lineTo(x, markerY + baseRadius);
    context.stroke();
    context.restore();

    context.save();
    const radius = isHovered ? highlightRadius : baseRadius;
    context.beginPath();
    context.arc(x, markerY, radius, 0, Math.PI * 2);
    if (isHovered) {
      context.shadowColor = theme.eventMarkerGlow;
      context.shadowBlur = Math.max(8, scaleMetric(16));
    }
    context.fillStyle = theme.eventMarkerFill;
    context.globalAlpha = isHovered ? 1 : 0.92;
    context.fill();
    context.shadowBlur = 0;
    context.globalAlpha = 1;
    context.lineWidth = scaleMetric(1);
    context.strokeStyle = theme.eventMarkerLine;
    context.stroke();
    context.restore();

    if (isHovered) {
      const distance = Math.abs(pointerX - x);
      if (distance < bestDistance) {
        bestDistance = distance;
        hovered = { event, x, y: markerY };
      }
    }
  }

  const hoveredId = hovered ? hovered.event.id : null;
  if (state.hoveredEventId !== hoveredId) {
    state.hoveredEventId = hoveredId;
  }

  if (hovered) {
    drawEventCallout(context, hovered, theme, width);
  }
}

function drawCandles(metadata, areas, range, theme) {
  const widthRatio = Math.max(0.35, Math.min(0.95, state.candleWidth));
  const bodyWidth = Math.min(
    metadata.barSpacing * widthRatio,
    metadata.barSpacing - Math.max(state.lineWidth, 1)
  );
  const halfBody = bodyWidth / 2;
  const offsetX = (metadata.barSpacing - bodyWidth) / 2;
  const liveIndex = liveCandleState.index;
  const liveValues = liveCandleState.values;

  const drawBodyPass = (predicate, color) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(0.8, state.lineWidth);
    for (let i = metadata.startIndex; i < metadata.endIndex; i += 1) {
      const candle = candles[i];
      if (!candle || !predicate(candle)) continue;
      const localIndex = i - metadata.startIndex;
      const x = metadata.offsetX + localIndex * metadata.barSpacing;
      const bodyX = x + offsetX;
      const source = i === liveIndex ? liveValues : candle;
      const yOpen = priceToY(source.open, range, areas.price);
      const yClose = priceToY(source.close, range, areas.price);
      const yHigh = priceToY(source.high, range, areas.price);
      const yLow = priceToY(source.low, range, areas.price);
      const wickX = Math.round(bodyX + halfBody) + 0.5;
      ctx.beginPath();
      ctx.moveTo(wickX, yHigh);
      ctx.lineTo(wickX, yLow);
      ctx.stroke();

      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
      ctx.fillRect(bodyX, bodyTop, bodyWidth, bodyHeight);
    }
  };

  const drawBorderPass = (predicate, borderColor) => {
    if (!borderColor) return;
    ctx.lineWidth = Math.max(0.75, scaleMetric(1));
    ctx.strokeStyle = borderColor;
    for (let i = metadata.startIndex; i < metadata.endIndex; i += 1) {
      const candle = candles[i];
      if (!candle || !predicate(candle)) continue;
      const localIndex = i - metadata.startIndex;
      const x = metadata.offsetX + localIndex * metadata.barSpacing;
      const bodyX = x + offsetX;
      const source = i === liveIndex ? liveValues : candle;
      const yOpen = priceToY(source.open, range, areas.price);
      const yClose = priceToY(source.close, range, areas.price);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));

      if (bodyHeight < 1.1) {
        const lineY = Math.round(bodyTop) + 0.5;
        ctx.beginPath();
        ctx.moveTo(bodyX, lineY);
        ctx.lineTo(bodyX + bodyWidth, lineY);
        ctx.stroke();
        continue;
      }

      const crispX = Math.round(bodyX) + 0.5;
      const crispY = Math.round(bodyTop) + 0.5;
      const width = Math.max(0.5, bodyWidth - 1);
      const height = Math.max(0.5, bodyHeight - 1);
      ctx.strokeRect(crispX, crispY, width, height);
    }
  };

  drawBodyPass(isBullishCandle, theme.bullish);
  drawBodyPass(isBearishCandle, theme.bearish);
  drawBorderPass(isBullishCandle, theme.bullishBorder || theme.bullish);
  drawBorderPass(isBearishCandle, theme.bearishBorder || theme.bearish);
}

function drawVolume(metadata, areas, stats, theme) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(state.margins.left, areas.volume.top, areas.chartWidth, areas.volume.height);
  ctx.clip();

  const volumeRatio = Math.max(0.25, Math.min(0.9, state.candleWidth * 0.85));
  const barWidth = Math.max(
    scaleMetric(0.75),
    Math.min(metadata.barSpacing * volumeRatio, metadata.barSpacing - state.lineWidth)
  );
  const offsetX = (metadata.barSpacing - barWidth) / 2;

  for (let i = metadata.startIndex; i < metadata.endIndex; i += 1) {
    const candle = candles[i];
    if (!candle) continue;
    const localIndex = i - metadata.startIndex;
    const x = metadata.offsetX + localIndex * metadata.barSpacing;
    const barX = x + offsetX;
    const heightRatio = (candle.volume || 0) / (stats.maxVolume || 1);
    const barHeight = heightRatio * areas.volume.height;
    const y = areas.volume.top + areas.volume.height - barHeight;

    ctx.fillStyle = isBullishCandle(candle) ? theme.volumeBull : theme.volumeBear;
    ctx.fillRect(barX, y, barWidth, barHeight);
  }

  ctx.restore();
}

function drawOverlayIndicators(context, metadata, areas, stats, theme, indicators = []) {
  if (
    !context ||
    !metadata ||
    !areas?.price ||
    !stats ||
    !Array.isArray(indicators) ||
    !indicators.length
  ) {
    return;
  }
  const overlays = indicators.filter((indicator) => indicator?.type === "overlay");
  if (!overlays.length) {
    return;
  }
  context.save();
  context.beginPath();
  context.rect(state.margins.left, areas.price.top, areas.chartWidth, areas.price.height);
  context.clip();
  for (let i = 0; i < overlays.length; i += 1) {
    const indicator = overlays[i];
    if (!indicator) continue;
    if (indicator.kind === "band") {
      drawOverlayBandIndicator(context, indicator, metadata, areas.price, stats);
    } else {
      drawOverlayLineIndicator(context, indicator, metadata, areas.price, stats);
    }
  }
  context.restore();
}

function drawOverlayLineIndicator(context, indicator, metadata, priceArea, stats) {
  if (!Array.isArray(indicator.values)) {
    return;
  }
  context.save();
  context.strokeStyle = indicator.color || "rgba(143,123,255,0.85)";
  context.lineWidth = scaleMetric(indicator.width || 2);
  context.globalAlpha = indicator.opacity ?? 0.9;
  drawOverlaySeriesLine(context, indicator.values, metadata, priceArea, stats);
  context.restore();
}

function drawOverlayBandIndicator(context, indicator, metadata, priceArea, stats) {
  if (!indicator.upper || !indicator.lower) {
    return;
  }
  context.save();
  const start = metadata.startIndex;
  const end = metadata.endIndex;
  const offsetX = metadata.offsetX;
  const spacing = metadata.barSpacing;
  let upperSegment = [];
  let lowerSegment = [];
  const flushSegment = () => {
    if (upperSegment.length < 2 || lowerSegment.length < 2) {
      upperSegment = [];
      lowerSegment = [];
      return;
    }
    context.beginPath();
    context.moveTo(upperSegment[0].x, upperSegment[0].y);
    for (let j = 1; j < upperSegment.length; j += 1) {
      context.lineTo(upperSegment[j].x, upperSegment[j].y);
    }
    for (let j = lowerSegment.length - 1; j >= 0; j -= 1) {
      context.lineTo(lowerSegment[j].x, lowerSegment[j].y);
    }
    context.closePath();
    context.fillStyle = indicator.fill || "rgba(143,123,255,0.12)";
    context.globalAlpha = 1;
    context.fill();
    upperSegment = [];
    lowerSegment = [];
  };
  for (let i = start; i < end; i += 1) {
    const upperValue = indicator.upper[i];
    const lowerValue = indicator.lower[i];
    if (!Number.isFinite(upperValue) || !Number.isFinite(lowerValue)) {
      flushSegment();
      continue;
    }
    const x = offsetX + (i - start + 0.5) * spacing;
    upperSegment.push({ x, y: priceToY(upperValue, stats, priceArea) });
    lowerSegment.push({ x, y: priceToY(lowerValue, stats, priceArea) });
  }
  flushSegment();
  context.strokeStyle = indicator.color || "rgba(143,123,255,0.65)";
  context.lineWidth = scaleMetric(indicator.lineWidth || 1.5);
  context.globalAlpha = indicator.opacity ?? 0.85;
  drawOverlaySeriesLine(context, indicator.upper, metadata, priceArea, stats);
  drawOverlaySeriesLine(context, indicator.middle, metadata, priceArea, stats, { dash: [4, 4] });
  drawOverlaySeriesLine(context, indicator.lower, metadata, priceArea, stats);
  context.restore();
}

function drawOverlaySeriesLine(context, values, metadata, priceArea, stats, options = {}) {
  if (!Array.isArray(values)) {
    return;
  }
  const start = metadata.startIndex;
  const end = metadata.endIndex;
  const offsetX = metadata.offsetX;
  const spacing = metadata.barSpacing;
  if (options.dash) {
    context.setLineDash(options.dash);
  } else {
    context.setLineDash([]);
  }
  let drawing = false;
  context.beginPath();
  for (let i = start; i < end; i += 1) {
    const value = values[i];
    if (!Number.isFinite(value)) {
      if (drawing) {
        context.stroke();
        context.beginPath();
        drawing = false;
      }
      continue;
    }
    const x = offsetX + (i - start + 0.5) * spacing;
    const y = priceToY(value, stats, priceArea);
    if (!drawing) {
      context.moveTo(x, y);
      drawing = true;
    } else {
      context.lineTo(x, y);
    }
  }
  if (drawing) {
    context.stroke();
  }
  context.setLineDash([]);
  context.globalAlpha = 1;
}

function drawPanelIndicators(context, metadata, areas, theme, indicators = []) {
  if (!context || !areas?.panelMap || !Array.isArray(indicators) || !indicators.length) {
    return;
  }
  const panels = areas.panelMap;
  for (let i = 0; i < indicators.length; i += 1) {
    const indicator = indicators[i];
    if (!indicator || indicator.type !== "panel") continue;
    const panelArea = panels[indicator.panelKey];
    if (!panelArea || panelArea.height <= 0) {
      continue;
    }
    context.save();
    context.beginPath();
    context.rect(state.margins.left, panelArea.top, areas.chartWidth, panelArea.height);
    context.clip();
    if (indicator.kind === "oscillator") {
      drawRSIPanelIndicator(context, indicator, metadata, panelArea, theme, areas.chartWidth);
    } else if (indicator.kind === "macd") {
      drawMACDPanelIndicator(context, indicator, metadata, panelArea, theme, areas.chartWidth);
    }
    context.restore();
  }
}

function drawRSIPanelIndicator(context, indicator, metadata, panelArea, theme, width) {
  const range = indicator.range || { min: 0, max: 100 };
  const start = metadata.startIndex;
  const end = metadata.endIndex;
  const zeroLineColor = theme.gridDashed || "rgba(255,255,255,0.18)";
  const levels = indicator.levels || { overbought: 70, oversold: 30 };
  context.strokeStyle = zeroLineColor;
  context.lineWidth = scaleMetric(1);
  const dash = Math.max(2, scaleMetric(4));
  context.setLineDash([dash, dash]);
  const offsets = [levels.overbought, levels.oversold];
  for (let i = 0; i < offsets.length; i += 1) {
    const value = offsets[i];
    if (!Number.isFinite(value)) continue;
    const y = panelValueToY(value, range, panelArea);
    context.beginPath();
    context.moveTo(state.margins.left, y);
    context.lineTo(state.margins.left + width, y);
    context.stroke();
  }
  context.setLineDash([]);
  context.strokeStyle = indicator.color || "rgba(143,123,255,0.95)";
  context.lineWidth = scaleMetric(indicator.lineWidth || 2);
  context.globalAlpha = 0.95;
  drawIndicatorLineOnPanel(context, indicator.values, metadata, panelArea, range);
  context.globalAlpha = 1;
}

function drawMACDPanelIndicator(context, indicator, metadata, panelArea, theme, width) {
  const start = metadata.startIndex;
  const end = metadata.endIndex;
  const valueSets = [indicator.macd, indicator.signal, indicator.histogram];
  const range = resolvePanelRange(valueSets, start, end);
  const zeroY = panelValueToY(0, range, panelArea);
  const histogramRatio = Math.max(0.25, Math.min(0.85, state.candleWidth * 0.9));
  const barWidth = Math.max(scaleMetric(1), metadata.barSpacing * histogramRatio);
  const offsetX = metadata.offsetX;
  for (let i = start; i < end; i += 1) {
    const value = indicator.histogram?.[i];
    if (!Number.isFinite(value)) continue;
    const x = offsetX + (i - start + 0.5) * metadata.barSpacing;
    const y = panelValueToY(value, range, panelArea);
    const height = zeroY - y;
    const fillColor =
      value >= 0
        ? indicator.colors?.histogramPositive || "rgba(0,255,128,0.35)"
        : indicator.colors?.histogramNegative || "rgba(192,132,252,0.35)";
    const rectY = value >= 0 ? y : zeroY;
    context.fillStyle = fillColor;
    context.fillRect(x - barWidth / 2, rectY, barWidth, Math.abs(height));
  }
  context.save();
  context.strokeStyle = indicator.colors?.macd || "rgba(143,123,255,0.95)";
  context.lineWidth = scaleMetric(2);
  drawIndicatorLineOnPanel(context, indicator.macd, metadata, panelArea, range);
  context.strokeStyle = indicator.colors?.signal || "rgba(0,255,128,0.9)";
  context.lineWidth = scaleMetric(1.5);
  drawIndicatorLineOnPanel(context, indicator.signal, metadata, panelArea, range);
  context.restore();
  context.strokeStyle = theme.gridStrong || "rgba(255,255,255,0.08)";
  context.lineWidth = scaleMetric(1);
  context.beginPath();
  context.moveTo(state.margins.left, zeroY);
  context.lineTo(state.margins.left + width, zeroY);
  context.stroke();
}

function drawIndicatorLineOnPanel(context, values, metadata, panelArea, range) {
  if (!Array.isArray(values)) {
    return;
  }
  const start = metadata.startIndex;
  const end = metadata.endIndex;
  const offsetX = metadata.offsetX;
  const spacing = metadata.barSpacing;
  let drawing = false;
  context.beginPath();
  for (let i = start; i < end; i += 1) {
    const value = values[i];
    if (!Number.isFinite(value)) {
      if (drawing) {
        context.stroke();
        context.beginPath();
        drawing = false;
      }
      continue;
    }
    const x = offsetX + (i - start + 0.5) * spacing;
    const y = panelValueToY(value, range, panelArea);
    if (!drawing) {
      context.moveTo(x, y);
      drawing = true;
    } else {
      context.lineTo(x, y);
    }
  }
  if (drawing) {
    context.stroke();
  }
}

function panelValueToY(value, range, area) {
  if (!Number.isFinite(value)) {
    return area.top + area.height / 2;
  }
  const span = Math.max(range.max - range.min, 1e-6);
  const ratio = (value - range.min) / span;
  return area.top + (1 - ratio) * area.height;
}

function resolvePanelRange(valueSets, start, end) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < valueSets.length; i += 1) {
    const values = valueSets[i];
    if (!Array.isArray(values)) continue;
    for (let idx = start; idx < end; idx += 1) {
      const value = values[idx];
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: -1, max: 1 };
  }
  const padding = Math.max((max - min) * 0.2, 0.5);
  return {
    min: min - padding,
    max: max + padding,
  };
}

function drawPriceAxis(range, areas, theme, priceTicks, lastCandle) {
  if (!priceScaleCanvas || !priceScaleCtx) return;
  const width = priceScaleSize.width || priceScaleCanvas.clientWidth || 0;
  const height = priceScaleSize.height || priceScaleCanvas.clientHeight || 0;
  const baseHeight = canvasSize.height || canvas.clientHeight || height;
  if (width <= 0 || height <= 0 || baseHeight <= 0) {
    return;
  }

  const toScaleY = (value) =>
    Math.round((value / baseHeight) * height) + 0.5;
  const tickStart = 18;
  const tickEnd = width - 18;

  priceScaleCtx.save();
  priceScaleCtx.font = `${getFontPixels(0.95)}px 'Inter', sans-serif`;
  priceScaleCtx.textAlign = "right";
  priceScaleCtx.textBaseline = "middle";

  priceTicks.forEach((tick) => {
    const labelY = clamp(toScaleY(tick.y), 0, height);
    if (labelY < 8 || labelY > height - 8) {
      return;
    }
    priceScaleCtx.strokeStyle = theme.gridStrong;
    priceScaleCtx.beginPath();
    priceScaleCtx.moveTo(tickStart, labelY);
    priceScaleCtx.lineTo(tickEnd, labelY);
    priceScaleCtx.stroke();
    priceScaleCtx.fillStyle = theme.text;
    priceScaleCtx.fillText(formatPrice(tick.price), tickEnd - 6, labelY);
  });

  if (lastCandle) {
    const priceY = priceToY(lastCandle.close, range, areas.price);
    const labelY = clamp(toScaleY(priceY), 0, height) - 16;
    const bullish = lastCandle.close >= lastCandle.open;
    const fill = bullish ? theme.bullish : theme.bearish;
    const textColor = bullish ? "#031d12" : "#f4ecff";
    drawAxisBox(
      {
        text: formatPrice(lastCandle.close),
        x: width,
        y: labelY,
        paddingX: 8,
        paddingY: 4,
        radius: 2,
        fill,
        textColor,
        align: "right",
      },
      priceScaleCtx
    );
  }

  priceScaleCtx.restore();
}

function drawMinimalPriceAxis(range, areas, theme, lastCandle) {
  if (!priceScaleCanvas || !priceScaleCtx) return;
  const width = priceScaleSize.width || priceScaleCanvas.clientWidth || 0;
  const height = priceScaleSize.height || priceScaleCanvas.clientHeight || 0;
  const baseHeight = canvasSize.height || canvas.clientHeight || height;
  if (width <= 0 || height <= 0 || baseHeight <= 0) {
    return;
  }

  const toScaleY = (value) =>
    Math.round((value / baseHeight) * height) + 0.5;

  priceScaleCtx.save();
  priceScaleCtx.font = `${getFontPixels(0.95)}px 'Inter', sans-serif`;
  priceScaleCtx.fillStyle = theme.text;
  priceScaleCtx.textAlign = "right";
  priceScaleCtx.textBaseline = "middle";
  priceScaleCtx.fillText(formatPrice(range.maxPrice), width - 18, 28);
  priceScaleCtx.fillText(formatPrice(range.minPrice), width - 18, height - 28);

  if (lastCandle) {
    const priceY = priceToY(lastCandle.close, range, areas.price);
    const labelY = clamp(toScaleY(priceY), 0, height) - 16;
    const bullish = lastCandle.close >= lastCandle.open;
    const fill = bullish ? theme.bullish : theme.bearish;
    const textColor = bullish ? "#031d12" : "#f4ecff";
    drawAxisBox(
      {
        text: formatPrice(lastCandle.close),
        x: width - 20,
        y: labelY,
        paddingX: 12,
        paddingY: 6,
        radius: 12,
        fill,
        textColor,
        align: "right",
      },
      priceScaleCtx
    );
  }

  priceScaleCtx.restore();
}

function drawTimeAxis(metadata, areas, theme, timeFormatting, options = {}) {
  const width = canvas.clientWidth;
  const axisX = state.margins.left - state.layout.axisPadding;
  const axisWidth =
    width - state.margins.left - state.margins.right + state.layout.axisPadding * 2;
  const axisY = areas.timeAxis.top;

  ctx.save();
  drawRoundedRect(ctx, axisX, axisY, axisWidth, areas.timeAxis.height, 0);
  ctx.fillStyle = theme.timeScaleBg;
  ctx.fill();
  ctx.strokeStyle = theme.timeScaleBorder;
  ctx.stroke();

  const relaxed = Boolean(options.relaxed);
  const showMinor = options.showMinor !== false;
  const baseStep = relaxed ? 190 : 150;
  const desiredPixelStep = Math.max(scaleMetric(baseStep), 80);
  const barsPerLabel = Math.max(1, Math.round(desiredPixelStep / metadata.barSpacing));
  ctx.font = `${getFontPixels()}px 'Inter', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let lastLabelX = -Infinity;
  let lastMajorKey = null;

  for (let i = metadata.startIndex; i < metadata.endIndex; i += barsPerLabel) {
    const candle = candles[i];
    if (!candle) continue;
    const x =
      metadata.offsetX +
      (i - metadata.startIndex + 0.5) * metadata.barSpacing;
    if (x < state.margins.left - 4 || x > width - state.margins.right + 4) continue;

    const majorKey = getTimeKey(candle.time, timeFormatting.major);
    const isMajor = majorKey !== lastMajorKey;

    if (x - lastLabelX < 48) {
      if (isMajor) {
        lastMajorKey = majorKey;
      }
      continue;
    }

    if (!showMinor && !isMajor) {
      continue;
    }

    ctx.strokeStyle = isMajor ? theme.gridStrong : theme.gridLine;
    ctx.beginPath();
    const tickHeight = isMajor ? 8 : showMinor ? 5 : 0;
    ctx.moveTo(x, areas.price.bottom);
    ctx.lineTo(x, areas.price.bottom + tickHeight);
    ctx.stroke();

    ctx.fillStyle = isMajor ? theme.text : theme.muted;
    const mode = isMajor ? timeFormatting.major : timeFormatting.minor;
    const label = formatTimeAxis(candle.time, mode);
    const metrics = ctx.measureText(label);
    const labelHalfWidth = metrics.width / 2;
    const padding = 8;
    const minLabelX = axisX + padding + labelHalfWidth;
    const maxLabelX = axisX + axisWidth - padding - labelHalfWidth;
    const clampedX = clamp(x, minLabelX, maxLabelX);
    ctx.fillText(label, clampedX, axisY + areas.timeAxis.height / 2);
    lastLabelX = x;

    if (isMajor) {
      lastMajorKey = majorKey;
    }
  }

  ctx.restore();
}

function drawLastPriceMarker(candle, range, width, areas, theme) {
  if (!candle) return;

  const y = priceToY(candle.close, range, areas.price);
  const bullish = candle.close >= candle.open;
  const glowColor = bullish ? theme.bullish : theme.priceGlow || theme.bearish;

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 26;
  ctx.fillStyle = theme.priceGlow || glowColor;
  ctx.fillRect(
    state.margins.left,
    y - 1.5,
    width - state.margins.left - state.margins.right,
    3
  );
  ctx.restore();

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = bullish ? theme.lastPriceLine || theme.bullish : theme.bearish;
  ctx.beginPath();
  ctx.moveTo(state.margins.left, y);
  ctx.lineTo(width - state.margins.right, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function getHoverIndex(metadata, areas, width) {
  if (!state.crosshair.active) return -1;
  if (
    state.crosshair.x < state.margins.left ||
    state.crosshair.x > width - state.margins.right
  ) {
    return -1;
  }

  const hitboxPadding = Math.max(4, state.hitboxSize * 0.35);
  if (
    state.crosshair.y < state.margins.top - hitboxPadding ||
    state.crosshair.y > areas.timeAxis.top + areas.timeAxis.height
  ) {
    return -1;
  }

  const relativeX = state.crosshair.x - metadata.offsetX;
  const indexOffset = Math.floor(relativeX / metadata.barSpacing);
  const hoverIndex = metadata.startIndex + indexOffset;

  if (hoverIndex < metadata.startIndex || hoverIndex >= metadata.endIndex) {
    return -1;
  }

  return hoverIndex;
}

function drawCrosshair(
  context,
  width,
  metadata,
  areas,
  range,
  theme,
  timeFormatting,
  modeBlend,
  features = getActiveFeatures()
) {
  const hoverIndex = state.crosshair.candleIndex;
  if (!state.crosshair.active || hoverIndex === -1) {
    hideTooltip();
    return;
  }

  const candle = candles[hoverIndex];
  if (!candle) {
    hideTooltip();
    return;
  }

  const x =
    metadata.offsetX +
    (hoverIndex - metadata.startIndex + 0.5) * metadata.barSpacing;
  const y = clamp(state.crosshair.y, areas.price.top, areas.price.bottom);
  const lineBlend = (modeBlend?.line || 0) + (modeBlend?.area || 0);

  context.save();
  context.strokeStyle = theme.crosshair;
  context.lineWidth = Math.max(0.75, state.crosshair.lineWidth);
  const dash = Math.max(3, scaleMetric(6));
  context.setLineDash([dash, dash]);
  context.beginPath();
  context.moveTo(x, areas.price.top - scaleMetric(18));
  context.lineTo(x, areas.timeAxis.top + areas.timeAxis.height);
  context.stroke();

  context.beginPath();
  context.moveTo(state.margins.left, y);
  context.lineTo(width - state.margins.right, y);
  context.stroke();
  context.restore();

  if (lineBlend > 0.001) {
    const closeY = priceToY(candle.close, range, areas.price);
    context.save();
    const pointColor = theme.linePoint || theme.seriesLine || theme.crosshair;
    context.fillStyle = pointColor;
    context.globalAlpha = Math.min(1, 0.32 + lineBlend * 0.6);
    context.shadowColor = pointColor;
    context.shadowBlur = 6 + lineBlend * 10;
    context.beginPath();
    context.arc(x, closeY, 3.2 + lineBlend * 2.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  if (features.showDetailedPriceScale !== false) {
    const priceValue = yToPrice(y, range, areas.price);
    drawAxisBox({
      text: formatPrice(priceValue),
      x: width,
      y: y - 14,
      paddingX: 8,
      paddingY: 4,
      radius: 2,
      fill: theme.priceScaleBg,
      stroke: theme.priceScaleBorder,
      textColor: theme.text,
    }, context);
  }

  if (features.showDetailedTimeScale !== false) {
    drawAxisBox({
      text: formatTimeAxis(candle.time, timeFormatting.crosshair),
      x,
      y: areas.timeAxis.top + 4,
      paddingX: 8,
      paddingY: 4,
      radius: 2,
      fill: theme.timeScaleBg,
      stroke: theme.timeScaleBorder,
      textColor: theme.text,
      align: "center",
    }, context);
  }

  if (features.showTooltip) {
    tooltip.classList.add("visible");
    tooltip.style.left = `${state.crosshair.x}px`;
    tooltip.style.top = `${state.crosshair.y}px`;
    tooltip.innerHTML = `
      <div class="tooltip__price">${formatPrice(candle.close)}</div>
      <div class="tooltip__row"><span>Data</span><span>${formatTooltipTime(
      candle.time
    )}</span></div>
      <div class="tooltip__row"><span>Abertura</span><span>${formatPrice(
      candle.open
    )}</span></div>
      <div class="tooltip__row"><span>Máximo</span><span>${formatPrice(
      candle.high
    )}</span></div>
      <div class="tooltip__row"><span>Mínimo</span><span>${formatPrice(
      candle.low
    )}</span></div>
      <div class="tooltip__row"><span>Fechamento</span><span>${formatPrice(
      candle.close
    )}</span></div>
      <div class="tooltip__row"><span>Volume</span><span>${(candle.volume || 0).toFixed(
      0
    )}</span></div>
    `;
  } else {
    hideTooltip();
  }
}

function drawLiveCandleOverlay(context, metadata, areas, range, theme, candleVisibility) {
  if (!liveCandleState.visible || candleVisibility <= 0.001) {
    liveCandleState.overlayAnimating = false;
    return false;
  }

  const animationActive = stepLiveCandleOverlay(range);
  if (!animationActive) {
    return false;
  }

  const index = liveCandleState.index;
  if (index < metadata.startIndex || index >= metadata.endIndex) {
    liveCandleState.overlayAnimating = false;
    return false;
  }

  const bodyWidth = Math.min(metadata.barSpacing * 0.75, metadata.barSpacing - 1.2);
  const halfBody = bodyWidth / 2;
  const offsetX = (metadata.barSpacing - bodyWidth) / 2;
  const localIndex = index - metadata.startIndex;
  const x = metadata.offsetX + localIndex * metadata.barSpacing;
  const bodyX = x + offsetX;
  const wickX = Math.round(bodyX + halfBody) + 0.5;

  const values = liveCandleState.values;
  const yOpen = priceToY(values.open, range, areas.price);
  const yCloseBase = priceToY(values.close, range, areas.price);
  const yHigh = priceToY(values.high, range, areas.price);
  const yLow = priceToY(values.low, range, areas.price);
  const yClose = yCloseBase + liveCandleState.closeOffset;

  const bullish = values.close >= values.open;
  const glowColor = bullish ? theme.bullish : theme.bearish;

  context.save();
  context.lineWidth = Math.max(0.75, scaleMetric(1.05));
  context.strokeStyle = glowColor;
  context.globalAlpha = (0.35 + 0.45 * liveCandleState.glowIntensity) * candleVisibility;
  context.shadowColor = glowColor;
  context.shadowBlur = 10 + 22 * liveCandleState.glowIntensity;
  context.beginPath();
  context.moveTo(wickX, yHigh);
  context.lineTo(wickX, yLow);
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = glowColor;
  context.globalAlpha = (0.28 + 0.35 * liveCandleState.glowIntensity) * candleVisibility;
  context.shadowColor = glowColor;
  context.shadowBlur = 12 + 18 * liveCandleState.glowIntensity;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
  context.fillRect(bodyX, bodyTop, bodyWidth, bodyHeight);
  context.restore();

  context.save();
  context.fillStyle = glowColor;
  context.globalAlpha =
    Math.min(0.95, 0.55 + 0.45 * liveCandleState.glowIntensity) * candleVisibility;
  const pulseWidth = Math.min(metadata.barSpacing * 0.9, bodyWidth + scaleMetric(6));
  const tickHeight = Math.max(1, Math.round(scaleMetric(1) + liveCandleState.glowIntensity));
  context.fillRect(
    bodyX - (pulseWidth - bodyWidth) / 2,
    yClose - tickHeight / 2,
    pulseWidth,
    tickHeight
  );
  context.restore();

  return true;
}

function hideTooltip() {
  tooltip.classList.remove("visible");
}

function formatPrice(value) {
  const digits = state.priceFormat?.fractionDigits ?? 2;
  const formatter = getPriceFormatter(digits);
  return formatter.format(Number.isFinite(value) ? value : 0);
}

function formatSigned(value) {
  const digits = state.priceFormat?.fractionDigits ?? 2;
  const formatter = getPriceFormatter(digits);
  const abs = formatter.format(Math.abs(Number.isFinite(value) ? value : 0));

  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return formatter.format(0);
}

function formatSignedPercent(value) {
  const formatter = getPercentFormatter();
  const abs = formatter.format(Math.abs(Number.isFinite(value) ? value : 0));

  if (value > 0) return `+${abs}%`;
  if (value < 0) return `-${abs}%`;
  return `${formatter.format(0)}%`;
}

function computeTimeFormatting(metadata) {
  if (
    timeFormattingCache.start === metadata.startIndex &&
    timeFormattingCache.end === metadata.endIndex &&
    timeFormattingCache.value
  ) {
    return timeFormattingCache.value;
  }

  const first = candles[metadata.startIndex];
  const last = candles[Math.min(metadata.endIndex - 1, candles.length - 1)];
  if (!first || !last) {
    const fallback = { minor: "intraday", major: "day", crosshair: "intraday" };
    timeFormattingCache.start = metadata.startIndex;
    timeFormattingCache.end = metadata.endIndex;
    timeFormattingCache.value = fallback;
    return fallback;
  }

  const span = Math.max(1, last.time - first.time);
  let value;

  if (span > YEAR_IN_MS * 2) {
    value = { minor: "month", major: "year", crosshair: "day" };
  } else if (span > DAY_IN_MS * 90) {
    value = { minor: "day", major: "month", crosshair: "day" };
  } else if (span > DAY_IN_MS * 2) {
    value = { minor: "hour", major: "day", crosshair: "hour" };
  } else {
    value = { minor: "intraday", major: "day", crosshair: "intraday" };
  }

  timeFormattingCache.start = metadata.startIndex;
  timeFormattingCache.end = metadata.endIndex;
  timeFormattingCache.value = value;
  return value;
}

function getTimeKey(timestamp, mode) {
  const date = new Date(timestamp);
  switch (mode) {
    case "year":
      return `${date.getFullYear()}`;
    case "month":
      return `${date.getFullYear()}-${date.getMonth()}`;
    case "day":
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    case "hour":
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    default:
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  }
}

function formatTimeAxis(timestamp, mode = "intraday") {
  const date = new Date(timestamp);
  switch (mode) {
    case "year":
      return getDateFormatter("axis-year", { year: "numeric" }).format(date);
    case "month":
      return getDateFormatter("axis-month", { month: "short", year: "numeric" }).format(date);
    case "day":
      return getDateFormatter("axis-day", { day: "2-digit", month: "short" }).format(date);
    case "hour":
    case "intraday":
    default:
      return getDateFormatter("axis-intraday", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
}

function formatTooltipTime(timestamp) {
  return getDateFormatter("tooltip", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function render() {
  const width = canvasSize.width || canvas.clientWidth;
  const height = canvasSize.height || canvas.clientHeight;
  clearBaseCanvas();
  clearPriceScaleCanvas();

  ctx.save();
  const theme = getTheme();
  const features = getActiveFeatures();
  applyCanvasClip(ctx, width, height, CANVAS_BORDER_RADIUS);
  ctx.fillStyle = theme.panel;
  ctx.fillRect(0, 0, width, height);

  const areas = computeLayout(width, height);
  const now = getNow();
  const chartTransitioning = updateChartModeTransition(now);
  const modeBlend = computeModeBlend();
  const animating = applyViewportEasing(areas);
  const metadata = getVisibleMetadata(width, areas);
  const liveAnimating = updateLiveCandleSmoothing(metadata);

  if (metadata.endIndex <= metadata.startIndex) {
    frameState.width = width;
    frameState.height = height;
    frameState.metadata = null;
    frameState.areas = null;
    frameState.stats = null;
    frameState.timeFormatting = null;
    frameState.theme = theme;
    frameState.modeBlend = modeBlend;
    frameState.features = features;
    frameState.events = [];
    frameState.indicators = [];
    frameState.transform = null;
    ctx.restore();
    clearOverlayCanvas();
    clearDrawingCanvas();
    hideTooltip();
    return;
  }

  const stats = computeSeriesStats(metadata);
  const timeFormatting = computeTimeFormatting(metadata);
  const priceTicks = features.showDetailedPriceScale ? buildPriceTicks(stats, areas) : [];
  const needsSeriesPoints = modeBlend.line > 0 || modeBlend.area > 0;
  const seriesPoints = needsSeriesPoints ? computeSeriesPoints(metadata, areas, stats) : null;
  const indicatorData = dataProvider.getIndicators(state.timeframe);
  const transform = createChartTransform(metadata, areas, stats);

  if (features.showGrid) {
    drawGrid(width, metadata, areas, theme, priceTicks);
  }
  if (features.showSessionSeparators) {
    drawSessionSeparators(metadata, areas, theme, timeFormatting);
  }
  if (features.allowCandles && modeBlend.candles > 0) {
    ctx.save();
    ctx.globalAlpha = modeBlend.candles;
    drawCandles(metadata, areas, stats, theme);
    ctx.restore();
  }
  if (modeBlend.area > 0 && seriesPoints && seriesPoints.count > 0) {
    drawAreaSeries(seriesPoints, areas, theme, modeBlend.area);
  }
  if (modeBlend.line > 0 && seriesPoints && seriesPoints.count > 0) {
    drawLineSeries(seriesPoints, areas, theme, modeBlend.line);
  }
  const overlaysVisible = state.indicatorsVisibility.overlays !== false;
  const panelsVisible = state.indicatorsVisibility.panels !== false;

  if (features.showVolume && panelsVisible) {
    drawVolume(metadata, areas, stats, theme);
  }
  if (features.showDetailedTimeScale) {
    drawTimeAxis(metadata, areas, theme, timeFormatting);
  } else {
    drawTimeAxis(metadata, areas, theme, timeFormatting, { showMinor: false, relaxed: true });
  }

  const lastCandle = candles[Math.min(metadata.endIndex - 1, candles.length - 1)];
  drawLastPriceMarker(lastCandle, stats, width, areas, theme);

  if (priceScaleCtx) {
    if (features.showDetailedPriceScale) {
      drawPriceAxis(stats, areas, theme, priceTicks, lastCandle);
    } else {
      drawMinimalPriceAxis(stats, areas, theme, lastCandle);
    }
  }

  frameState.width = width;
  frameState.height = height;
  frameState.metadata = metadata;
  frameState.areas = areas;
  frameState.stats = stats;
  frameState.timeFormatting = timeFormatting;
  frameState.theme = theme;
  frameState.modeBlend = modeBlend;
  frameState.features = features;
  frameState.events = features.showEvents === false ? [] : eventMarkers;
  frameState.indicators = indicatorData;
  frameState.transform = transform;

  ctx.restore();

  renderOverlay();
  renderDrawingLayer();
  refreshDrawingToolbar();

  if (animating || liveAnimating || chartTransitioning) {
    scheduleRender();
  }
}

function renderOverlay() {
  if (!overlayCanvas || !overlayCtx) {
    state.crosshair.candleIndex = -1;
    liveCandleState.overlayAnimating = false;
    state.hoveredEventId = null;
    return false;
  }

  clearOverlayCanvas();
  const clipWidth = canvasSize.width || canvas.clientWidth || overlayCanvas.clientWidth || 0;
  const clipHeight = canvasSize.height || canvas.clientHeight || overlayCanvas.clientHeight || 0;
  overlayCtx.save();
  applyCanvasClip(overlayCtx, clipWidth, clipHeight, CANVAS_BORDER_RADIUS);

  const {
    metadata,
    areas,
    stats,
    timeFormatting,
    theme,
    width,
    modeBlend,
    features: frameFeatures,
    events,
  } = frameState;
  if (!metadata || !areas || !stats || !timeFormatting || !theme) {
    state.crosshair.candleIndex = -1;
    liveCandleState.overlayAnimating = false;
    hideTooltip();
    overlayCtx.restore();
    return false;
  }

  const indicators = frameState.indicators || [];
  const overlaysVisible = state.indicatorsVisibility.overlays !== false;
  const panelsVisible = state.indicatorsVisibility.panels !== false;

  if (overlaysVisible) {
    drawOverlayIndicators(overlayCtx, metadata, areas, stats, theme, indicators);
  }

  if (panelsVisible) {
    drawPanelIndicators(overlayCtx, metadata, areas, theme, indicators);
  }

  let shouldAnimateOverlay = false;
  const blend = modeBlend || modeBlendState;
  const candleWeight = blend.candles || 0;
  const lineWeight = (blend.line || 0) + (blend.area || 0);

  const features = frameFeatures || getActiveFeatures();
  const crosshairEnabled = !!features.showCrosshair;

  const hoverIndex = crosshairEnabled ? getHoverIndex(metadata, areas, width) : -1;
  state.crosshair.candleIndex = crosshairEnabled ? hoverIndex : -1;

  const fallbackIndex = Math.min(metadata.endIndex - 1, candles.length - 1);
  const referenceIndex = hoverIndex !== -1 ? hoverIndex : fallbackIndex;
  const referenceCandle = candles[referenceIndex];

  if (!crosshairEnabled || !state.crosshair.active || hoverIndex === -1) {
    hideTooltip();
  } else {
    const columnX = metadata.offsetX + (hoverIndex - metadata.startIndex) * metadata.barSpacing;
    const columnWidth = metadata.barSpacing;
    const highlightHeight =
      areas.timeAxis.top + areas.timeAxis.height - areas.price.top;

    overlayCtx.save();
    const highlightAlpha = Math.min(0.26, 0.08 + candleWeight * 0.18 + lineWeight * 0.08);
    overlayCtx.globalAlpha = highlightAlpha;
    overlayCtx.fillStyle = theme.crosshair;
    overlayCtx.fillRect(columnX, areas.price.top, columnWidth, highlightHeight);
    overlayCtx.restore();
  }

  let liveOverlayActive = false;
  if (candleWeight > 0.001) {
    liveOverlayActive = drawLiveCandleOverlay(
      overlayCtx,
      metadata,
      areas,
      stats,
      theme,
      candleWeight
    );
    if (liveOverlayActive) {
      shouldAnimateOverlay = true;
    }
  } else {
    liveCandleState.overlayAnimating = false;
  }

  if (crosshairEnabled && state.crosshair.active && hoverIndex !== -1) {
    drawCrosshair(
      overlayCtx,
      width,
      metadata,
      areas,
      stats,
      theme,
      timeFormatting,
      blend,
      features
    );
  }

  drawSeriesHeader(overlayCtx, referenceCandle, theme, features);

  if (features.showEvents !== false) {
    drawEventMarkers(
      overlayCtx,
      metadata,
      areas,
      Array.isArray(events) ? events : [],
      theme,
      width
    );
  } else if (state.hoveredEventId) {
    state.hoveredEventId = null;
  }

  if (shouldAnimateOverlay && !overlayRenderPending) {
    scheduleOverlayRender();
  }

  if (!shouldAnimateOverlay) {
    liveCandleState.overlayAnimating = false;
  }

  overlayCtx.restore();
  return shouldAnimateOverlay;
}

function renderDrawingLayer() {
  if (!drawingCanvas || !drawingCtx || !drawingManager) {
    return false;
  }
  clearDrawingCanvas();
  const clipWidth = canvasSize.width || canvas.clientWidth || drawingCanvas.clientWidth || 0;
  const clipHeight = canvasSize.height || canvas.clientHeight || drawingCanvas.clientHeight || 0;
  drawingCtx.save();
  applyCanvasClip(drawingCtx, clipWidth, clipHeight, CANVAS_BORDER_RADIUS);
  const { metadata, areas, stats, transform, theme } = frameState;
  if (!metadata || !areas || !stats || !transform) {
    drawingCtx.restore();
    return false;
  }
  drawingManager.draw(drawingCtx, { transform, theme });
  drawingCtx.restore();
  return true;
}

function refreshDrawingToolbar() {
  if (!drawingToolbarController) {
    return;
  }
  if (state.ui.cinemaMode) {
    drawingToolbarController.hide();
    pendingToolbarUpdate = true;
    return;
  }
  if (!selectedDrawingTool) {
    drawingToolbarController.hide();
    pendingToolbarUpdate = false;
    return;
  }
  if (!frameState.transform) {
    drawingToolbarController.hide();
    return;
  }
  const context = {
    transform: frameState.transform,
    frameRect: interactionCanvas?.getBoundingClientRect() || null,
  };
  if (pendingToolbarUpdate) {
    drawingToolbarController.update(selectedDrawingTool, context);
    pendingToolbarUpdate = false;
  } else {
    drawingToolbarController.refresh(context);
  }
}

drawingManager = createDrawingManager({
  requestRender: scheduleDrawingRender,
});

function duplicateSelectedTool() {
  drawingManager?.duplicateSelected();
}

export function setActiveDrawingTool(toolType = "none") {
  if (!drawingManager) {
    return;
  }
  const normalized = toolType || "none";
  drawingManager.setActiveTool(normalized);
  if (drawingToolbar) {
    const button =
      drawingToolbar.querySelector(`[data-tool="${normalized}"]`) || null;
    setActiveToolbarButton(button);
  }
}

export function clearAllDrawingTools() {
  drawingManager?.clearAll();
}

export function deleteSelectedTool() {
  drawingManager?.deleteSelected();
}

export function getDrawingToolsSnapshot() {
  return drawingManager ? drawingManager.getSnapshot() : [];
}

export { duplicateSelectedTool };

drawingToolbarController = initDrawingToolbar({
  onStyleChange: (toolId, stylePatch) => {
    drawingManager?.updateToolStyle(toolId, stylePatch);
  },
  onSettingsChange: (toolId, settingsPatch) => {
    drawingManager?.updateToolSettings(toolId, settingsPatch);
  },
  onDuplicate: () => {
    duplicateSelectedTool();
  },
  onDelete: () => {
    deleteSelectedTool();
  },
});

drawingManager.onSelectionChange((tool) => {
  selectedDrawingTool = tool || null;
  pendingToolbarUpdate = true;
  if (!tool && drawingToolbarController) {
    drawingToolbarController.hide();
  }
});

function syncDrawingToolContext() {
  if (!drawingManager || typeof dataProvider.getSymbol !== "function") {
    return;
  }
  drawingManager.setContext(dataProvider.getSymbol(), state.timeframe);
  scheduleDrawingRender();
}

syncDrawingToolContext();

function handlePointerDown(event) {
  if (!interactionCanvas) {
    return;
  }
  const pointerType = supportsPointerEvents ? event.pointerType || "mouse" : "mouse";
  if (pointerType === "mouse" && "button" in event && event.button !== 0) {
    return;
  }

  const features = getActiveFeatures();
  const crosshairEnabled = !!features.showCrosshair;

  const rect = interactionCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  state.pointer = { x, y, inside: true };
  const shouldShowCrosshair = crosshairEnabled && pointerType !== "mouse";
  state.crosshair = { ...state.crosshair, active: shouldShowCrosshair, x, y };

  if (supportsPointerEvents && typeof event.pointerId === "number") {
    state.activePointerId = event.pointerId;
    if (typeof interactionCanvas.setPointerCapture === "function") {
      try {
        interactionCanvas.setPointerCapture(event.pointerId);
      } catch (captureError) {
        // ignore capture errors (e.g., when pointer is already captured)
      }
    }
  } else {
    state.activePointerId = null;
  }

  const transform = frameState.transform;
  if (
    drawingManager &&
    drawingManager.handlePointerDown({ x, y, transform })
  ) {
    state.isDragging = false;
    hideTooltip();
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    scheduleOverlayRender();
    scheduleDrawingRender();
    return;
  }

  state.isDragging = true;
  state.lastPointer.x = event.clientX;
  state.lastPointer.y = event.clientY;
  state.targetViewportIndex = state.viewportIndex;
  state.targetScale = state.scale;
  setCursor("grabbing");

  if (!shouldShowCrosshair) {
    hideTooltip();
  }

  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  scheduleOverlayRender();
}

function handlePointerMove(event) {
  const rect = interactionCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  state.pointer = { x, y, inside: true };
  const pointerType = supportsPointerEvents ? event.pointerType || "mouse" : "mouse";
  const features = getActiveFeatures();
  const crosshairEnabled = !!features.showCrosshair;
  const isActivePointer = supportsPointerEvents
    ? state.activePointerId === event.pointerId
    : state.isDragging;
  const dragging = state.isDragging && (pointerType === "mouse" ? event.buttons === 1 : isActivePointer);

  const shouldShowCrosshair = crosshairEnabled && (pointerType !== "mouse" || !dragging);
  state.crosshair = { ...state.crosshair, active: shouldShowCrosshair, x, y };

  const transform = frameState.transform;
  if (
    drawingManager &&
    drawingManager.handlePointerMove({ x, y, transform })
  ) {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    scheduleOverlayRender();
    scheduleDrawingRender();
    return;
  }

  if (dragging) {
    const dx = event.clientX - state.lastPointer.x;
    state.lastPointer.x = event.clientX;
    if (Math.abs(dx) > 0.2 && state.followMode) {
      disableFollowModeFromUser();
    }
    state.targetViewportIndex -= dx / getBarSpacing();
    invalidateViewportCaches();
    hideTooltip();
    state.hoveredEventId = null;

    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    scheduleRender();
    return;
  }

  if (supportsPointerEvents && pointerType !== "mouse" && !isActivePointer) {
    return;
  }

  if (!crosshairEnabled) {
    hideTooltip();
    scheduleOverlayRender();
    return;
  }

  scheduleOverlayRender();
}

function handlePointerUp(event) {
  state.isDragging = false;
  state.activePointerId = null;
  const features = getActiveFeatures();
  const crosshairEnabled = !!features.showCrosshair;
  setCursor(getDefaultCursor());
  state.crosshair = { ...state.crosshair, active: crosshairEnabled };
  const transform = frameState.transform;
  const drawingHandled =
    drawingManager && drawingManager.handlePointerUp({ transform });

  if (!crosshairEnabled) {
    hideTooltip();
  }

  if (supportsPointerEvents && event && typeof event.pointerId === "number") {
    if (
      typeof interactionCanvas.releasePointerCapture === "function" &&
      interactionCanvas.hasPointerCapture?.(event.pointerId)
    ) {
      try {
        interactionCanvas.releasePointerCapture(event.pointerId);
      } catch (releaseError) {
        // ignore release errors
      }
    }
  }

  if (drawingHandled) {
    scheduleDrawingRender();
  }

  scheduleOverlayRender();
}

function handleWheel(event) {
  event.preventDefault();
  const followActive = state.followMode && isAutoFollowEligible();
  const zoomIntensity = 1 + Math.min(Math.max(-event.deltaY * 0.0012, -0.35), 0.35);
  const nextScale = clamp(state.scale * zoomIntensity, 0.35, 6);
  if (Math.abs(nextScale - state.scale) <= 1e-6) {
    return;
  }

  const chartWidth = getDrawableChartWidth();
  const nextSpacing = getBarSpacingForScale(nextScale);

  if (followActive) {
    state.scale = nextScale;
    state.targetScale = nextScale;
    anchorViewportToLatest(chartWidth, nextSpacing);
    invalidateViewportCaches();
    state.hoveredEventId = null;
    scheduleRender();
    scheduleOverlayRender();
    return;
  }

  const leftMargin = state.margins.left;
  const oldSpacing = getBarSpacing();
  const rect = interactionCanvas.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const focusIndex = state.viewportIndex + (pointerX - leftMargin) / oldSpacing;
  let nextViewportIndex = focusIndex - (pointerX - leftMargin) / nextSpacing;
  const visibleCount = Math.max(1, Math.ceil(chartWidth / nextSpacing) + 3);
  const maxStart = getMaxViewportStart(visibleCount);
  nextViewportIndex = clamp(nextViewportIndex, 0, maxStart);

  state.scale = nextScale;
  state.targetScale = nextScale;
  state.viewportIndex = nextViewportIndex;
  state.targetViewportIndex = nextViewportIndex;
  invalidateViewportCaches();
  state.hoveredEventId = null;
  scheduleRender();
  scheduleOverlayRender();
}

function handleLeave(event) {
  const transform = frameState.transform;
  if (drawingManager && drawingManager.handlePointerUp({ transform })) {
    scheduleDrawingRender();
  }
  state.isDragging = false;
  state.crosshair.active = false;
  state.pointer = { ...state.pointer, inside: false };
  state.hoveredEventId = null;
  setCursor(getDefaultCursor());
  hideTooltip();

  if (supportsPointerEvents && event && typeof event.pointerId === "number") {
    if (
      typeof interactionCanvas.releasePointerCapture === "function" &&
      interactionCanvas.hasPointerCapture?.(event.pointerId)
    ) {
      try {
        interactionCanvas.releasePointerCapture(event.pointerId);
      } catch (releaseError) {
        // ignore release errors
      }
    }
  }

  scheduleOverlayRender();
}

function resetViewport(options = {}) {
  state.scale = 1.08;
  state.targetScale = 1.08;
  const width = canvas.clientWidth || canvasSize.width || 0;
  const height = canvas.clientHeight || canvasSize.height || 0;
  const areas = computeLayout(Math.max(1, width), Math.max(1, height));
  anchorViewportToLatest(areas?.chartWidth);
  invalidateViewportCaches();
  if (options.forceFollow && isAutoFollowEligible()) {
    state.userDisabledFollow = false;
    state.followMode = true;
  } else {
    syncFollowModeWithTimeframe();
  }
  updateFollowButtonState();
}

function handleDoubleClick(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  resetViewport({ forceFollow: true });
  scheduleRender();
}

function handleWindowResize() {
  if (state.ui.cinemaMode) {
    applyFullscreenResizeDimensions();
    invalidateViewportCaches();
    scheduleRender();
    scheduleOverlayRender();
    scheduleDrawingRender();
    DensityEngine.update();
    return;
  }
  if (!container) return;
  const rect = container.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dprChanged = refreshDevicePixelRatio();
  if (!resizeObserver || dprChanged) {
    resizeCanvases(rect.width, rect.height);
    invalidateViewportCaches();
    scheduleRender();
    DensityEngine.update();
  }
}

function init() {
  for (let i = 0; i < modeButtons.length; i += 1) {
    const button = modeButtons[i];
    button.addEventListener("click", () => {
      setChartMode(button.dataset.chartMode);
    });
  }
  updateModeButtons(chartModeState.target);

  for (let i = 0; i < complexityButtons.length; i += 1) {
    const button = complexityButtons[i];
    button.addEventListener("click", () => {
      applyVisualMode(button.dataset.visualMode);
    });
  }
  updateVisualModeButtons(complexityState.value);

  for (let i = 0; i < timeframeButtons.length; i += 1) {
    const button = timeframeButtons[i];
    button.addEventListener("click", () => {
      handleTimeframeSwitch(button.dataset.timeframe);
    });
  }
  updateTimeframeButtons(dataProvider.getCurrentTimeframe());

  if (container) {
    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || canvas.width;
    const height = rect.height || container.clientHeight || canvas.height;
    resizeCanvases(width, height);
    resizeObserver?.observe(container);
  } else {
    resizeCanvases(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);
  }

  window.addEventListener("resize", handleWindowResize);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.ui.cinemaMode) {
      exitCinemaMode();
    }
  });

  if (supportsPointerEvents) {
    interactionCanvas.addEventListener("pointerdown", handlePointerDown);
    interactionCanvas.addEventListener("pointermove", handlePointerMove);
    interactionCanvas.addEventListener("pointerup", handlePointerUp);
    interactionCanvas.addEventListener("pointerleave", handleLeave);
    interactionCanvas.addEventListener("pointercancel", handleLeave);
    window.addEventListener("pointerup", handlePointerUp);
  } else {
    interactionCanvas.addEventListener("mousedown", handlePointerDown);
    interactionCanvas.addEventListener("mousemove", handlePointerMove);
    interactionCanvas.addEventListener("mouseleave", handleLeave);
    window.addEventListener("mouseup", handlePointerUp);
  }
  interactionCanvas.addEventListener("wheel", handleWheel, { passive: false });
  interactionCanvas.addEventListener("dblclick", handleDoubleClick);

  if (followButton) {
    followButton.addEventListener("click", () => {
      restoreFollowMode({ anchor: true });
    });
  }

  setupDrawingToolbar();
  initializeHotkeys();

  if (toggleIndicatorsButton) {
    toggleIndicatorsButton.addEventListener("click", () => {
      if (window?.chartController?.toggleAllIndicators) {
        window.chartController.toggleAllIndicators();
      } else {
        toggleAllIndicators();
      }
    });
  }

  if (cinemaModeButton) {
    cinemaModeButton.addEventListener("click", () => {
      toggleCinemaMode();
    });
  }

  syncIndicatorVisibilityContext({ skipRender: true });
  updateIndicatorToggleLabel();
  updateCinemaButtonLabel();
  DensityEngine.update({ skipRender: true });

  setCursor(getDefaultCursor());
  updateFollowButtonState();
  scrollToEnd({ schedule: false });
  scheduleRender();
}

function handleDataEvent(event) {
  const isAppendEvent = event?.type === "append";
  const previousLength = isAppendEvent ? Math.max(0, candles.length - 1) : candles.length;
  const shouldStickToEnd = isAppendEvent && isAtEnd(1, previousLength);
  candles = dataProvider.getActiveSeries();
  eventMarkers = Array.isArray(event?.events) ? event.events : dataProvider.getEvents();
  rebuildPriceScale();
  invalidateViewportCaches();
  state.hoveredEventId = null;

  if (event?.type === "reset" || event?.type === "instrument") {
    state.timeframe = dataProvider.getCurrentTimeframe();
    updateTimeframeButtons(state.timeframe);
    resetViewport({ forceFollow: true });
    syncDrawingToolContext();
    syncIndicatorVisibilityContext({ skipRender: false });
  } else if (event?.type === "timeframe") {
    state.timeframe = event.timeframe || dataProvider.getCurrentTimeframe();
    applyTimeframeViewportAnchor(state.timeframe);
    syncDrawingToolContext();
    syncIndicatorVisibilityContext({ skipRender: false });
  } else {
    if (shouldStickToEnd) {
      scrollToEnd({ schedule: false });
    } else {
      maybeAutoFollowAfterData();
    }
  }

  scheduleRender();
}

dataProvider.subscribe(handleDataEvent);

const chartController = {
  setTimeframe(timeframe) {
    handleTimeframeSwitch(timeframe);
  },
  getTimeframe() {
    return dataProvider.getCurrentTimeframe();
  },
  getSupportedTimeframes() {
    return dataProvider.getSupportedTimeframes();
  },
  scrollToEnd() {
    scrollToEnd();
  },
  isAtEnd(tolerance) {
    return isAtEnd(typeof tolerance === "number" ? tolerance : 1);
  },
  updateWithNewCandle(candle) {
    updateWithNewCandle(candle);
  },
  getPanelVisibility() {
    return { ...state.panelVisibility };
  },
  setPanelVisibility(panelKey, visible = true) {
    setPanelVisibility(panelKey, visible);
  },
  togglePanel(panelKey) {
    togglePanelVisibility(panelKey);
  },
  setDrawingTool(toolType) {
    setActiveDrawingTool(toolType || "none");
  },
  clearDrawingTools() {
    clearAllDrawingTools();
  },
  deleteSelectedDrawingTool() {
    deleteSelectedTool();
  },
  duplicateSelectedDrawingTool() {
    duplicateSelectedTool();
  },
  getDrawingTools() {
    return getDrawingToolsSnapshot();
  },
  toggleAllIndicators() {
    toggleAllIndicators();
  },
  setIndicatorsVisibility(visible) {
    setIndicatorsVisibility(visible);
  },
  getIndicatorsVisibility() {
    return getIndicatorsVisibility();
  },
  toggleCinemaMode() {
    toggleCinemaMode();
  },
  enterCinemaMode() {
    enterCinemaMode();
  },
  exitCinemaMode() {
    exitCinemaMode();
  },
  isCinemaModeActive() {
    return !!state.ui.cinemaMode;
  },
  setDensity(value) {
    DensityEngine.setDensity(value);
  },
  updateDensity() {
    DensityEngine.update();
  },
  getDensity() {
    return DensityEngine.getDensity();
  },
  resize() {
    handleWindowResize();
  },
};

const upcomingSimulatorEvents = [
  {
    id: "evt-album",
    type: "album",
    magnitude: 0.85,
    timestamp: Date.now() + 30 * MINUTE_IN_MS,
  },
  {
    id: "evt-tour",
    type: "tour",
    magnitude: 0.55,
    timestamp: Date.now() + 6 * 60 * MINUTE_IN_MS,
  },
  {
    id: "evt-viral",
    type: "viral",
    magnitude: 0.75,
    timestamp: Date.now() + 12 * 60 * MINUTE_IN_MS,
  },
];

for (let i = 0; i < upcomingSimulatorEvents.length; i += 1) {
  musicSimulator.injectEvent(upcomingSimulatorEvents[i]);
}

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data || data.type !== "hearcap:layout-change") {
      return;
    }
    if (typeof data.density === "number" && Number.isFinite(data.density)) {
      chartController.setDensity(data.density);
    } else {
      chartController.updateDensity();
    }
    if (typeof chartController.resize === "function") {
      chartController.resize();
    } else {
      handleWindowResize();
    }
  });
}

init();

if (typeof window !== "undefined") {
  musicSimulator.start();
  window.chartController = chartController;
  window.musicSimulator = musicSimulator;
}

window.addEventListener("languagechange", () => {
  localeState.value = navigator.language || "pt-BR";
  formatterCache.clear();
  scheduleRender();
});
function applyFullscreenResizeDimensions() {
  const width = window.innerWidth || document.documentElement.clientWidth || canvas.clientWidth;
  const height = window.innerHeight || document.documentElement.clientHeight || canvas.clientHeight;
  resizeCanvases(width, height);
}

function applyContainerResizeDimensions() {
  if (container) {
    const rect = container.getBoundingClientRect();
    resizeCanvases(rect.width || container.clientWidth || canvas.width, rect.height || container.clientHeight || canvas.height);
  } else {
    resizeCanvases(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);
  }
}

function enterCinemaMode() {
  if (state.ui.cinemaMode) {
    return;
  }
  state.ui.cinemaMode = true;
  state.ui.previousPanelVisibility = { ...state.panelVisibility };
  setPanelVisibility("volume", false);
  setPanelVisibility("rsi", false);
  setPanelVisibility("macd", false);
  document.body?.classList.add("cinema-active");
  container?.classList.add("cinema-mode");
  if (drawingToolbarController) {
    drawingToolbarController.hide();
  }
  pendingToolbarUpdate = true;
  applyFullscreenResizeDimensions();
  invalidateViewportCaches();
  scheduleRender();
  scheduleOverlayRender();
  scheduleDrawingRender();
  updateCinemaButtonLabel();
}

function exitCinemaMode() {
  if (!state.ui.cinemaMode) {
    return;
  }
  state.ui.cinemaMode = false;
  document.body?.classList.remove("cinema-active");
  container?.classList.remove("cinema-mode");
  const snapshot = state.ui.previousPanelVisibility || {};
  if (snapshot.volume !== undefined) {
    setPanelVisibility("volume", snapshot.volume !== false);
  }
  if (snapshot.rsi !== undefined) {
    setPanelVisibility("rsi", snapshot.rsi !== false);
  }
  if (snapshot.macd !== undefined) {
    setPanelVisibility("macd", snapshot.macd !== false);
  }
  state.ui.previousPanelVisibility = null;
  pendingToolbarUpdate = true;
  applyContainerResizeDimensions();
  invalidateViewportCaches();
  scheduleRender();
  scheduleOverlayRender();
  scheduleDrawingRender();
  updateCinemaButtonLabel();
}

function toggleCinemaMode() {
  if (state.ui.cinemaMode) {
    exitCinemaMode();
  } else {
    enterCinemaMode();
  }
}
