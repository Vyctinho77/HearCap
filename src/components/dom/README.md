# Order Book (DOM) Component

Componente de Depth of Market estilo Binance.

## Features

- ✅ Bids (verde) e Asks (vermelho)
- ✅ Heatmap de volumes grandes
- ✅ Animação quando quantidade muda
- ✅ Últimas 25-50 linhas configuráveis
- ✅ Agrupamento por tick size (0.01, 0.1, 1.0)
- ✅ Spread exibido
- ✅ Preço central destacado
- ✅ Auto-scroll opcional
- ✅ WebSocket em tempo real

## Uso

```tsx
import { OrderBook } from './components/dom/OrderBook';

<OrderBook
  symbol="GNX"
  maxRows={25}
  tickSize={0.01}
  showSpread={true}
  autoScroll={false}
/>
```

## Props

- `symbol`: Símbolo do ativo (ex: "GNX")
- `maxRows`: Número máximo de linhas por lado (default: 25)
- `tickSize`: Tamanho do tick para agrupamento (default: 0.01)
- `showSpread`: Mostrar spread no header (default: true)
- `autoScroll`: Auto-scroll quando atualiza (default: false)

## WebSocket

Conecta automaticamente a `ws://host/ws/market/book?symbol=GNX`


