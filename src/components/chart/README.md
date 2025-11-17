# TradingView Pro Mode - HearCapTV

Componente avançado de gráfico usando TradingView Charting Library completa.

## Recursos

- ✅ Charting Library completa (não tv.js)
- ✅ Estudos técnicos (RSI, MACD, EMA, SMA, VWAP, Bollinger Bands)
- ✅ Desenhos (linhas, retângulos, Fibonacci)
- ✅ Timeframes intraday (1m, 3m, 5m, 15m, 30m, 1h)
- ✅ Volume overlay nativo
- ✅ Tema dark personalizado (estilo Binance)
- ✅ Botões custom (Buy/Sell)
- ✅ WebSocket em tempo real
- ✅ Atualização de candles parciais

## Uso

```tsx
import { HearCapTV } from './components/chart/HearCapTV';

<HearCapTV
  symbol="GNX"
  interval="1m"
  height={600}
  onBuyClick={() => console.log('Buy clicked')}
  onSellClick={() => console.log('Sell clicked')}
/>
```

## Variáveis de Ambiente

```env
VITE_TV_CHARTING_LIBRARY_SRC=/charting_library/charting_library.js
VITE_TV_DATAFEED_BUNDLE_SRC=/charting_library/datafeeds/udf/dist/bundle.js
VITE_TV_DATAFEED_URL=/api/tradingview
VITE_API_BASE=http://localhost:3000
VITE_WS_BASE=ws://localhost:3000
```

## Estrutura

- `HearCapTV.tsx` - Componente principal
- `src/lib/marketdata/candles.ts` - Helpers para candles
- `src/lib/ws/candles.ts` - WebSocket clients para candles

## Componentes Relacionados

- `src/components/dom/OrderBook.tsx` - Depth of Market (Módulo 2)
- `src/components/tape/TradeFeed.tsx` - Time & Sales (Módulo 3)

## WebSocket Integration

O componente conecta automaticamente aos streams:
- `ws://host/ws/market/candles?symbol=GNX&interval=1m`
- `ws://host/ws/market/trades?symbol=GNX`

Cada trade atualiza o candle atual em tempo real.

