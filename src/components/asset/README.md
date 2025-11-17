# Asset Summary Card (Módulo 5)

Painel de resumo do ativo estilo Binance com todas as métricas principais.

## Features

- ✅ Preço atual grande (42px, cor dinâmica verde/vermelho)
- ✅ Variação 24h (percentual + valor absoluto)
- ✅ High / Low 24h
- ✅ Volume 24h (formatado: K/M)
- ✅ Market Cap (calculado)
- ✅ Spread (percentual)
- ✅ Último preço negociado
- ✅ Tabelinha "trades recentes" mini (8 trades)
- ✅ Tudo live via WebSocket
- ✅ Botão "Follow Asset" (Seguir/Seguindo)
- ✅ Indicador "Frenético" (volume por minuto > 1.5x média)

## Uso

```tsx
import { AssetSummaryCard } from './components/asset/AssetSummaryCard';

<AssetSummaryCard
  symbol="GNX"
  onFollowChange={(symbol, isFollowing) => {
    console.log(`${symbol} follow: ${isFollowing}`);
  }}
/>
```

## Props

- `symbol`: Símbolo do ativo (ex: "GNX")
- `onFollowChange`: Callback quando o botão Follow é clicado

## WebSocket

Conecta automaticamente a:
- `ws://host/ws/market/ticker?symbol=GNX` - Updates de ticker
- `ws://host/ws/market/trades?symbol=GNX` - Updates de trades

## Indicador "Frenético"

O indicador aparece quando:
- Volume negociado no último minuto > 1.5x do volume médio por minuto (24h)
- Calculado em tempo real baseado nos trades recebidos via WebSocket

## Layout

```
┌─────────────────────────────────────┐
│  Preço Grande  [Follow Button]      │
│  Variação 24h  [Frenético?]         │
├─────────────────────────────────────┤
│  High 24h  |  Low 24h  |  Volume   │
│  Market Cap |  Spread  |  Last     │
├─────────────────────────────────────┤
│  Trades Recentes (8 últimos)        │
│  [Price] [Qty] [Time]               │
└─────────────────────────────────────┘
```


