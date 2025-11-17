import { generateRandomSeries } from "./data.js";
import { buildIndicatorRegistry } from "./indicators/index.js";

const DEFAULT_EVENT_POSITIONS = [0.12, 0.34, 0.58, 0.82];
const DEFAULT_EVENT_DESCRIPTORS = [
  {
    title: "Lançamento do single \"Neon Pulse\"",
    subtitle: "HearCap Records x Spotify Radar",
  },
  {
    title: "Show imersivo HearCap Sessions",
    subtitle: "Ao vivo no Auditório Ibirapuera",
  },
  {
    title: "Collab com DJ Solaris",
    subtitle: "Faixa exclusiva \"Aurora Switch\"",
  },
  {
    title: "50 milhões de streams",
    subtitle: "Marco global no Spotify",
  },
];

const MINUTE_IN_MS = 60 * 1000;

const TIMEFRAME_MINUTES = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

const DEFAULT_BASE_TIMEFRAME = "1m";

function normalizeTimeframe(value) {
  if (!value && value !== 0) {
    return "";
  }
  return String(value).trim().toLowerCase();
}

function timeframeToMinutes(timeframe) {
  const key = normalizeTimeframe(timeframe);
  return TIMEFRAME_MINUTES[key] || null;
}

function sortTimeframes(timeframes = [], baseTimeframe = DEFAULT_BASE_TIMEFRAME) {
  const seen = new Set();
  const normalized = [];
  const baseKey = normalizeTimeframe(baseTimeframe);

  for (let i = 0; i < timeframes.length; i += 1) {
    const key = normalizeTimeframe(timeframes[i]);
    if (!TIMEFRAME_MINUTES[key] || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(key);
  }

  if (!seen.has(baseKey) && TIMEFRAME_MINUTES[baseKey]) {
    normalized.push(baseKey);
    seen.add(baseKey);
  }

  normalized.sort((a, b) => TIMEFRAME_MINUTES[a] - TIMEFRAME_MINUTES[b]);
  return normalized;
}

function clampDecimals(value, max = 8) {
  if (!Number.isFinite(value)) return 0;
  const text = value.toString().toLowerCase();
  if (text.includes("e")) {
    const [base, exponent] = text.split("e");
    const baseDecimals = clampDecimals(Number(base), max);
    const exp = Number(exponent);
    return Math.max(0, Math.min(max, baseDecimals - exp));
  }
  const [, decimals = ""] = text.split(".");
  return Math.max(0, Math.min(max, decimals.length));
}

function clampIndex(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (min > max) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

function coerceString(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function inferPrecisionFromCandle(candle) {
  if (!candle) return 0;
  const values = [candle.open, candle.high, candle.low, candle.close];
  return values.reduce((acc, value) => Math.max(acc, clampDecimals(value)), 0);
}

function aggregateCandles(baseCandles, intervalMinutes) {
  if (!Array.isArray(baseCandles) || baseCandles.length === 0) {
    return [];
  }

  const stepMinutes = Math.max(1, Math.floor(intervalMinutes));
  const bucketSize = stepMinutes * MINUTE_IN_MS;
  const aggregated = [];

  let currentBucket = null;
  let target = null;

  for (let i = 0; i < baseCandles.length; i += 1) {
    const candle = baseCandles[i];
    if (!candle) continue;
    const time = Number(candle.time);
    if (!Number.isFinite(time)) {
      continue;
    }
    const bucket = Math.floor(time / bucketSize) * bucketSize;
    if (currentBucket === null || bucket !== currentBucket) {
      currentBucket = bucket;
      target = {
        time: bucket,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume ?? 0,
      };
      aggregated.push(target);
      continue;
    }

    target.high = Math.max(target.high, candle.high);
    target.low = Math.min(target.low, candle.low);
    target.close = candle.close;
    target.volume = (target.volume || 0) + (candle.volume || 0);
  }

  return aggregated;
}

export class DataProvider {
  constructor({
    symbol = "RNDUSD",
    baseTimeframe = DEFAULT_BASE_TIMEFRAME,
    supportedTimeframes = Object.keys(TIMEFRAME_MINUTES),
    initialSeries = null,
    events = [],
  } = {}) {
    this.symbol = symbol;
    this.baseTimeframe = TIMEFRAME_MINUTES[normalizeTimeframe(baseTimeframe)]
      ? normalizeTimeframe(baseTimeframe)
      : DEFAULT_BASE_TIMEFRAME;
    this.baseIntervalMinutes = timeframeToMinutes(this.baseTimeframe) || 1;
    this.supportedTimeframes = sortTimeframes(supportedTimeframes, this.baseTimeframe);
    this.baseSeries = Array.isArray(initialSeries)
      ? this._prepareBaseSeries(initialSeries)
      : [];
    this.derivedSeries = new Map();
    this.currentTimeframe = this.baseTimeframe;
    this.activeSeries = this.baseSeries;
    this.precision = 0;
    this.minMovement = 1;
    this.listeners = new Set();
    this.events = [];
    this.activeEvents = [];
    this.pendingEvents = Array.isArray(events) ? [...events] : [];
    this.indicatorDefinitions = buildIndicatorRegistry();
    this.indicatorLookup = new Map();
    for (let i = 0; i < this.indicatorDefinitions.length; i += 1) {
      const indicator = this.indicatorDefinitions[i];
      this.indicatorLookup.set(indicator.name, indicator);
    }
    this.indicatorCaches = new Map();
    this._resetIndicatorCaches();

    if (this.baseSeries.length) {
      this._normalizePrecision();
      this._computeIndicatorsForTimeframe(this.baseTimeframe, { force: true });
    }
  }

  async loadInitialSeries(loader) {
    let loaded = null;
    if (typeof loader === "function") {
      loaded = await loader();
    }

    if (!Array.isArray(loaded) || !loaded.length) {
      loaded = generateRandomSeries({
        intervalMinutes: this.baseIntervalMinutes,
      });
    }

    this.baseSeries = this._prepareBaseSeries(loaded);
    this.derivedSeries.clear();
    this.currentTimeframe = this.baseTimeframe;
    this.activeSeries = this.baseSeries;
    this._normalizePrecision();
    this._ensureEvents();
    this.buildAllTimeframes();
    this._resetIndicatorCaches();
    this._computeIndicatorsForTimeframe(this.baseTimeframe, { force: true });
    this._markIndicatorsDirtyForDerived();
    this._projectEventsToActive();
    this._emit({ type: "reset", timeframe: this.currentTimeframe });
    return this.baseSeries;
  }

  appendFromWebSocket(candle) {
    if (!candle) return this.baseSeries;

    this.baseSeries.push(candle);
    this._updatePrecisionFromCandle(candle);
    const dirtyDerived = this.updateDerivedOnAppend(candle);
    const baseStart = Math.max(0, this.baseSeries.length - 3);
    this._markIndicatorsDirty(this.baseTimeframe, baseStart);
    if (Array.isArray(dirtyDerived)) {
      for (let i = 0; i < dirtyDerived.length; i += 1) {
        const entry = dirtyDerived[i];
        if (!entry || !entry.timeframe) continue;
        const derivedStart = Number.isFinite(entry.startIndex) ? entry.startIndex : 0;
        this._markIndicatorsDirty(entry.timeframe, Math.max(0, derivedStart));
      }
    }
    this._computeIndicatorsForTimeframe(this.baseTimeframe);
    if (this.currentTimeframe !== this.baseTimeframe) {
      this._computeIndicatorsForTimeframe(this.currentTimeframe);
    }
    this._projectEventsToActive();
    this._emit({ type: "append", candle, timeframe: this.currentTimeframe });
    return this.getActiveSeries();
  }

  resample(timeframe) {
    const info = this._buildDerivedSeries(timeframe);
    return info.candles;
  }

  setTimeframe(timeframe) {
    const next = normalizeTimeframe(timeframe);
    if (!this.supportsTimeframe(next)) {
      return this.getActiveSeries();
    }

    if (next === this.currentTimeframe) {
      return this.getActiveSeries();
    }

    if (next === this.baseTimeframe) {
      this.activeSeries = this.baseSeries;
    } else {
      const info = this._buildDerivedSeries(next);
      this.activeSeries = info.candles;
    }

    this.currentTimeframe = next;
    this._computeIndicatorsForTimeframe(this.currentTimeframe, { force: true });
    this._projectEventsToActive();
    this._emit({ type: "timeframe", timeframe: this.currentTimeframe });
    return this.getActiveSeries();
  }

  getActiveSeries() {
    return this.activeSeries;
  }

  getSeries() {
    return this.getActiveSeries();
  }

  getBaseSeries() {
    return this.baseSeries;
  }

  getBaseTimeframe() {
    return this.baseTimeframe;
  }

  getBaseIntervalMinutes() {
    return this.baseIntervalMinutes;
  }

  getBaseIntervalMs() {
    return this.baseIntervalMinutes * MINUTE_IN_MS;
  }

  getMinMovement() {
    return this.minMovement;
  }

  getPrecision() {
    return this.precision;
  }

  getEvents() {
    return this.activeEvents;
  }

  getIndicator(name, timeframe = this.currentTimeframe) {
    if (!name) {
      return null;
    }
    this._computeIndicatorsForTimeframe(timeframe);
    const store = this.indicatorCaches.get(timeframe);
    return store?.get(name)?.data ?? null;
  }

  getIndicators(timeframe = this.currentTimeframe) {
    this._computeIndicatorsForTimeframe(timeframe);
    const store = this.indicatorCaches.get(timeframe);
    if (!store) {
      return [];
    }
    const result = [];
    for (let i = 0; i < this.indicatorDefinitions.length; i += 1) {
      const indicator = this.indicatorDefinitions[i];
      const entry = store.get(indicator.name);
      if (entry?.data) {
        result.push(entry.data);
      }
    }
    return result;
  }

  setEvents(nextEvents = []) {
    this.pendingEvents = [];
    this.events = this._mapEvents(nextEvents);
    this._projectEventsToActive();
    this._emit({ type: "events" });
    return this.activeEvents;
  }

  appendEvent(event) {
    const mapped = this._mapEvents([event]);
    if (!mapped.length) {
      return this.activeEvents;
    }

    this.events = [...this.events, ...mapped].sort((a, b) => a.time - b.time);
    this._projectEventsToActive();
    this._emit({ type: "event:append", event: mapped[0] });
    return this.activeEvents;
  }

  setInstrument(symbol, series = []) {
    this.symbol = symbol;
    this.baseSeries = this._prepareBaseSeries(series);
    this.derivedSeries.clear();
    this.currentTimeframe = this.baseTimeframe;
    this.activeSeries = this.baseSeries;
    this._normalizePrecision();
    this._ensureEvents();
    this.buildAllTimeframes();
    this._resetIndicatorCaches();
    this._computeIndicatorsForTimeframe(this.baseTimeframe, { force: true });
    this._markIndicatorsDirtyForDerived();
    this._projectEventsToActive();
    this._emit({ type: "instrument", symbol, timeframe: this.currentTimeframe });
    return this.getActiveSeries();
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  buildAllTimeframes(timeframes = this.supportedTimeframes) {
    if (!Array.isArray(timeframes)) {
      return this.derivedSeries;
    }
    for (let i = 0; i < timeframes.length; i += 1) {
      const tf = normalizeTimeframe(timeframes[i]);
      if (tf === this.baseTimeframe) {
        continue;
      }
      if (!this.supportsTimeframe(tf)) {
        continue;
      }
      this._buildDerivedSeries(tf);
    }
    return this.derivedSeries;
  }

  updateDerivedOnAppend(candle) {
    if (!candle) return [];
    const time = Number(candle.time);
    if (!Number.isFinite(time)) {
      return [];
    }

    const dirty = [];
    const entries = Array.from(this.derivedSeries.entries());
    for (let i = 0; i < entries.length; i += 1) {
      const [timeframe, info] = entries[i];
      if (!info || !info.candles) {
        continue;
      }
      const bucketSize = info.bucketSize;
      const bucket = Math.floor(time / bucketSize) * bucketSize;
      const series = info.candles;
      const last = series[series.length - 1];
      if (last && bucket === last.time) {
        last.high = Math.max(last.high, candle.high);
        last.low = Math.min(last.low, candle.low);
        last.close = candle.close;
        last.volume = (last.volume || 0) + (candle.volume || 0);
        info.lastBucketTime = last.time;
        dirty.push({ timeframe, startIndex: Math.max(0, series.length - 1) });
        continue;
      }

      if (last && bucket < last.time) {
        this._rebuildDerivedSeries(timeframe);
        dirty.push({ timeframe, startIndex: 0 });
        continue;
      }

      const next = {
        time: bucket,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume ?? 0,
      };
      series.push(next);
      info.lastBucketTime = bucket;
      dirty.push({ timeframe, startIndex: Math.max(0, series.length - 1) });
    }
    return dirty;
  }

  getSupportedTimeframes() {
    return [...this.supportedTimeframes];
  }

  getCurrentTimeframe() {
    return this.currentTimeframe;
  }

  getSymbol() {
    return this.symbol;
  }

  supportsTimeframe(timeframe) {
    const key = normalizeTimeframe(timeframe);
    return TIMEFRAME_MINUTES[key] !== undefined;
  }

  findIndexByTime(time, timeframe = this.currentTimeframe) {
    const series = this._getSeriesForTimeframe(timeframe);
    return this._findIndexForTime(Number(time), series);
  }

  _buildDerivedSeries(timeframe, force = false) {
    const key = normalizeTimeframe(timeframe);
    if (!this.supportsTimeframe(key) || key === this.baseTimeframe) {
      return {
        candles: this.baseSeries,
        intervalMinutes: this.baseIntervalMinutes,
        bucketSize: this.baseIntervalMinutes * MINUTE_IN_MS,
        lastBucketTime: this.baseSeries.length
          ? this.baseSeries[this.baseSeries.length - 1].time
          : null,
      };
    }

    const existing = this.derivedSeries.get(key);
    if (existing && !force) {
      return existing;
    }

    const minutes = timeframeToMinutes(key) || 1;
    const candles = aggregateCandles(this.baseSeries, minutes);
    const info = {
      candles,
      intervalMinutes: minutes,
      bucketSize: minutes * MINUTE_IN_MS,
      lastBucketTime: candles.length ? candles[candles.length - 1].time : null,
    };
    this.derivedSeries.set(key, info);
    this._markIndicatorsDirty(key, 0);
    return info;
  }

  _rebuildDerivedSeries(timeframe) {
    return this._buildDerivedSeries(timeframe, true);
  }

  _prepareBaseSeries(series) {
    const prepared = Array.isArray(series) ? [...series] : [];
    prepared.sort((a, b) => (a?.time ?? 0) - (b?.time ?? 0));
    return prepared;
  }

  _normalizePrecision() {
    this.precision = inferPrecisionFromCandle(this.baseSeries[0]);
    this.minMovement = this.precision > 0 ? 1 / 10 ** this.precision : 1;
  }

  _updatePrecisionFromCandle(candle) {
    const decimals = inferPrecisionFromCandle(candle);
    if (decimals > this.precision) {
      this.precision = decimals;
      this.minMovement = this.precision > 0 ? 1 / 10 ** this.precision : 1;
    }
  }

  _emit(event) {
    const payload = { ...event, events: this.activeEvents };
    this.listeners.forEach((listener) => listener(payload));
  }

  _ensureEvents() {
    if (!this.baseSeries.length) {
      this.events = [];
      this.activeEvents = [];
      return;
    }

    if (this.pendingEvents.length) {
      this.events = this._mapEvents(this.pendingEvents);
      this.pendingEvents = [];
    } else if (!this.events.length) {
      this.events = this._buildDefaultEvents();
    } else {
      this.events = this._mapEvents(this.events);
    }
  }

  _projectEventsToActive() {
    if (!this.events.length || !this.activeSeries.length) {
      this.activeEvents = [];
      return this.activeEvents;
    }

    const projected = [];
    for (let i = 0; i < this.events.length; i += 1) {
      const event = this.events[i];
      const index = this._findIndexForTime(event.time, this.activeSeries);
      if (index === -1) continue;
      projected.push({ ...event, index });
    }
    this.activeEvents = projected;
    return this.activeEvents;
  }

  _mapEvents(events = []) {
    if (!Array.isArray(events) || !events.length || !this.baseSeries.length) {
      return [];
    }

    const mapped = [];
    for (let i = 0; i < events.length; i += 1) {
      const entry = this._withIndex(events[i], `event-${i}`);
      if (entry) {
        mapped.push(entry);
      }
    }
    return mapped.sort((a, b) => a.time - b.time);
  }

  _buildDefaultEvents() {
    if (!this.baseSeries.length) {
      return [];
    }

    const lastIndex = this.baseSeries.length - 1;
    const defaults = [];
    for (let i = 0; i < DEFAULT_EVENT_DESCRIPTORS.length; i += 1) {
      const descriptor = DEFAULT_EVENT_DESCRIPTORS[i];
      const ratio =
        DEFAULT_EVENT_POSITIONS[i] ??
        DEFAULT_EVENT_POSITIONS[DEFAULT_EVENT_POSITIONS.length - 1];
      const targetIndex = clampIndex(lastIndex * ratio, 0, lastIndex);
      const candle = this.baseSeries[targetIndex];
      if (!candle) continue;
      defaults.push({
        id: `event-${i}`,
        title: descriptor.title,
        subtitle: descriptor.subtitle,
        time: candle.time,
        baseIndex: targetIndex,
      });
    }
    return defaults;
  }

  _withIndex(event, fallbackId = "event") {
    if (!event || !this.baseSeries.length) {
      return null;
    }

    const next = { ...event };
    const idSource = coerceString(next.id, fallbackId);
    const candidateTime = Number(next.time);
    let index = -1;
    let time = candidateTime;

    if (typeof next.index === "number" && Number.isFinite(next.index)) {
      index = clampIndex(next.index, 0, this.baseSeries.length - 1);
      time = this.baseSeries[index]?.time ?? time;
    } else if (Number.isFinite(candidateTime)) {
      index = this._findIndexForTime(candidateTime, this.baseSeries);
      if (index === -1) {
        return null;
      }
      time = this.baseSeries[index]?.time ?? candidateTime;
    } else {
      return null;
    }

    return {
      id: idSource || fallbackId,
      title: coerceString(next.title, "Evento HearCap"),
      subtitle: coerceString(next.subtitle, ""),
      time,
      baseIndex: index,
    };
  }

  _findIndexForTime(time, series = this.baseSeries) {
    if (!Array.isArray(series) || !series.length || !Number.isFinite(time)) {
      return -1;
    }

    let low = 0;
    let high = series.length - 1;
    let best = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const candle = series[mid];
      const value = candle?.time ?? 0;
      if (value === time) {
        return mid;
      }
      if (value < time) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const candidateHigh = clampIndex(low, 0, series.length - 1);
    const candidateLow = clampIndex(best, 0, series.length - 1);
    const diffLow = Math.abs((series[candidateLow]?.time ?? time) - time);
    const diffHigh = Math.abs((series[candidateHigh]?.time ?? time) - time);
    return diffLow <= diffHigh ? candidateLow : candidateHigh;
  }

  _getSeriesForTimeframe(timeframe) {
    const key = normalizeTimeframe(timeframe);
    if (key === this.baseTimeframe) {
      return this.baseSeries;
    }
    const info = this.derivedSeries.get(key);
    return info?.candles || [];
  }

  _resetIndicatorCaches() {
    if (this.indicatorCaches instanceof Map) {
      this.indicatorCaches.clear();
    } else {
      this.indicatorCaches = new Map();
    }
  }

  _getIndicatorStore(timeframe) {
    if (!timeframe) {
      return null;
    }
    let store = this.indicatorCaches.get(timeframe);
    if (!store) {
      store = new Map();
      this.indicatorCaches.set(timeframe, store);
    }
    return store;
  }

  _markIndicatorsDirty(timeframe, startIndex = 0, indicatorNames = null) {
    if (!timeframe || !this.indicatorDefinitions?.length) {
      return;
    }
    const store = this._getIndicatorStore(timeframe);
    if (!store) {
      return;
    }
    const targets =
      Array.isArray(indicatorNames) && indicatorNames.length
        ? indicatorNames
        : this.indicatorDefinitions.map((indicator) => indicator.name);
    const series = this._getSeriesForTimeframe(timeframe) || [];
    for (let i = 0; i < targets.length; i += 1) {
      const name = targets[i];
      if (!name) continue;
      let entry = store.get(name);
      if (!entry) {
        const indicator = this.indicatorLookup.get(name);
        const data = indicator?.createState ? indicator.createState(series.length) : {};
        entry = { data, dirtyIndex: 0 };
        store.set(name, entry);
      }
      const current = Number.isFinite(entry.dirtyIndex) ? entry.dirtyIndex : startIndex;
      entry.dirtyIndex = Math.min(current, startIndex);
    }
  }

  _markIndicatorsDirtyForDerived() {
    if (!this.derivedSeries?.size) {
      return;
    }
    const keys = Array.from(this.derivedSeries.keys());
    for (let i = 0; i < keys.length; i += 1) {
      this._markIndicatorsDirty(keys[i], 0);
    }
  }

  _computeIndicatorsForTimeframe(timeframe, { force = false } = {}) {
    if (!timeframe || !this.indicatorDefinitions?.length) {
      return null;
    }
    const series = this._getSeriesForTimeframe(timeframe);
    if (!Array.isArray(series)) {
      return null;
    }
    const store = this._getIndicatorStore(timeframe);
    if (!store) {
      return null;
    }
    for (let i = 0; i < this.indicatorDefinitions.length; i += 1) {
      const config = this.indicatorDefinitions[i];
      if (!config?.compute) continue;
      let entry = store.get(config.name);
      if (!entry || !entry.data || force) {
        const data = config.createState ? config.createState(series.length) : { values: [] };
        entry = { data, dirtyIndex: 0 };
        store.set(config.name, entry);
      }
      const startIndex = force
        ? 0
        : Math.max(0, Math.min(entry.dirtyIndex ?? 0, series.length));
      config.compute({
        series,
        state: entry.data,
        startIndex,
      });
      entry.dirtyIndex = series.length > 0 ? Math.max(series.length - 1, 0) : 0;
    }
    return store;
  }
}
