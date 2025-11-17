# HearCap - Music Player UI/UX

Uma interface moderna de player de música construída com React, TypeScript e Vite.

## 🚀 Estrutura do Projeto

```
HearCap/
├── src/
│   ├── components/
│   │   ├── LayoutCanvas.tsx      # Componente principal
│   │   ├── SearchIcon.tsx        # Ícone de busca
│   │   ├── SvgIcon.tsx          # Ícone SVG customizado
│   │   ├── SidebarLibraryHeader.tsx  # Cabeçalho da sidebar
│   │   └── PlaylistStrip.tsx     # Item de playlist
│   ├── styles/
│   │   └── index.css            # Estilos globais
│   ├── App.tsx                  # Componente raiz
│   └── main.tsx                 # Ponto de entrada
├── index.html
├── package.json
├── tsconfig.json
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

# Preview do build de produção
npm run preview
```

## 🎨 Funcionalidades

- ✅ Player de música funcional
- ✅ Sidebar recolhível com animações suaves
- ✅ Controles de reprodução (play, pause, próximo, anterior)
- ✅ Controle de volume interativo
- ✅ Barra de progresso animada
- ✅ Shuffle e repeat modes
- ✅ Painel de ativos em tempo real (TOP 4 + Global)
- ✅ **Otimizado para 1920x1080** (Full HD)

## 📊 Integração com TradingView

O componente `HearCapChart` funciona em dois modos:

- **Mock rápido (tv.js)**: usa o widget público do TradingView para validar layout imediato.
- **Modo profissional (Charting Library + backend UDF)**: conecta diretamente no backend Go (`/api/tradingview/*`) usando `UDFCompatibleDatafeed`.

### Variáveis de ambiente (frontend)

Crie ou ajuste `.env` na raiz com as entradas abaixo (todas opcionais):

```
VITE_TV_DATAFEED_URL=/api/tradingview
VITE_TV_CHARTING_LIBRARY_SRC=/charting_library/charting_library.js
VITE_TV_DATAFEED_BUNDLE_SRC=/charting_library/datafeeds/udf/dist/bundle.js
VITE_TV_FALLBACK_SYMBOL=BINANCE:BTCUSDT
```

- Se `VITE_TV_CHARTING_LIBRARY_SRC` **não** estiver definido → o componente carrega apenas `tv.js` e usa `VITE_TV_FALLBACK_SYMBOL` para exibir um gráfico mock.
- Se `VITE_TV_CHARTING_LIBRARY_SRC` **estiver** definido → os scripts privados são carregados e, se `window.Datafeeds` existir, o gráfico passa a usar o seu backend Go em tempo real.

### Como usar a Charting Library

1. Solicite o pacote oficial ao TradingView e extraia a pasta `charting_library/` inteira para `public/`.
2. Certifique-se de que os caminhos dos scripts batem com as variáveis acima.
3. Configure o proxy do Vite (ou NEXT_PUBLIC) para que `/api` aponte para o backend Go (porta 8080 por padrão).
4. Execute o frontend: quando a biblioteca privada estiver disponível, o gráfico consumirá:
   - `GET /api/tradingview/config`
   - `GET /api/tradingview/time`
   - `GET /api/tradingview/symbols`
   - `GET /api/tradingview/history`

### Fluxo de desenvolvimento recomendado

1. **Fase de layout**: deixe apenas o `tv.js` e veja o gráfico com `BINANCE:BTCUSDT` (ou qualquer fallback).
2. **Fase de integração**: copie a Charting Library para `public/`, ajuste as envs e verifique no console se `window.Datafeeds` existe.
3. **Valide o backend**: monitore a aba Network do navegador — você deve ver as chamadas ` /api/tradingview/*` respondendo com os dados gerados pelo seu backend Go.

## 💳 Engine Custodial no Frontend

- Defina `VITE_MOCK_USER_ID` no `.env` do projeto para apontar para um usuário mockado (UUID seedado via backend).
- O frontend expõe `src/lib/api/trades.ts` e o hook `src/hooks/useWallet.ts`, que:
  - carregam `GET /api/wallets/:userID`;
  - executam `POST /api/trades/{buy|sell}` atualizando a carteira em memória e exibindo feedback.
- O painel de ativo (`TokenExplore`) já inclui o componente `AssetTradePanel`, ou seja:
  - os botões “Comprar / Vender” chamam o backend Go real;
  - os saldos de USDT/token são exibidos e atualizados a cada trade;
  - o novo preço retornado pelo backend atualiza o card imediatamente.

> Esse fluxo mantém o “ledger interno” em Go, pronto para mais tarde sincronizar com Solana sem refatorar o front.

## 📐 Layout

Aplicação web otimizada para resolução **1920 × 1080**:

### Dimensões dos Cards:

- 📦 **Cards Laterais:** 346px × 911px
- 📦 **Card Central:** 1098px × 911px
- 📏 **Gap entre cards:** 14px
- 🔍 **Search Bar:** 600px × 50px
- 🎵 **Player Footer:** 95% × 90px

> Veja mais detalhes em `ESPECIFICACOES_LAYOUT.md`

## 🛠️ Tecnologias

- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **Lucide React** - Ícones
- **Montserrat** - Fonte

## 📝 Licença

Projeto pessoal - HearCap © 2025

