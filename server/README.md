## HearCap Invest — Backend (Fases 1 + 2)

### Stack
- Go 1.22
- Fiber v2
- Postgres + GORM
- Redis (opcional para cache de preços, previsto para fases futuras)
- Cron (`@every 1h`) para geração de preços e candles

### Estrutura
```
server/
├─ cmd/api            # ponto de entrada
├─ internal/config    # variáveis de ambiente
├─ internal/database  # conexão + migrations
├─ internal/models    # tabelas essenciais (artists, tokens, prices, candles, playlists)
├─ internal/services  # popularidade, preços, supply e engines
├─ internal/engine    # orderbook, matching engine e market maker
├─ internal/tasks     # scheduler cron
└─ internal/http      # handlers e rotas Fiber
```

### Setup rápido
1. `cp env.example .env`
2. Ajuste `DATABASE_URL`
3. `go run ./cmd/api`

### Rotina de preços
1. Calcula um `popularityScore` sintético (20–120)
2. Atualiza supply elástico `base + popularity * 100`
3. Calcula preço `base + (popularity * 0.1) + volatility`
4. Persiste snapshot em `prices` + candle OHLC em `candles`

### Endpoints
- `GET /api/ping` - healthcheck simples
- `GET /api/market/candles?symbol=GNX&interval=1m&limit=500` - candles OHLCV
- `GET /api/market/ticker24h?symbol=GNX` - ticker 24h do ativo escolhido ou de todos
- `GET /api/market/orderbook?symbol=GNX` - snapshot do book
- `GET /api/market/trades/recent?symbol=GNX&limit=100` - últimos trades para o ativo

### Próximos passos
- Expor endpoints de consulta (`/tokens`, `/artists`, `/candles`) para UI interna
- Adicionar Redis para cache de preços em tempo real
- Incluir autenticação e rotas de wallets/transactions na fase 2/3

### Orderbook / Matching Engine
- O pacote `internal/engine` provê:
  - Modelos de ordem, enums e trades (`types.go`);
  - Order book com depth/preço-tempo (`order_book.go`);
  - Interfaces para persistência/saldo/eventos (`interfaces.go`);
  - `MatchingEngine` com suporte a LIMIT/MARKET/STOP, FIFO e execução parcial (`matching_engine.go`);
  - `MarketMaker` para seeds de liquidez (`market_maker.go`).
- Para usar:
  1. Implemente `Repository`, `BalanceService` e `EventBus` (ex.: Postgres + WalletService + WebSocket).
  2. Crie uma instância `engine.NewMatchingEngine(repo, balances, events)` no bootstrap.
  3. Chame `PlaceOrder` nas rotas REST/WS e publique `GetOrderBookSnapshot` conforme necessário.
  4. Gatilhos de preços externos chamam `TriggerStops(symbol, lastPrice)` para ordens STOP.
  5. Opcional: inicialize `NewMarketMaker` para cada token que precise de spread controlado.

### Clearing & Settlement
- `clearing_models.go` e `clearing_engine.go` agrupam posições T+1, batches e liquidação off/on-chain.
- Apresente implementações de `ClearingRepository`, `CustodyService` e `BlockchainService` para plugar Postgres, ledger interno e Solana.
- Fluxo típico:
  1. MatchingEngine gera `Trade` → chame `ClearingEngine.OnTrade(trade, buyerID, sellerID)`.
  2. Programe `RunTPlusOneSettle` (cron) para efetivar posições e publicar eventos.
  3. Ative `EnableInstantChain` para liquidação imediata (`SettleInstantOnChain`).

### Governance & Corporate Actions
- `listing_models.go`, `listing_engine.go`: critérios, IPO musical, auditoria, votos do comitê e ativação de mercado.
- Interfaces (`ArtistMetricsService`, `ListingRepository`, `GovernanceNotificationService`, `CommitteeDirectory`, `CommitteeVoteRepository`, `MarketRegistry`) permitem integrar métricas reais, notificações e cadastro de mercados.
- `corporate_actions.go`: agendamento de dividendos/splits/rights e processamento record/payment date com `CorporateActionRepository` e `HolderPositionService`.
- Use essas engines para expor fluxos REST/WS (submissão de listagem, votos, corporate actions) e conectar com Solana conforme o roadmap.

### Dark Pools & ATS
- `darkpool_models.go` e `darkpool_engine.go` suportam ambientes privados para blocos grandes, ordens confidenciais e block trades.
- Interfaces (`DarkPoolRepository`, `ReferencePriceService`, `DarkPoolReportingService`) permitem plugar armazenamento, precificação (midpoint/NBBO) e transparência pós-trade.
- `DarkPoolEngine` cuida de:
  1. Criação de pools broker-owned/exchange-owned com regras de preço.
  2. Recebimento de ordens privadas com min block size.
  3. Matching e geração de `BlockTrade`, encaminhando para o `ClearingEngine`.
  4. Reporting tardio (`RunPostTradeReporting`) e agregação de volume para fins regulatórios (`AggregateAndPublishVolumes`).

### Risk, Margin & Circuit Breakers
- `risk_models.go` define posições, contas de margem, config de risco e status de mercado.
- Novas interfaces (`PositionRepository`, `MarginRepository`, `PriceFeed`, `RiskNotificationService`, `MarketStatusRepository`, `RiskEventRepository`) permitem integrar com banco, feeds e alertas.
- `circuit_breaker.go` implementa o halt/resume automático por símbolo; basta chamar `CanTrade` antes de aceitar a ordem e `OnTradeTick` a cada execução.
- `risk_engine.go` fornece validação pré-ordem (price bands, notional, margem) e pós-trade (atualiza posição, recalcula margem, gera alertas).
- Integre chamando:
  1. `RiskEngine.ValidateNewOrder` e `CircuitBreaker.CanTrade` no começo de `PlaceOrder`.
  2. `RiskEngine.OnTrade` e `CircuitBreaker.OnTradeTick` em cada trade (lit ou dark pool).

### Wallet & Custódia (Fase 6)
- `wallet_models.go` descreve assets, contas, saldos, ledger entries e requests de depósito/saque.
- Interfaces (`AssetRepository`, `WalletRepository`, `LedgerRepository`, `DepositRepository`, `WithdrawalRepository`) permitem plugar Postgres ou outro storage.
- `wallet_engine.go` centraliza créditos/débitos, lock/unlock, ledger e o ciclo depósito → confirmação → saque.
- `wallet_balance_service.go` implementa `BalanceService` usando a wallet (locks para ordens).
- `wallet_custody_service.go` implementa `CustodyService` para T+1, reaproveitando a mesma infraestrutura.
- Basta mapear `marketBase/marketQuote` para cada par e plugar o `WalletEngine` onde o Matching/Clearing espera um `BalanceService`/`CustodyService`. Solana pode ser adicionada futuramente chamando `ConfirmDeposit` / `CompleteWithdrawal` com `txHash` e usando `BlockchainService`.

### Market Data Engine (Fase 7)
- `market_data_models.go` define `TradeEvent`, candles multi-intervalo e `Ticker24h`.
- Novas interfaces (`CandleRepository`, `TradeHistoryRepository`, `TickerRepository`, `MarketDataPublisher`) permitem persistir histórico e publicar feeds (REST/WS/Kafka).
- `market_data_engine.go`:
  1. Recebe `TradeEvent` de mercados lit (`MatchingEngine`) e dark pool (`DarkPoolEngine`).
  2. Atualiza candles configurados (1m/5m/1h/1d etc.), ticker rolling 24h e histórico de trades.
  3. Publica eventos (ticker, trade, candle, snapshot de book) via `MarketDataPublisher`.
  4. Mantém cache in-memory de tickers e order books expostos por getters (`GetTicker`, `ListTickers`, `GetOrderBook`, `GetCandles`, `GetRecentTrades`).
- **Integração completa**: `MatchingEngine` e `DarkPoolEngine` já estão integrados automaticamente:
  - `MatchingEngine` chama `OnTradeEvent` após cada trade lit e `OnOrderBookSnapshot` quando o book é atualizado.
  - `DarkPoolEngine` chama `OnTradeEvent` após cada block trade.
  - Use `NewNoOpMarketDataPublisher()` como stub ou implemente `MarketDataPublisher` para WebSocket/Kafka/Redis pub-sub.
  - Exponha endpoints REST/WS usando os getters do `MarketDataEngine` (`/api/markets/:symbol/ticker`, `/api/markets/:symbol/candles`, etc.).

### Market Data API/WS Público (Fase 8)
- **REST Endpoints** (`internal/http/handlers/market_data.go`):
  - `GET /api/market/candles?symbol=GNX&interval=1m&limit=500` — candles OHLCV
  - `GET /api/market/ticker24h?symbol=GNX` — ticker 24h (ou todos se não passar symbol)
  - `GET /api/market/orderbook?symbol=GNX&level=50` — snapshot do order book
  - `GET /api/market/trades/recent?symbol=GNX&limit=100` — trades recentes
- **WebSocket Streams** (`internal/http/handlers/market_data_ws.go`):
  - `ws://host/ws/market/trades?symbol=GNX` — stream de trades em tempo real
  - `ws://host/ws/market/book?symbol=GNX` — stream de order book (snapshots)
  - `ws://host/ws/market/ticker?symbol=GNX` — stream de ticker 24h
  - `ws://host/ws/market/candles?symbol=GNX&interval=1m` — stream de candles
- **Repositórios GORM** (`internal/services/market_data_repo.go`):
  - `GORMCandleRepository` — persiste candles OHLCV em `market_data_candles`
  - `GORMTradeHistoryRepository` — persiste trade events em `market_data_trade_events`
  - `GORMTickerRepository` — persiste tickers 24h em `market_data_ticker24h`
  - Modelos GORM em `internal/models/market_data.go` com conversores `ToEngine()`/`FromEngine()`
- **Integração automática**: `WSPublisher` (`ws_publisher.go`) implementa `MarketDataPublisher` e faz broadcast automático para todos os clientes WebSocket conectados quando eventos são publicados pelo `MarketDataEngine`.
- **Bootstrap**: Veja `cmd/api/bootstrap_example.go` para exemplo completo de como integrar tudo (repositórios, engine, handlers REST/WS, publisher).
- **Uso**: Registre `MarketDataHandler` e `MarketDataWSHandler` nas rotas (`routes.go`). Os streams WebSocket enviam dados em formato JSON: `{"stream": "trades", "data": {...}}`.
