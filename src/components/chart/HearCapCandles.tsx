import { useEffect, useMemo, useRef } from 'react';
import layoutState from '../../state/layoutState';
import { registerChartFrame } from '../../state/chartMessenger';

export interface HearCapCandlesProps {
  height?: number | string;
  symbol?: string;
  interval?: string;
  className?: string;
  artistName?: string;
  tokenSymbol?: string;
  priceValue?: number;
  priceChange?: string;
  availability?: string;
  avatarUrl?: string;
  tradingMode?: boolean; // Use clean embed without extra UI
}

const DEFAULT_EMBED_URL = import.meta.env.VITE_CANDLES_EMBED_URL || '/candles/embed.html';

export function HearCapCandles({
  height,
  symbol,
  interval,
  className,
  artistName,
  tokenSymbol,
  priceValue,
  priceChange,
  availability,
  avatarUrl,
  tradingMode = false,
}: HearCapCandlesProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const embedSrc = useMemo(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_EMBED_URL;
    }
    // Use clean embed for trading mode
    const baseUrl = tradingMode ? '/candles/embed-trading.html' : DEFAULT_EMBED_URL;
    const url = new URL(baseUrl, window.location.origin);
    if (symbol) {
      url.searchParams.set('symbol', symbol.toUpperCase());
    }
    if (interval) {
      url.searchParams.set('interval', interval);
    }
    if (artistName) {
      url.searchParams.set('artist', artistName);
    }
    if (tokenSymbol) {
      url.searchParams.set('token', tokenSymbol.toUpperCase());
    }
    if (priceValue !== undefined) {
      url.searchParams.set('price', priceValue.toString());
    }
    if (priceChange) {
      url.searchParams.set('change', priceChange);
    }
    if (availability) {
      url.searchParams.set('availability', availability);
    }
    if (avatarUrl) {
      url.searchParams.set('avatar', avatarUrl);
    }
    return url.toString();
  }, [symbol, interval, artistName, tokenSymbol, priceValue, priceChange, availability, avatarUrl, tradingMode]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const unregister = registerChartFrame(frame);
    layoutState.syncFrame(frame);
    return unregister;
  }, [embedSrc]);

  const computedHeight = useMemo(() => {
    if (height !== undefined) {
      return height;
    }
    return tradingMode ? '100%' : 640;
  }, [height, tradingMode]);

  const computedMinHeight = useMemo(() => {
    if (typeof height === 'number') {
      return height;
    }
    return tradingMode ? 320 : 0;
  }, [height, tradingMode]);

  return (
    <iframe
      title="HearCap Candles"
      src={embedSrc}
      ref={frameRef}
      className={className}
      style={{
        width: '100%',
        height: computedHeight,
        minWidth: 0,
        minHeight: computedMinHeight,
        border: 'none',
        display: 'block',
        background: 'transparent',
      }}
      allow="accelerometer; clipboard-write; fullscreen"
      loading="lazy"
    />
  );
}

export default HearCapCandles;
