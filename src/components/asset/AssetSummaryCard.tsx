import { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, TrendingUp } from 'lucide-react';
import { fetchTicker, Ticker24h, TickerWSClient } from '../../lib/marketdata/ticker';
import { fetchRecentTrades, TradeEvent, TradesWSClient } from '../../lib/ws/trades';

interface AssetSummaryCardProps {
  symbol: string;
  onFollowChange?: (symbol: string, isFollowing: boolean) => void;
}

export function AssetSummaryCard({ symbol, onFollowChange }: AssetSummaryCardProps) {
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [recentTrades, setRecentTrades] = useState<TradeEvent[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFrenetic, setIsFrenetic] = useState(false);

  // Calcular se está "frenético" (muito volume por minuto)
  useEffect(() => {
    if (!ticker || recentTrades.length < 2) {
      setIsFrenetic(false);
      return;
    }

    // Calcular volume por minuto baseado nos trades recentes
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    const recentTradesInLastMinute = recentTrades.filter(
      (trade) => new Date(trade.timestamp).getTime() > oneMinuteAgo
    );

    if (recentTradesInLastMinute.length === 0) {
      setIsFrenetic(false);
      return;
    }

    const volumeInLastMinute = recentTradesInLastMinute.reduce(
      (sum, trade) => sum + trade.quantity,
      0
    );

    // Volume médio por minuto (24h)
    const avgVolumePerMinute = ticker.volume / (24 * 60);

    // Se o volume do último minuto for 1.5x maior que a média, está frenético
    setIsFrenetic(volumeInLastMinute > avgVolumePerMinute * 1.5);
  }, [ticker, recentTrades]);

  // Carregar ticker inicial
  useEffect(() => {
    fetchTicker(symbol)
      .then((data) => {
        if (data) {
          setTicker(data);
        }
      })
      .catch((err) => console.error('[AssetSummaryCard] Failed to fetch ticker:', err));
  }, [symbol]);

  // Carregar trades recentes
  useEffect(() => {
    fetchRecentTrades(symbol, 10)
      .then((trades) => {
        setRecentTrades(trades.slice(0, 10));
      })
      .catch((err) => console.error('[AssetSummaryCard] Failed to fetch trades:', err));
  }, [symbol]);

  // Conectar WebSocket para updates de ticker
  useEffect(() => {
    const tickerClient = new TickerWSClient(symbol, (updatedTicker) => {
      setTicker(updatedTicker);
    });
    tickerClient.connect();

    return () => {
      tickerClient.disconnect();
    };
  }, [symbol]);

  // Conectar WebSocket para updates de trades
  useEffect(() => {
    const tradesClient = new TradesWSClient(symbol, (trade: TradeEvent) => {
      setRecentTrades((prev) => {
        const updated = [trade, ...prev];
        return updated.slice(0, 10); // Manter apenas os 10 mais recentes
      });
    });
    tradesClient.connect();

    return () => {
      tradesClient.disconnect();
    };
  }, [symbol]);

  const handleFollowToggle = useCallback(() => {
    const newState = !isFollowing;
    setIsFollowing(newState);
    onFollowChange?.(symbol, newState);
  }, [isFollowing, symbol, onFollowChange]);

  // Se não tiver ticker, mostra dados mockados baseados no symbol
  const displayTicker = ticker || {
    symbol,
    lastPrice: 0,
    openPrice: 0,
    highPrice: 0,
    lowPrice: 0,
    volume: 0,
    quoteVolume: 0,
    trades: 0,
    priceChange: 0,
    priceChangePercent: 0,
    openTime: new Date().toISOString(),
    closeTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const isLoading = !ticker;
  const isPositive = !isLoading && displayTicker.priceChangePercent >= 0;
  const priceColor = isLoading ? 'rgba(255,255,255,0.5)' : isPositive ? '#26a69a' : '#ef5350';
  const changeColor = isLoading ? 'rgba(255,255,255,0.5)' : isPositive ? '#26a69a' : '#ef5350';

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
    if (volume >= 1_000) return `${(volume / 1_000).toFixed(2)}K`;
    return volume.toFixed(2);
  };

  const formatMarketCap = (price: number, supply: number) => {
    const cap = price * supply;
    if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`;
    if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`;
    return `$${cap.toFixed(2)}`;
  };

  return (
    <div
      style={{
        padding: 20,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header: Preço + Follow Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 42,
                fontWeight: 700,
                fontFamily: 'IBM Plex Sans, monospace',
                color: isLoading ? 'rgba(255,255,255,0.3)' : priceColor,
                lineHeight: 1,
              }}
            >
              {isLoading ? '--' : formatPrice(displayTicker.lastPrice)}
            </span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>USDT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isLoading ? (
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Carregando...</span>
            ) : (
              <>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: changeColor,
                    fontFamily: 'IBM Plex Sans, monospace',
                  }}
                >
                  {isPositive ? '+' : ''}
                  {displayTicker.priceChangePercent.toFixed(2)}%
                </span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                  {isPositive ? '+' : ''}
                  {formatPrice(displayTicker.priceChange)} USDT
                </span>
              </>
            )}
            {isFrenetic && (
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'rgba(239, 83, 80, 0.2)',
                  color: '#ef5350',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <TrendingUp size={12} />
                Frenético
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleFollowToggle}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: `1px solid ${isFollowing ? '#26a69a' : 'rgba(255,255,255,0.2)'}`,
            background: isFollowing ? 'rgba(38, 166, 154, 0.15)' : 'transparent',
            color: isFollowing ? '#26a69a' : 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isFollowing) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isFollowing) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }
          }}
        >
          {isFollowing ? <Bell size={16} /> : <BellOff size={16} />}
          {isFollowing ? 'Seguindo' : 'Seguir'}
        </button>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          padding: 12,
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 10,
        }}
      >
        {/* High 24h */}
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>High 24h</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: isLoading ? 'rgba(255,255,255,0.3)' : '#26a69a',
              fontFamily: 'IBM Plex Sans, monospace',
            }}
          >
            {isLoading ? '--' : formatPrice(displayTicker.highPrice)}
          </div>
        </div>

        {/* Low 24h */}
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Low 24h</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: isLoading ? 'rgba(255,255,255,0.3)' : '#ef5350',
              fontFamily: 'IBM Plex Sans, monospace',
            }}
          >
            {isLoading ? '--' : formatPrice(displayTicker.lowPrice)}
          </div>
        </div>

        {/* Volume 24h */}
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Volume 24h</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: isLoading ? 'rgba(255,255,255,0.3)' : '#fff',
              fontFamily: 'IBM Plex Sans, monospace',
            }}
          >
            {isLoading ? '--' : formatVolume(displayTicker.volume)}
          </div>
        </div>

        {/* Market Cap */}
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Market Cap</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: isLoading ? 'rgba(255,255,255,0.3)' : '#fff',
              fontFamily: 'IBM Plex Sans, monospace',
            }}
          >
            {isLoading ? '--' : formatMarketCap(displayTicker.lastPrice, 1000000)}
          </div>
        </div>

        {/* Spread */}
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Spread</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: isLoading ? 'rgba(255,255,255,0.3)' : '#fff',
              fontFamily: 'IBM Plex Sans, monospace',
            }}
          >
            {isLoading
              ? '--'
              : `${((displayTicker.highPrice - displayTicker.lowPrice) / (displayTicker.lastPrice || 1) * 100).toFixed(2)}%`}
          </div>
        </div>

        {/* Último Trade */}
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Último Trade</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: isLoading
                ? 'rgba(255,255,255,0.3)'
                : recentTrades[0]?.side === 'BUY'
                ? '#26a69a'
                : '#ef5350',
              fontFamily: 'IBM Plex Sans, monospace',
            }}
          >
            {isLoading ? '--' : recentTrades[0] ? formatPrice(recentTrades[0].price) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Trades Recentes Mini Table */}
      {recentTrades.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Trades Recentes
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 160,
              overflowY: 'auto',
            }}
          >
            {recentTrades.slice(0, 8).map((trade, idx) => {
              const isBuy = trade.side === 'BUY';
              return (
                <div
                  key={`${trade.id}-${idx}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    padding: '6px 10px',
                    background: isBuy ? 'rgba(38, 166, 154, 0.08)' : 'rgba(239, 83, 80, 0.08)',
                    borderRadius: 6,
                    fontSize: 11,
                    border: `1px solid ${isBuy ? 'rgba(38, 166, 154, 0.15)' : 'rgba(239, 83, 80, 0.15)'}`,
                  }}
                >
                  <span
                    style={{
                      color: isBuy ? '#26a69a' : '#ef5350',
                      fontWeight: 600,
                      fontFamily: 'IBM Plex Sans, monospace',
                    }}
                  >
                    {formatPrice(trade.price)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'IBM Plex Sans, monospace' }}>
                    {trade.quantity.toFixed(4)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'IBM Plex Sans, monospace' }}>
                    {new Date(trade.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetSummaryCard;

