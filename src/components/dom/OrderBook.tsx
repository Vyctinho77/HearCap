import { useEffect, useState, useRef, useMemo } from 'react';
import { OrderBookWSClient, OrderBookSnapshot, OrderBookLevel, fetchOrderBookSnapshot, groupOrderBookLevels } from '../../lib/ws/orderbook';

interface OrderBookProps {
  symbol: string;
  maxRows?: number;
  tickSize?: number;
  showSpread?: boolean;
  autoScroll?: boolean;
}

export function OrderBook({
  symbol,
  maxRows = 25,
  tickSize = 0.01,
  showSpread = true,
  autoScroll = false,
}: OrderBookProps) {
  const [snapshot, setSnapshot] = useState<OrderBookSnapshot | null>(null);
  const [spread, setSpread] = useState<{ value: number; percent: number } | null>(null);
  const wsRef = useRef<OrderBookWSClient | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevBidsRef = useRef<Map<number, { price: number; quantity: number }>>(new Map());
  const prevAsksRef = useRef<Map<number, { price: number; quantity: number }>>(new Map());

  // Agrupar e limitar níveis
  const processedData = useMemo(() => {
    if (!snapshot) return { bids: [], asks: [] };

    const groupedBids = groupOrderBookLevels(snapshot.bids, tickSize)
      .slice(0, maxRows)
      .reverse();
    const groupedAsks = groupOrderBookLevels(snapshot.asks, tickSize)
      .slice(0, maxRows);

    return { bids: groupedBids, asks: groupedAsks };
  }, [snapshot, tickSize, maxRows]);

  // Calcular spread
  useEffect(() => {
    if (processedData.bids.length > 0 && processedData.asks.length > 0) {
      const bestBid = processedData.bids[0].price;
      const bestAsk = processedData.asks[0].price;
      const spreadValue = bestAsk - bestBid;
      const spreadPercent = (spreadValue / bestAsk) * 100;
      setSpread({ value: spreadValue, percent: spreadPercent });
    }
  }, [processedData]);

  // Carregar snapshot inicial
  useEffect(() => {
    fetchOrderBookSnapshot(symbol, 50)
      .then(setSnapshot)
      .catch((err) => console.error('[OrderBook] Failed to fetch snapshot:', err));
  }, [symbol]);

  // Conectar WebSocket
  useEffect(() => {
    wsRef.current = new OrderBookWSClient(symbol, (newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    wsRef.current.connect();

    return () => {
      wsRef.current?.disconnect();
    };
  }, [symbol]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [processedData, autoScroll]);

  // Calcular largura da barra de volume (heatmap)
  const getVolumeWidth = (quantity: number, maxQuantity: number) => {
    if (maxQuantity === 0) return 0;
    return Math.min((quantity / maxQuantity) * 100, 100);
  };

  const maxBidQty = Math.max(...processedData.bids.map((b) => b.quantity), 0);
  const maxAskQty = Math.max(...processedData.asks.map((a) => a.quantity), 0);
  const maxQty = Math.max(maxBidQty, maxAskQty);

  // Detectar mudanças de quantidade para animação
  const getQuantityChange = (level: OrderBookLevel, side: 'bid' | 'ask') => {
    const prevMap = side === 'bid' ? prevBidsRef.current : prevAsksRef.current;
    const prev = prevMap.get(level.price);
    if (prev === undefined) {
      prevMap.set(level.price, { price: level.price, quantity: level.quantity });
      return 'new';
    }
    if (prev.quantity !== level.quantity) {
      const change = level.quantity > prev.quantity ? 'up' : 'down';
      prevMap.set(level.price, { price: level.price, quantity: level.quantity });
      return change;
    }
    return 'same';
  };

  // Atualizar mapas quando snapshot muda
  useEffect(() => {
    if (snapshot) {
      snapshot.bids.forEach((bid) => {
        prevBidsRef.current.set(bid.price, { price: bid.price, quantity: bid.quantity });
      });
      snapshot.asks.forEach((ask) => {
        prevAsksRef.current.set(ask.price, { price: ask.price, quantity: ask.quantity });
      });
    }
  }, [snapshot]);

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const formatQuantity = (qty: number) => {
    if (qty >= 1000) return (qty / 1000).toFixed(2) + 'K';
    return qty.toFixed(4);
  };

  return (
    <div
      ref={containerRef}
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
          Order Book
        </span>
        {showSpread && spread && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Spread:</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#ef5350' }}>
              {formatPrice(spread.value)} ({spread.percent.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Asks (Vendas) - Vermelho */}
        <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
          {processedData.asks.map((ask, idx) => {
            const width = getVolumeWidth(ask.quantity, maxQty);
            const change = getQuantityChange(ask, 'ask');
            return (
              <div
                key={`ask-${ask.price}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 16px',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  backgroundColor:
                    change === 'up'
                      ? 'rgba(239, 83, 80, 0.15)'
                      : change === 'down'
                      ? 'rgba(239, 83, 80, 0.05)'
                      : 'transparent',
                }}
              >
                {/* Heatmap bar */}
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${width}%`,
                    background: 'rgba(239, 83, 80, 0.15)',
                    transition: 'width 0.3s ease',
                  }}
                />
                {/* Content */}
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', zIndex: 1 }}>
                  <span style={{ fontSize: 12, color: '#ef5350', fontWeight: 500 }}>
                    {formatPrice(ask.price)}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    {formatQuantity(ask.quantity)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Spread / Mid Price */}
        {spread && (
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
              {formatPrice((processedData.bids[0]?.price || 0) + spread.value / 2)}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {formatPrice(spread.value)}
            </span>
          </div>
        )}

        {/* Bids (Compras) - Verde */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {processedData.bids.map((bid, idx) => {
            const width = getVolumeWidth(bid.quantity, maxQty);
            const change = getQuantityChange(bid, 'bid');
            return (
              <div
                key={`bid-${bid.price}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 16px',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  backgroundColor:
                    change === 'up'
                      ? 'rgba(38, 166, 154, 0.15)'
                      : change === 'down'
                      ? 'rgba(38, 166, 154, 0.05)'
                      : 'transparent',
                }}
              >
                {/* Heatmap bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${width}%`,
                    background: 'rgba(38, 166, 154, 0.15)',
                    transition: 'width 0.3s ease',
                  }}
                />
                {/* Content */}
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', zIndex: 1 }}>
                  <span style={{ fontSize: 12, color: '#26a69a', fontWeight: 500 }}>
                    {formatPrice(bid.price)}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    {formatQuantity(bid.quantity)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OrderBook;

