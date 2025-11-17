/**
 * Exemplo de layout completo de trading integrando:
 * - HearCapTV (gráfico)
 * - OrderBook (DOM)
 * - TradeFeed (Time & Sales)
 */

import { HearCapTV } from '../chart/HearCapTV';
import { OrderBook } from '../dom/OrderBook';
import { TradeFeed } from '../tape/TradeFeed';

interface TradingLayoutProps {
  symbol: string;
  onBuyClick?: () => void;
  onSellClick?: () => void;
}

export function TradingLayout({ symbol, onBuyClick, onSellClick }: TradingLayoutProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 280px',
        gap: 16,
        height: '100vh',
        padding: 16,
        background: '#02010A',
      }}
    >
      {/* Left: Order Book */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <OrderBook symbol={symbol} maxRows={25} tickSize={0.01} showSpread={true} />
      </div>

      {/* Center: Chart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <HearCapTV
            symbol={symbol}
            interval="1m"
            height={600}
            onBuyClick={onBuyClick}
            onSellClick={onSellClick}
          />
        </div>
      </div>

      {/* Right: Trade Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TradeFeed symbol={symbol} maxItems={200} autoScroll={true} />
      </div>
    </div>
  );
}

export default TradingLayout;


