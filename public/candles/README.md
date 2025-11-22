# HearCap Candles

## Advanced Candle Chart Engine for Music, Cultural Assets, and Dynamic Markets

HearCap Candles is the official charting engine for the HearCap platform, engineered to deliver professional-grade financial visualization applied to musical and cultural assets. Built entirely from the ground up—with zero external charting dependencies—it combines low-level performance, high-fidelity design, and feature parity with industry-leading trading platforms.

## Overview

This project was conceived with a clear objective: to bring robust, intuitive, and fluid charting capabilities to the music market, serving both novice users and experienced traders. HearCap Candles bridges the gap between institutional-quality visualization and accessibility, creating a new paradigm for asset trading in the cultural sector.

## Core Architecture

### Dual-Layer Canvas Rendering

The engine implements a sophisticated dual-layer architecture using HTML5 Canvas:

- **Base Layer**: Handles candles, volume bars, technical indicators, and static elements
- **Overlay Layer**: Manages crosshair, tooltips, live candle animations, and user interactions

This separation ensures optimal rendering performance and enables independent update cycles for interactive elements.

### Zero-Dependency Implementation

The entire charting engine is implemented in vanilla JavaScript, including:

- Custom rendering pipeline with requestAnimationFrame scheduling
- Interpolated easing for smooth viewport transitions
- Dynamic layout scaling and responsive geometry calculations
- Intelligent caching for themes, formatters, and geometric computations

### Modular Data Provider

The DataProvider architecture supports:

- Symbol switching without full reinitialization
- Real-time data ingestion via WebSocket-compatible interface
- Automatic minMovement normalization for price precision
- Multi-timeframe resampling (1m, 5m, 15m, 1h, 4h, 1d)
- Event marker projection across aggregated timeframes

## Performance Optimizations

### Intelligent Caching System

- **Intl.DateTimeFormat**: Locale-aware date/time formatters with cache invalidation
- **getComputedStyle**: Theme property caching with mutation observer integration
- **Layout Geometry**: Cached viewport calculations with dependency tracking
- **Viewport Metadata**: Precomputed visible candle ranges and coordinate mappings

### Responsive Architecture

- **ResizeObserver Integration**: Automatic adaptation to flex grids, expandable columns, and mobile rotation
- **Device Pixel Ratio Handling**: High-DPI display support with automatic scaling
- **Viewport Clamping**: Prevents overscroll and maintains valid coordinate ranges

### Batch Rendering

- Candles grouped by state (bullish/bearish) for reduced GPU state changes
- Zero-clone architecture using direct references
- Optimized draw calls with minimal context switching

## Key Features

### Pan and Zoom with Smooth Interpolation

The engine utilizes linear interpolation and pixel-based clamping to deliver:

- Fluid zoom operations with anchor point preservation
- Jitter-free panning with momentum handling
- Perfect anchoring to the latest candle (TradingView-style behavior)
- Complete elimination of overscroll artifacts

### Live Candle Animation

Real-time candle updates feature:

- Breathing effect (pulsing animation)
- Dynamic HearCap-branded glow
- Subtle OHLC transitions synchronized with data updates
- Smooth value interpolation for price movements

### Display Modes

- **Basic Mode**: Streamlined interface for beginners with essential features only
- **Advanced Mode**: Full professional feature set activated
- **Chart Types**: Candles, Line, and Area visualization modes

### Advanced Drawing Tools & Floating Toolbar

- Trendline PRO, Fibonacci Retracement PRO, horizontal/vertical lines, and rectangular zones
- Persistent storage per symbol/timeframe with auto-restore after reloads
- Floating smart toolbar with contextual controls (line width, style, color, toggles)
- Independent drawing layer for zero-impact rendering and tool-specific hit-tests

### Cinema Mode & Indicator Toggling

- One-click Cinema Mode that expands the chart to fullscreen and hides surrounding UI
- Global “Hide Indicators” toggle (overlays + panels) with per-context persistence
- Layout recalculation without recomputing series data; immediate restore on exit
- Toolbar de desenho se adapta automaticamente (oculta em cinema mode)

### Global Keyboard Shortcuts

- Navegação: setas ←/→ para pan, ↑/↓ para zoom vertical, Shift+scroll para zoom horizontal
- Ferramentas: T/F/H/V/R ativam ferramentas PRO, ESC cancela seleção
- Ações rápidas: Delete/D para apagar/duplicar, C para cinema, I para indicadores, M para modo visual
- Timeframes 1–6 (1m–1d) + integração futura com undo/redo stack

### Technical Indicators (Phase 3)

Professional-grade indicators with independent rendering:

- **EMA**: 9, 21, 50, 200 period exponential moving averages
- **Bollinger Bands**: Standard deviation-based volatility bands
- **RSI**: Relative Strength Index with dedicated scale panel
- **MACD**: Histogram with signal and MACD lines

All indicators render in adjustable panels with independent scaling.

### Event Markers (HearCap Sessions)

Native support for marking:

- Music releases and album launches
- Exclusive session announcements
- Artist announcements and collaborations
- Price and volume events

Markers project correctly across all timeframes and maintain visual consistency.

## Technical Specifications

### Rendering Performance

- **Target Frame Rate**: 60 FPS sustained with thousands of candles
- **Memory Efficiency**: Zero-clone architecture with direct references
- **GPU Utilization**: Optimized batch rendering with minimal state changes
- **Responsive Behavior**: Real-time adaptation to container resizing

### Precision and Accuracy

- Pixel-perfect rendering with sub-pixel positioning
- High-precision price calculations with configurable decimal places
- Time-based coordinate snapping for consistent candle alignment
- Independent overlay pipeline for interaction elements

### Integration Capabilities

- WebSocket-ready data ingestion interface
- Real-time quote streaming support
- Modular indicator engine for extensibility
- Event-driven architecture for external system integration

## Technology Stack

### Core Technologies

- **HTML5 Canvas**: Dual-layer rendering architecture
- **JavaScript (ES6+)**: Vanilla implementation with modern language features
- **CSS Custom Properties**: Dynamic theming system
- **Web APIs**: ResizeObserver, MutationObserver, Intl APIs

### Architecture Patterns

- **Modular Data Provider**: Separation of data management and visualization
- **State Management**: Centralized viewport and interaction state
- **Caching Strategy**: Multi-level cache invalidation with dependency tracking
- **Event System**: Publisher-subscriber pattern for data updates

## Visual Identity

The charting engine adheres to the HearCap platform visual system:

- **Primary Color**: HearCap purple as the dominant brand color
- **Bullish Indicators**: Soft green tones for positive price movements
- **Bearish Indicators**: Intense lilac for negative price movements
- **Dynamic Gradients**: Overlay effects with musical wave aesthetics
- **Typography**: Clean, professional font system optimized for readability

This design philosophy makes the chart intuitive even for users who have never encountered candlestick charts before.

## Why HearCap Candles Exists

HearCap aims to create a new type of market: an exchange focused on artists, where fans can invest in a simple, visual, and accessible manner. However, no existing charting solution combined:

- Institutional quality (TradingView-level features)
- Beginner-friendly simplicity
- Musical aesthetic integration
- Extreme performance with large data volumes

HearCap Candles was born to address this gap: a proprietary engine designed to be fast, beautiful, and integrable with high-load financial systems.

## Project Structure

```
Clandles/
├── index.html          # Main application entry point
├── styles.css          # Visual styling and theme definitions
├── src/
│   ├── main.js                    # Core charting engine
│   ├── data-provider.js           # Data management and timeframe handling
│   ├── music-market-simulator.js  # Real-time data simulation
│   └── data.js                    # Data generation utilities
├── LICENSE             # Project license
└── NOTICE             # Attribution and notices
```

## Browser Compatibility

- **Chrome/Edge**: Full feature support (recommended)
- **Firefox**: Full feature support
- **Safari**: Full feature support (iOS 12+)
- **Mobile Browsers**: Optimized touch interactions

## Performance Benchmarks

- **Initial Load**: < 100ms for 1000 candles
- **Frame Rate**: 60 FPS sustained with 5000+ candles
- **Memory Usage**: < 50MB for typical session
- **Interaction Latency**: < 16ms for pan/zoom operations

## License

See LICENSE file for details.

## Attribution

See NOTICE file for third-party attributions and acknowledgments.


