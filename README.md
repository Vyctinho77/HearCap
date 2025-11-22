# HearCap - Music Player & Trading Interface

Uma interface híbrida moderna que combina player de música e terminal de trading, construída com React, TypeScript e Vite.

## 🚀 Estrutura do Projeto

```
HearCap/
├── src/
│   ├── components/
│   │   ├── Layout/              # Layout principal (AppLayout)
│   │   ├── MainPanel/           # Painel central (Feed/Explore)
│   │   ├── Player/              # Player de música
│   │   ├── RightPanel/          # Ranking de ativos e Global
│   │   ├── Sidebar/             # Sidebar colapsável estilo Spotify
│   │   ├── Topbar/              # Barra superior
│   │   ├── Trading/             # Interface de Trading
│   │   │   ├── Layout/          # Componentes do layout de trading
│   │   │   ├── OrderBook/       # Livro de ofertas
│   │   │   ├── TradeForm/       # Formulário de trade
│   │   │   └── TradingLayout.tsx # Layout grid principal
│   │   ├── TickerPercentage.tsx # Componente de % em tempo real
│   │   └── TokenExplore.tsx     # Lista de ativos
│   ├── lib/
│   │   ├── marketdata/          # Clientes WebSocket e API
│   │   └── utils/               # Utilitários
│   ├── styles/
│   │   └── index.css            # Estilos globais e variáveis
│   ├── App.tsx                  # Componente raiz e gestão de estado
│   └── main.tsx                 # Ponto de entrada
├── public/
│   └── candles/                 # Motor gráfico proprietário
└── vite.config.ts
```

## 📦 Instalação

```bash
# Instalar dependências
npm install
```

## 🎯 Como Executar

```bash
# Modo desenvolvimento (abre automaticamente no navegador)
npm run dev

# Build para produção
npm run build
```

## 🎨 Funcionalidades

### 🎵 Music Player
- ✅ Player funcional com controles completos
- ✅ Barra de progresso e volume interativos
- ✅ Modos Shuffle e Repeat

### 📈 Trading Interface (Novo)
- ✅ **Layout Grid Responsivo**: Design profissional organizado em grid (Header, Chart, OrderBook, TradePanel).
- ✅ **Real-time Data**: Atualizações de preço e variação via WebSocket.
- ✅ **TickerPercentage**: Componente otimizado para exibir variações de preço em tempo real (Verde/Roxo).
- ✅ **OrderBook Visual**: Livro de ofertas estilizado com barras de profundidade.
- ✅ **Trade Panel**: Painel de negociação com slider de porcentagem e inputs validados.

### 🖥️ UI/UX Improvements
- ✅ **Sidebar Estilo Spotify**:
  - Colapso suave com animações `cubic-bezier`.
  - Largura dinâmica (72px a 420px).
  - Estado "ícone apenas" quando colapsado.
- ✅ **Visual Limpo**:
  - Remoção de sparklines (gráficos de linha) para reduzir ruído visual.
  - Foco em dados numéricos e percentuais em tempo real.
  - Esquema de cores consistente: **Elegant Green (#0ecb81)** para alta e **HearCap Purple (#C750FF)** para baixa.
- ✅ **Right Panel Otimizado**: Ranking de ativos simplificado e tabela Global focada em dados.

## 📊 Gráfico Proprietário (HearCap Candles)

O componente `HearCapCandles` usa um motor proprietário isolado:
- Integrado via `iframe` para performance e isolamento.
- Suporta ferramentas de desenho, múltiplos timeframes e indicadores.
- Localizado em `public/candles`.

## 💳 Integração Backend (Simulada)

O projeto está preparado para conectar com um backend real, mas funciona autonomamente:
- **Backend Check**: Verifica automaticamente se a API está disponível.
- **Mock Data**: Se o backend estiver offline, usa dados simulados para garantir que a UI continue funcional para desenvolvimento e demonstração.

## 📐 Layout Specs

Otimizado para **1920x1080 (Full HD)**:
- **Sidebar**: Flexível (280px - 420px)
- **Right Panel**: ~300px
- **Player**: 90px de altura fixa

## 🛠️ Tecnologias

- **React 18**
- **TypeScript**
- **Vite**
- **CSS Modules** (para componentes isolados)
- **Lucide React** (Ícones)

## 📝 Licença

Projeto pessoal - HearCap © 2025
