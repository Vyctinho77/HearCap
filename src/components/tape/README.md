# Trade Feed (Time & Sales) Component

Componente de tape de trades estilo Binance.

## Features

- ✅ Highlight verde/vermelho por direção (BUY/SELL)
- ✅ Agrupamento por milissegundo
- ✅ Feed contínuo via WebSocket
- ✅ Limite de itens configurável (200-500)
- ✅ Rolagem automática
- ✅ Timestamp com milissegundos
- ✅ Formatação de preços e quantidades

## Uso

```tsx
import { TradeFeed } from './components/tape/TradeFeed';

<TradeFeed
  symbol="GNX"
  maxItems={200}
  autoScroll={true}
/>
```

## Props

- `symbol`: Símbolo do ativo (ex: "GNX")
- `maxItems`: Número máximo de trades no buffer (default: 200)
- `autoScroll`: Auto-scroll para o topo quando novo trade chega (default: true)

## WebSocket

Conecta automaticamente a `ws://host/ws/market/trades?symbol=GNX`

## Formato

Cada linha mostra:
- **Price**: Preço do trade (verde para BUY, vermelho para SELL)
- **Quantity**: Quantidade negociada
- **Time**: Timestamp com milissegundos (HH:MM:SS.mmm)


