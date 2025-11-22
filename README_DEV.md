# README_DEV – Diagnóstico da Trading UI

## Componentes principais da tela
- `src/pages/TradingPage.tsx`: resolve o `symbol` via `react-router-dom` e delega tudo para `TradingLayout`, exibindo apenas um fallback estático quando o parâmetro está ausente.  
- `src/components/trading/TradingLayout.tsx`: componente monolítico com `grid` inline (`gridTemplateColumns: 48px minmax(600px,1fr) 318px 299px`) que empilha **Header**, **Toolbar**, **Chart**, **OrderBook**, **Trade Panel** e **Bottom Panel** usando `gridTemplateAreas`. É o melhor ponto único para injetar o novo `.trading-container`.  
- `src/components/chart/HearCapCandles.tsx`: iframe que carrega `/candles/embed-trading.html`, registra o frame em `layoutState`/`chartMessenger` e reage a `symbol`, `interval` e demais query params; precisa se manter montado para evitar reload do chart a cada re-render.  
- `src/components/trading/OrderBook/OrderBook.tsx`, `TradeForm/TradeForm.tsx` e `BottomPanel/OrderManagement.tsx`: blocos já desenhados (mock data + Tailwind) mas ainda não conectados ao `TradingLayout`; servirão para os novos painéis OrderBook/RecentTrades/OrderForm/Positions assim que o grid modular existir.  
- `src/components/trading/Layout/*` (MarketHeader, MainArea, ToolBar, TradePanel, BottomPanel): wrappers utilitários que já encapsulam colunas/linhas do grid e estados de layout (`standard | focus | theatre | compact`), porém ainda não foram importados em lugar nenhum.  
- Dependências auxiliares prontas: `components/tape/TradeFeed.tsx` (feed de trades), `components/dom/OrderBook.tsx` (versão WebSocket real) e tokens em `src/tokens/*` para padronizar cores e espaçamentos.

## Onde encaixar o novo grid de 3 colunas
1. **Root**: substituir o objeto `style` do `div` raiz em `TradingLayout` por uma classe (`.trading-container`) definida em CSS/Tailwind. Essa classe deve expor `display: grid`, `grid-template-columns: auto minmax(640px,1fr) 360px` (desktop) e `grid-template-rows: 64px minmax(420px,1fr) auto`.  
2. **Áreas**: manter os `gridArea`s já existentes (`header`, `toolbar`, `chart`, `orderbook`, `trade`, `bottom`) e introduzir novas áreas para `TickerBar`, `RecentTrades` e `PositionsPanel` quando partirmos para três colunas “principais” (ex.: `header` span 3 colunas, `chart` coluna central, `orderbook` + `recentTrades` na coluna direita, `orderForm` podendo ser drawer no mobile).  
3. **Breakpoints**: aproveitar `MainArea`/`TradePanel` para esconder colunas conforme o `layoutMode` (ex.: `compact` ativa drawer lateral). Podemos mapear:  
   - `>=1440px`: 3 colunas (toolbar fixa + chart + coluna direita).  
   - `1024–1439px`: toolbar recolhida, coluna direita reduzida para 300px.  
   - `<=1023px`: grid colapsa para 2 colunas e o `OrderForm` vira painel deslizante (já há `onToggleTradeDrawer` em `MarketHeader`).  
4. **Chart slot**: `HearCapCandles` já aceita `className="w-full h-full"`; basta garantir que o wrapper use `min-width/height: 0` para permitir FPS estável.  
5. **CSS source**: preferir um módulo (`TradingLayout.module.css`) ou Tailwind (`grid grid-cols-trading`) para evitar reinterpretação inline a cada render e permitir animações/responsividade global.

## Dependências críticas e fluxos atuais
- **Roteamento**: `react-router-dom` (`useParams`) determina o `symbol` dinâmico da página.  
- **Chart**: `HearCapCandles` conversa com o embed via `postMessage` usando `layoutState`/`chartMessenger`; qualquer mudança de layout deve chamar `layoutState.syncFrame(...)` para sincronizar densidade e view (`catalog` x `asset-open`).  
- **Dados mock**: `src/data/mockData.ts` abastece OrderBook/Trades/Orders até que o WS real (`src/lib/ws/orderbook.ts`) seja plugado.  
- **Design tokens**: `colors` e `spacing` centralizam a paleta atual; Tailwind está configurado (`tailwind.config.js`) com cores `trade-*` e uma `grid-cols-trading`.  
- **Ícones/UI**: `lucide-react` é usado em `MarketHeader`; qualquer novo Header deve reutilizar os mesmos assets para manter consistência.  
- **Future hooks**: `components/dom/OrderBook.tsx` já embute `OrderBookWSClient`, `fetchOrderBookSnapshot` e `groupOrderBookLevels`; ao migrar para dados reais, basta trocar o mock por esse componente.

## Gargalos visíveis na Fase 0
- `OrderBook/OrderBook.tsx` recria o `setInterval` toda vez que `bids`/`asks` mudam (dependência do `useEffect`), causando pulos e vazamentos; o timer deveria rodar uma única vez com `useRef`/`useMemo`.  
- O mock OrderBook gera novos arrays com `Math.random()` a cada segundo, forçando re-render completo da lista sem `key`s estáveis → baixa previsibilidade de FPS.  
- O container principal é estilizado com um objeto inline gigantesco, o que impede uso de media queries e reaproveitamento de layout; além disso, toda renderização recria funções/arrays (`map`) usados pelo layout.  
- `OrderManagement` e futuros painéis usam tabelas/feeds sem virtualização; ao trocar mock por dados reais será necessário memoizar e paginar para não travar o thread principal.  
- O iframe do chart é reinstanciado sempre que `embedSrc` muda; evitar alterar `symbol`/`interval` sem necessidade para não reiniciar o motor de candles (e manter `HearCapCandles` isolado dentro do grid modular).

## Checklist/manual sugerido nesta fase
1. Abrir `/trading/:symbol` em modo dev com mocks e validar que o iframe do chart sobe em <200 ms (DevTools Performance).  
2. Monitorar o thread principal ao alternar tabs do `OrderBook` e slider do `TradeForm` para garantir ausência de travadas (>1 s).  
3. Reduzir a viewport para 1366 px e 1024 px verificando se as colunas permanecem utilizáveis (hoje o grid quebra por causa de larguras fixas).  
4. Validar que o carregamento inicial não bloqueia a UI (sem tarefas longas no waterfall da aba Performance/Network).  
5. Garantir que o `layoutState` continue sincronizando o iframe após o refactor (escutar o evento `hearcap:view-change` no console enquanto alterna modos).

