import { useEffect, useRef, useCallback } from 'react';
import { CandlesWSClient, TradesWSClient, TradeEvent } from '../../lib/ws/candles';

declare global {
  interface Window {
    TradingView?: any;
    Datafeeds?: any;
    tvWidget?: any;
  }
}

interface HearCapTVProps {
  symbol: string;
  height?: number;
  interval?: string;
  onBuyClick?: () => void;
  onSellClick?: () => void;
}

const CHARTING_LIBRARY_SRC = import.meta.env.VITE_TV_CHARTING_LIBRARY_SRC || '/charting_library/charting_library.js';
const DATAFEED_BUNDLE_SRC = import.meta.env.VITE_TV_DATAFEED_BUNDLE_SRC || '/charting_library/datafeeds/udf/dist/bundle.js';
const DATAFEED_URL = import.meta.env.VITE_TV_DATAFEED_URL || '/api/tradingview';

export function HearCapTV({ 
  symbol, 
  height = 600, 
  interval = '1m',
  onBuyClick,
  onSellClick 
}: HearCapTVProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);
  const datafeedRef = useRef<any>(null);
  const wsCandlesRef = useRef<CandlesWSClient | null>(null);
  const wsTradesRef = useRef<TradesWSClient | null>(null);
  const currentBarRef = useRef<any>(null);
  const lastBarTimeRef = useRef<number | null>(null);

  // Callback para atualizar candle em tempo real
  const handleCandleUpdate = useCallback((candle: any) => {
    if (!datafeedRef.current || !currentBarRef.current) return;

    const barTime = new Date(candle.openTime).getTime() / 1000;
    
    // Novo candle (mudou o intervalo)
    if (lastBarTimeRef.current !== null && barTime !== lastBarTimeRef.current) {
      // Fecha o candle anterior
      if (currentBarRef.current) {
        datafeedRef.current.updateBar(currentBarRef.current);
      }
      
      // Inicia novo candle
      currentBarRef.current = {
        time: barTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      };
      lastBarTimeRef.current = barTime;
    } else {
      // Atualiza candle atual
      currentBarRef.current = {
        time: barTime,
        open: candle.open,
        high: Math.max(currentBarRef.current?.high || candle.high, candle.high),
        low: Math.min(currentBarRef.current?.low || candle.low, candle.low),
        close: candle.close,
        volume: (currentBarRef.current?.volume || 0) + candle.volume,
      };
      lastBarTimeRef.current = barTime;
    }

    // Atualiza bar em tempo real
    datafeedRef.current.updateBar(currentBarRef.current);
  }, []);

  // Callback para atualizar com trades
  const handleTradeUpdate = useCallback((trade: TradeEvent) => {
    if (!datafeedRef.current || !currentBarRef.current) return;

    const tradeTime = new Date(trade.timestamp).getTime() / 1000;
    const barTime = currentBarRef.current.time;

    // Se o trade está no candle atual
    if (Math.floor(tradeTime / getIntervalSeconds(interval)) === Math.floor(barTime / getIntervalSeconds(interval))) {
      currentBarRef.current = {
        ...currentBarRef.current,
        high: Math.max(currentBarRef.current.high, trade.price),
        low: Math.min(currentBarRef.current.low, trade.price),
        close: trade.price,
        volume: currentBarRef.current.volume + trade.quantity,
      };
      datafeedRef.current.updateBar(currentBarRef.current);
    }
  }, [interval]);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const containerId = `tv_pro_${symbol.toLowerCase()}`;
    containerRef.current.id = containerId;
    let isCancelled = false;

    const loadChartingLibrary = async () => {
      if (window.TradingView && window.Datafeeds) {
        return;
      }

      const scripts = [CHARTING_LIBRARY_SRC];
      if (DATAFEED_BUNDLE_SRC) {
        scripts.push(DATAFEED_BUNDLE_SRC);
      }

      for (const src of scripts) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[src="${src}"]`);
          if (existing) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          document.body.appendChild(script);
        });
      }
    };

    const initializeWidget = async () => {
      if (!window.TradingView || !window.Datafeeds || isCancelled) return;

      try {
        widgetRef.current?.remove?.();
      } catch {}

      // Criar datafeed customizado com WebSocket
      const baseDatafeed = new window.Datafeeds.UDFCompatibleDatafeed(DATAFEED_URL);
      
      // Sobrescrever subscribeBars para adicionar WebSocket
      const originalSubscribeBars = baseDatafeed.subscribeBars?.bind(baseDatafeed);
      if (originalSubscribeBars) {
        baseDatafeed.subscribeBars = (
          symbolInfo: any,
          resolution: string,
          onRealtimeCallback: (bar: any) => void,
          subscriberUID: string,
          onResetCacheNeededCallback: () => void
        ) => {
          // Chamar subscribe original
          originalSubscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback);

          // Salvar callback para uso no WebSocket
          datafeedRef.current = {
            updateBar: (bar: any) => {
              onRealtimeCallback(bar);
            },
          };

          // Conectar WebSocket
          wsCandlesRef.current = new CandlesWSClient(
            symbol,
            resolution,
            handleCandleUpdate,
            handleTradeUpdate
          );
          wsCandlesRef.current.connect();

          wsTradesRef.current = new TradesWSClient(symbol, handleTradeUpdate);
          wsTradesRef.current.connect();
        };
      }

      const originalUnsubscribeBars = baseDatafeed.unsubscribeBars?.bind(baseDatafeed);
      if (originalUnsubscribeBars) {
        baseDatafeed.unsubscribeBars = (subscriberUID: string) => {
          originalUnsubscribeBars(subscriberUID);
          wsCandlesRef.current?.disconnect();
          wsTradesRef.current?.disconnect();
        };
      }

      const widget = new window.TradingView.widget({
        symbol: symbol.toUpperCase(),
        interval: interval,
        container_id: containerId,
        datafeed: baseDatafeed,
        timezone: 'Etc/UTC',
        theme: 'dark',
        autosize: true,
        toolbar_bg: '#0a0a0f',
        loading_screen: { backgroundColor: '#050509' },
        overrides: {
          'paneProperties.background': '#050509',
          'paneProperties.backgroundType': 'solid',
          'mainSeriesProperties.candleStyle.upColor': '#26a69a',
          'mainSeriesProperties.candleStyle.downColor': '#ef5350',
          'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
          'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
        },
        studies_overrides: {},
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'header_symbol_search',
          'header_compare',
          'header_saveload',
          'header_screenshot',
        ],
        enabled_features: [
          'study_templates',
          'side_toolbar_in_fullscreen_mode',
          'hide_left_toolbar_by_default',
        ],
        custom_css_url: '/charting_library/custom.css',
        studies_access: {
          type: 'black',
          tools: [
            { name: 'RSI' },
            { name: 'MACD' },
            { name: 'EMA' },
            { name: 'SMA' },
            { name: 'VWAP' },
            { name: 'Bollinger Bands' },
          ],
        },
        custom_buttons: onBuyClick || onSellClick ? [
          ...(onBuyClick ? [{
            title: 'Comprar',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMkwxMCA2SDE0TDEwIDEwSDZMMTAgNkg2TDggMloiIGZpbGw9IiMyNmE2OWEiLz4KPC9zdmc+',
            onClick: onBuyClick,
          }] : []),
          ...(onSellClick ? [{
            title: 'Vender',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTRMMTAgMTBINkwxMCA2SDE0TDEwIDEwSDZMMTAgNkg2TDggMTRaIiBmaWxsPSIjZWY1MzUwIi8+Cjwvc3ZnPg==',
            onClick: onSellClick,
          }] : []),
        ] : undefined,
      });

      widgetRef.current = widget;
    };

    const bootstrap = async () => {
      try {
        await loadChartingLibrary();
        if (!isCancelled) {
          await initializeWidget();
        }
      } catch (error) {
        console.error('[HearCapTV] Failed to initialize:', error);
      }
    };

    bootstrap();

    return () => {
      isCancelled = true;
      wsCandlesRef.current?.disconnect();
      wsTradesRef.current?.disconnect();
      try {
        widgetRef.current?.remove?.();
      } catch {}
    };
  }, [symbol, interval, handleCandleUpdate, handleTradeUpdate, onBuyClick, onSellClick]);

  return (
    <div
      style={{
        width: '100%',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.05)',
        background: '#050509',
        padding: 0,
        minHeight: height,
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
}

function getIntervalSeconds(interval: string): number {
  const map: Record<string, number> = {
    '1': 60,
    '3': 180,
    '5': 300,
    '15': 900,
    '30': 1800,
    '60': 3600,
    '1m': 60,
    '3m': 180,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
  };
  return map[interval] || 60;
}

export default HearCapTV;

