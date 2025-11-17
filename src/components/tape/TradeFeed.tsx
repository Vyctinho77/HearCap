import { useEffect, useState, useRef, useCallback } from 'react';
import { TradesWSClient, TradeEvent, fetchRecentTrades } from '../../lib/ws/trades';

interface TradeFeedProps {
  symbol: string;
  maxItems?: number;
  autoScroll?: boolean;
}

interface DisplayTrade extends TradeEvent {
  displayTime: string;
  highlight: 'buy' | 'sell' | 'none';
}

export function TradeFeed({ symbol, maxItems = 200, autoScroll = true }: TradeFeedProps) {
  const [trades, setTrades] = useState<DisplayTrade[]>([]);
  const wsRef = useRef<TradesWSClient | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Formatar timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  // Adicionar trade ao feed
  const addTrade = useCallback(
    (trade: TradeEvent) => {
      setTrades((prev) => {
        const newTrade: DisplayTrade = {
          ...trade,
          displayTime: formatTime(trade.timestamp),
          highlight: trade.side === 'BUY' ? 'buy' : 'sell',
        };

        // Agrupar trades do mesmo milissegundo (opcional)
        const updated = [newTrade, ...prev];

        // Limitar tamanho
        if (updated.length > maxItems) {
          updated.splice(maxItems);
        }

        return updated;
      });
    },
    [maxItems]
  );

  // Carregar trades recentes
  useEffect(() => {
    fetchRecentTrades(symbol, maxItems)
      .then((recentTrades) => {
        const displayTrades: DisplayTrade[] = recentTrades
          .reverse()
          .map((trade) => ({
            ...trade,
            displayTime: formatTime(trade.timestamp),
            highlight: trade.side === 'BUY' ? 'buy' : 'sell',
          }));
        setTrades(displayTrades);
      })
      .catch((err) => console.error('[TradeFeed] Failed to fetch recent trades:', err));
  }, [symbol, maxItems]);

  // Conectar WebSocket
  useEffect(() => {
    wsRef.current = new TradesWSClient(symbol, addTrade);
    wsRef.current.connect();

    return () => {
      wsRef.current?.disconnect();
    };
  }, [symbol, addTrade]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [trades, autoScroll]);

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const formatQuantity = (qty: number) => {
    if (qty >= 1) return qty.toFixed(4);
    return qty.toFixed(6);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#050509',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
          Time & Sales
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {trades.length} trades
        </span>
      </div>

      {/* Column Headers */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          fontSize: 10,
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <span>Price</span>
        <span>Quantity</span>
        <span>Time</span>
      </div>

      {/* Trades List */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column-reverse',
        }}
      >
        {trades.map((trade, idx) => {
          const isBuy = trade.side === 'BUY';
          const bgColor = isBuy
            ? 'rgba(38, 166, 154, 0.05)'
            : 'rgba(239, 83, 80, 0.05)';
          const textColor = isBuy ? '#26a69a' : '#ef5350';

          return (
            <div
              key={`${trade.id}-${idx}`}
              style={{
                padding: '6px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                fontSize: 12,
                borderBottom: '1px solid rgba(255,255,255,0.02)',
                backgroundColor: bgColor,
                transition: 'background-color 0.3s ease',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <span
                style={{
                  color: textColor,
                  fontWeight: 500,
                  fontFamily: 'IBM Plex Sans, monospace',
                }}
              >
                {formatPrice(trade.price)}
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontFamily: 'IBM Plex Sans, monospace',
                }}
              >
                {formatQuantity(trade.quantity)}
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  fontFamily: 'IBM Plex Sans, monospace',
                }}
              >
                {trade.displayTime}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default TradeFeed;

