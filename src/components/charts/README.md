# Sparkline Component

Mini-gráficos ultra leves estilo Binance para listagens de ativos.

## Features

- ✅ Gráfico SVG ultra leve (sem TradingView)
- ✅ 40-50 pontos de dados
- ✅ Atualização real-time via ticker 24h
- ✅ Cor dinâmica baseada no último preço (verde/vermelho)
- ✅ Gradiente opcional
- ✅ Suporte a dados de candles ou ticker
- ✅ WebSocket para updates em tempo real

## Uso

```tsx
import { Sparkline } from './components/charts/Sparkline';

// Versão com WebSocket (real-time)
<Sparkline symbol="GNX" width={120} height={40} realtime={true} />

// Versão estática (sem WebSocket)
<Sparkline symbol="GNX" width={120} height={40} realtime={false} />
```

## Props

- `symbol`: Símbolo do ativo (ex: "GNX")
- `width`: Largura do gráfico em pixels (default: 120)
- `height`: Altura do gráfico em pixels (default: 40)
- `strokeWidth`: Espessura da linha (default: 1.5)
- `showGradient`: Mostrar área com gradiente (default: true)
- `realtime`: Ativar atualização via WebSocket (default: true)

## Exemplo em Listagem

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
  <span>{symbol}</span>
  <span>{price} USDT</span>
  <Sparkline symbol={symbol} width={100} height={30} />
  <span style={{ color: change >= 0 ? '#26a69a' : '#ef5350' }}>
    {change}%
  </span>
</div>
```

## Dados

O componente tenta buscar dados na seguinte ordem:
1. **Candles** (50 últimas horas) - mais preciso
2. **Ticker 24h** - fallback se candles não disponíveis

Quando `realtime={true}`, conecta ao WebSocket `/ws/market/ticker` para updates contínuos.

## Performance

- SVG nativo (sem dependências pesadas)
- Apenas 50 pontos de dados
- Renderização otimizada
- Ideal para listagens com muitos ativos


