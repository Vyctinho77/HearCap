import { useEffect, useMemo, useState } from 'react';
import { Eye, LineChart } from 'lucide-react';
import { HearCapCandles } from '../chart/HearCapCandles';
import styles from './TradingLayout.module.css';
import { TradingHeader } from './Header/TradingHeader';
import { TickerBar } from './TickerBar/TickerBar';
import { OrderBook } from './OrderBook/OrderBook';
import { OrderForm } from './OrderForm/OrderForm';
import { PositionsPanel } from './PositionsPanel/PositionsPanel';
import { ToolBar } from './Layout/ToolBar';
import type { LayoutMode } from './Layout/MarketHeader';

interface TradingLayoutProps {
  symbol: string;
}

const timeframeOptions = ['1m', '5m', '15m', '1h', '4h', '1D'];

export function TradingLayout({ symbol }: TradingLayoutProps) {
  const [price, setPrice] = useState(84859.7);
  const [activeTimeframe, setActiveTimeframe] = useState('15m');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('standard');
  const [isTradeDrawerOpen, setTradeDrawerOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') {
        return;
      }
      setIsCompactViewport(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const shouldUseDrawer = isCompactViewport || layoutMode === 'compact';

  useEffect(() => {
    if (!shouldUseDrawer && isTradeDrawerOpen) {
      setTradeDrawerOpen(false);
    }
  }, [shouldUseDrawer, isTradeDrawerOpen]);

  const tickerStats = useMemo(
    () => [
      { label: '24h Change', value: '-2.04%', tone: 'negative' as const },
      { label: '24h High', value: '88,263.6' },
      { label: '24h Low', value: '80,641.5' },
      { label: 'Volume', value: '2.2B USDT' },
      { label: 'Funding', value: '0.0100%', helper: 'in 4h' },
    ],
    []
  );

  const chartStats = useMemo(
    () => ({
      open: 84936.2,
      high: 85085.8,
      low: 84820.9,
      close: price,
    }),
    [price]
  );

  const showInlineOrderForm = !shouldUseDrawer;
  const showPositionsPanel = !isCompactViewport && !shouldUseDrawer;

  const chartToolbarButtons = timeframeOptions.map((tf) => (
    <button
      key={tf}
      onClick={() => setActiveTimeframe(tf)}
      className={`${styles.timeframeButton} ${activeTimeframe === tf ? styles.timeframeButtonActive : ''}`}
    >
      {tf}
    </button>
  ));

  return (
    <div className={styles.tradingContainer}>
      <div className={styles.headerArea}>
        <TradingHeader
          symbol={symbol}
          price={price}
          priceChange={-2.04}
          high={88263.6}
          low={80641.5}
          volume="2.2B"
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          onToggleTradeDrawer={() => setTradeDrawerOpen((prev) => !prev)}
          isTradeDrawerOpen={isTradeDrawerOpen}
          showTradeButton={shouldUseDrawer}
        />
      </div>

      <div className={styles.tickerArea}>
        <TickerBar stats={tickerStats} className={styles.tickerStream} />
        <div className={styles.tickerActions}>
          <button className={styles.tickerActionButton} title="Ocultar valores">
            <Eye size={14} />
          </button>
          <button className={styles.tickerActionButton} title="Mostrar gráfico em janela">
            <LineChart size={14} />
          </button>
        </div>
      </div>

      <div className={styles.mainArea} data-has-orderform={showInlineOrderForm}>
        <section className={styles.chartShell}>
          <div className={styles.toolColumn}>
            <ToolBar />
          </div>
          <div className={styles.chartPanel}>
            <div className={styles.chartToolbar}>
              <div className={styles.chartStats}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>O</span>
                <span>{chartStats.open.toFixed(1)}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>H</span>
                <span>{chartStats.high.toFixed(1)}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>L</span>
                <span className={styles.chartStatHighlight}>{chartStats.low.toFixed(1)}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>C</span>
                <span className={styles.chartStatHighlight}>{chartStats.close.toFixed(1)}</span>
              </div>
              <div className={styles.timeframeGroup}>{chartToolbarButtons}</div>
            </div>
            <div className={styles.chartCanvas}>
              <HearCapCandles symbol={symbol} interval={activeTimeframe} tradingMode className="w-full h-full" />
            </div>
          </div>
        </section>

        <section className={styles.marketColumn}>
          <OrderBook onPriceSelect={setPrice} />
        </section>

        {showInlineOrderForm && (
          <section className={styles.executionColumn}>
            <div className={styles.assetSummary}>
              <span>Saldo disponível</span>
              <span>0.00 USDT</span>
            </div>
            <div className={styles.orderFormWrapper}>
              <OrderForm price={price} onPriceChange={setPrice} />
            </div>
          </section>
        )}
      </div>

      {showPositionsPanel && (
        <section className={styles.positionsArea}>
          <PositionsPanel />
        </section>
      )}

      {shouldUseDrawer && (
        <>
          <div
            className={`${styles.orderDrawerBackdrop} ${
              isTradeDrawerOpen ? styles.orderDrawerBackdropVisible : ''
            }`}
            onClick={() => setTradeDrawerOpen(false)}
          />
          <div className={`${styles.orderDrawer} ${isTradeDrawerOpen ? styles.orderDrawerOpen : ''}`}>
            <OrderForm price={price} onPriceChange={setPrice} />
          </div>
        </>
      )}
    </div>
  );
}
