const MINUTE_IN_MS = 60 * 1000;

const DEFAULT_CONFIG = {
  artistId: "hearcap-artist",
  symbol: "HRCP",
  basePrice: 120,
  volatility: 0.45,
  trendBias: 0.08,
  liquidity: 0.7,
  eventImpact: 0.6,
  mode: "calm",
};

const MODE_PRESETS = {
  calm: {
    volatilityMultiplier: 0.55,
    meanReversion: 0.045,
    baseDrift: 0.04,
    eventImpactMultiplier: 0.5,
    eventDecayMs: 48 * MINUTE_IN_MS * 60,
    volumeBase: 620,
  },
  volatile: {
    volatilityMultiplier: 1.2,
    meanReversion: 0.025,
    baseDrift: 0.07,
    eventImpactMultiplier: 1.35,
    eventDecayMs: 24 * MINUTE_IN_MS * 60,
    volumeBase: 940,
  },
  stable: {
    volatilityMultiplier: 0.4,
    meanReversion: 0.06,
    baseDrift: 0.025,
    eventImpactMultiplier: 0.4,
    eventDecayMs: 72 * MINUTE_IN_MS * 60,
    volumeBase: 800,
  },
};

const EVENT_EFFECTS = {
  album: { drift: 1.1, volatility: 0.6, volume: 0.9 },
  single: { drift: 0.8, volatility: 0.5, volume: 0.6 },
  tour: { drift: 0.7, volatility: 0.7, volume: 1.2 },
  festival: { drift: 0.9, volatility: 0.9, volume: 1.4 },
  collab: { drift: 0.85, volatility: 0.55, volume: 0.8 },
  viral: { drift: 1.2, volatility: 1.1, volume: 1.5 },
  default: { drift: 0.6, volatility: 0.5, volume: 0.7 },
};

const EVENT_LABELS = {
  album: {
    title: "Álbum lançado",
    subtitle: "Estreia no catálogo HearCap",
  },
  single: {
    title: "Single inédito",
    subtitle: "Nova faixa nas plataformas",
  },
  tour: {
    title: "Nova turnê anunciada",
    subtitle: "Ingressos esgotando",
  },
  festival: {
    title: "Headliner em festival",
    subtitle: "Show principal confirmado",
  },
  collab: {
    title: "Colaboração surpresa",
    subtitle: "Feat especial com artista convidado",
  },
  viral: {
    title: "Trending viral",
    subtitle: "Explosão nas redes sociais",
  },
};

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function createSeededRandom(seed = Date.now()) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return result;
  };
}

function createNormalSampler(random) {
  let spare = null;
  return function normal() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = random();
    while (v === 0) v = random();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    const z0 = mag * Math.cos(2.0 * Math.PI * v);
    const z1 = mag * Math.sin(2.0 * Math.PI * v);
    spare = z1;
    return z0;
  };
}

function coerceEvent(event) {
  if (!event) return null;
  const type = typeof event.type === "string" ? event.type : "default";
  const normalizedType = EVENT_EFFECTS[type] ? type : "default";
  const magnitude = clamp(Number(event.magnitude) || 0, 0, 1);
  const baseTime = Number(event.timestamp);
  const timestamp = Number.isFinite(baseTime) ? baseTime : Date.now();
  const direction = event.direction === "down" ? -1 : 1;
  return {
    id: event.id || `evt-${Math.random().toString(36).slice(2)}`,
    type: normalizedType,
    magnitude,
    timestamp,
    direction,
  };
}

export class MusicMarketSimulator {
  constructor(config = {}, dataProvider, { seed, initialPeriods = 720, startTime } = {}) {
    if (!dataProvider) {
      throw new Error("MusicMarketSimulator requires a DataProvider instance");
    }

    const merged = { ...DEFAULT_CONFIG, ...config };
    this.config = merged;
    this.dataProvider = dataProvider;
    this.baseIntervalMs =
      typeof dataProvider.getBaseIntervalMinutes === "function"
        ? dataProvider.getBaseIntervalMinutes() * MINUTE_IN_MS
        : MINUTE_IN_MS;

    this.random = createSeededRandom(seed ?? Date.now());
    this.normal = createNormalSampler(this.random);

    this.speedMultiplier = 1;
    this.running = false;
    this.rafId = null;
    this.intervalId = null;
    this.accumulator = 0;
    this.lastFrameTime = null;

    this.state = {
      lastPrice: merged.basePrice,
      fairValue: merged.basePrice,
      lastTime: startTime ? Number(startTime) : null,
    };

    this.pendingEvents = [];
    this.activeImpulses = [];
    this.eventHistory = [];

    this.params = this._computeModeParameters();

    if (initialPeriods && initialPeriods > 0) {
      const historical = this.generateInitialHistory({
        periods: initialPeriods,
        endTime:
          this.state.lastTime && Number.isFinite(this.state.lastTime)
            ? this.state.lastTime
            : Date.now(),
      });
      if (Array.isArray(historical) && historical.length) {
        this.dataProvider.setInstrument(this.config.symbol, historical);
        this.dataProvider.setEvents([]);
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = this._now();
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      const loop = (timestamp) => {
        if (!this.running) return;
        const now = typeof timestamp === "number" ? timestamp : this._now();
        const dt = now - (this.lastFrameTime ?? now);
        this.lastFrameTime = now;
        this.tick(dt);
        this.rafId = window.requestAnimationFrame(loop);
      };
      this.rafId = window.requestAnimationFrame(loop);
    } else {
      this.intervalId = setInterval(() => {
        const now = this._now();
        const dt = now - (this.lastFrameTime ?? now);
        this.lastFrameTime = now;
        this.tick(dt);
      }, 16);
    }
  }

  stop() {
    this.running = false;
    if (this.rafId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.rafId);
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    this.rafId = null;
    this.intervalId = null;
    this.lastFrameTime = null;
  }

  tick(dtMs = this.baseIntervalMs) {
    if (!Number.isFinite(dtMs) || dtMs <= 0) {
      dtMs = this.baseIntervalMs;
    }

    const scaled = dtMs * this.speedMultiplier;
    this.accumulator += scaled;
    const step = this.baseIntervalMs;
    while (this.accumulator >= step) {
      this.accumulator -= step;
      this._advanceOneInterval();
    }
  }

  setSpeed(multiplier = 1) {
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return;
    }
    this.speedMultiplier = multiplier;
  }

  injectEvent(event) {
    const normalized = coerceEvent(event);
    if (!normalized) return null;
    const scheduled = {
      ...normalized,
      timestamp: this._snapToInterval(normalized.timestamp),
    };
    this._insertEvent(scheduled);
    return scheduled;
  }

  generateInitialHistory({ periods = 720, endTime = Date.now(), events = [] } = {}) {
    const total = Math.max(1, Math.floor(periods));
    const step = this.baseIntervalMs;
    const startTime = this._snapToInterval(endTime - (total - 1) * step);

    this.state.lastPrice = this.config.basePrice;
    this.state.fairValue = this.config.basePrice;
    this.state.lastTime = startTime - step;
    this.accumulator = 0;
    this.pendingEvents = [];
    this.activeImpulses = [];
    this.eventHistory = [];

    if (Array.isArray(events) && events.length) {
      for (let i = 0; i < events.length; i += 1) {
        const entry = coerceEvent(events[i]);
        if (!entry) continue;
        this._insertEvent({ ...entry, timestamp: this._snapToInterval(entry.timestamp) });
      }
    }

    const candles = [];
    for (let i = 0; i < total; i += 1) {
      const targetTime = startTime + i * step;
      this._activateScheduledEvents(targetTime, false);
      const candle = this._produceCandle(targetTime, { emit: false });
      candles.push(candle);
    }

    return candles;
  }

  getArtistId() {
    return this.config.artistId;
  }

  getSymbol() {
    return this.config.symbol;
  }

  _advanceOneInterval() {
    const step = this.baseIntervalMs;
    const lastTime = Number.isFinite(this.state.lastTime)
      ? this.state.lastTime
      : this._snapToInterval(Date.now());
    const targetTime = lastTime + step;
    this._activateScheduledEvents(targetTime, true);
    this._produceCandle(targetTime, { emit: true });
  }

  _produceCandle(time, { emit } = { emit: true }) {
    const open = this.state.lastPrice;
    const effect = this._computeEventEffect(time);
    const liquidity = clamp(this.config.liquidity, 0, 1);
    const liquidityFactor = lerp(1.25, 0.4, liquidity);
    const shock = this.normal() * this.params.volatility * liquidityFactor * (1 + effect.volatilityBoost);
    const drift = this.config.trendBias * this.params.baseDrift + effect.driftBoost;
    const revert = (this.state.fairValue - open) * this.params.meanReversion;
    let close = open + shock + drift + revert;
    if (!Number.isFinite(close) || close <= 0) {
      close = Math.max(0.01, open * 0.995);
    }

    const high = Math.max(open, close) + Math.abs(shock) * (0.6 + effect.volatilityBoost * 0.8);
    const low = Math.min(open, close) - Math.abs(shock) * (0.6 + effect.volatilityBoost * 0.6);
    const baseVolume = this.params.volumeBase * (1 + (1 - liquidity) * 0.5);
    const volumeNoise = Math.abs(this.normal()) * baseVolume * 0.35;
    const volume = Math.max(50, baseVolume + volumeNoise + effect.volumeBoost * baseVolume);

    const candle = {
      time,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume,
    };

    this.state.lastPrice = close;
    this.state.lastTime = time;
    this.state.fairValue = lerp(this.state.fairValue, close, 0.08);

    if (emit) {
      this.dataProvider.appendFromWebSocket(candle);
    }

    return candle;
  }

  _computeModeParameters() {
    const preset = MODE_PRESETS[this.config.mode] || MODE_PRESETS.calm;
    const volatility = Math.max(0.01, this.config.volatility) * preset.volatilityMultiplier;
    const eventImpact = Math.max(0, this.config.eventImpact) * preset.eventImpactMultiplier;
    return {
      volatility,
      meanReversion: preset.meanReversion,
      baseDrift: preset.baseDrift,
      eventImpact,
      eventDecayMs: preset.eventDecayMs,
      volumeBase: preset.volumeBase,
    };
  }

  _insertEvent(event) {
    if (!event) return;
    const queue = this.pendingEvents;
    let inserted = false;
    for (let i = 0; i < queue.length; i += 1) {
      if (event.timestamp < queue[i].timestamp) {
        queue.splice(i, 0, event);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      queue.push(event);
    }
  }

  _activateScheduledEvents(targetTime, emitMarker) {
    if (!this.pendingEvents.length) return;
    const threshold = targetTime + 1;
    while (this.pendingEvents.length && this.pendingEvents[0].timestamp <= threshold) {
      const event = this.pendingEvents.shift();
      const effect = EVENT_EFFECTS[event.type] || EVENT_EFFECTS.default;
      const impulse = {
        id: event.id,
        type: event.type,
        startTime: targetTime,
        magnitude: event.magnitude,
        direction: event.direction,
        driftStrength: effect.drift * this.params.eventImpact,
        volatilityStrength: effect.volatility * this.params.eventImpact,
        volumeStrength: effect.volume * this.params.eventImpact,
        decayMs: this.params.eventDecayMs,
      };
      this.activeImpulses.push(impulse);
      this.eventHistory.push({ ...event, time: targetTime });
      if (emitMarker) {
        this._emitMarker(event, targetTime);
      }
    }
  }

  _computeEventEffect(now) {
    if (!this.activeImpulses.length) {
      return { driftBoost: 0, volatilityBoost: 0, volumeBoost: 0 };
    }

    const active = [];
    let driftBoost = 0;
    let volatilityBoost = 0;
    let volumeBoost = 0;
    for (let i = 0; i < this.activeImpulses.length; i += 1) {
      const impulse = this.activeImpulses[i];
      const elapsed = now - impulse.startTime;
      if (elapsed < 0) {
        active.push(impulse);
        continue;
      }
      const decay = Math.exp(-elapsed / Math.max(impulse.decayMs, MINUTE_IN_MS));
      if (decay < 0.01) {
        continue;
      }
      driftBoost += impulse.driftStrength * impulse.direction * impulse.magnitude * decay;
      volatilityBoost += impulse.volatilityStrength * impulse.magnitude * decay * 0.01;
      volumeBoost += impulse.volumeStrength * impulse.magnitude * decay * 0.5;
      active.push(impulse);
    }
    this.activeImpulses = active;
    return { driftBoost, volatilityBoost, volumeBoost };
  }

  _emitMarker(event, time) {
    if (typeof this.dataProvider.appendEvent !== "function") {
      return;
    }
    const labels = EVENT_LABELS[event.type] || EVENT_LABELS.album;
    this.dataProvider.appendEvent({
      id: event.id,
      title: labels.title,
      subtitle: labels.subtitle,
      time,
    });
  }

  _snapToInterval(timestamp) {
    if (!Number.isFinite(timestamp)) return Date.now();
    const bucket = Math.floor(timestamp / this.baseIntervalMs);
    return bucket * this.baseIntervalMs;
  }

  _now() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }
}
