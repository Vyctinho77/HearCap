/**
 * Market Data API helpers para candles
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export interface Candle {
  symbol: string;
  interval: string;
  openTime: string;
  closeTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
  createdAt: string;
  updatedAt: string;
}

export interface CandleResponse {
  symbol: string;
  interval: string;
  candles: Candle[];
}

/**
 * Gera candles mock para desenvolvimento
 */
export function generateMockCandles(symbol: string, interval: string, limit: number): Candle[] {
  const candles: Candle[] = [];
  const now = new Date();
  const basePrice = 50 + (symbol.charCodeAt(0) % 100); // Preço base baseado no símbolo
  
  // Determina intervalo em minutos
  let intervalMinutes = 1;
  if (interval.includes('h')) {
    intervalMinutes = parseInt(interval) * 60;
  } else if (interval.includes('m')) {
    intervalMinutes = parseInt(interval) || 1;
  } else if (interval.includes('d')) {
    intervalMinutes = parseInt(interval) * 24 * 60;
  }

  for (let i = limit - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
    const variation = (Math.random() - 0.5) * 10; // Variação de ±5
    const open = basePrice + variation;
    const close = open + (Math.random() - 0.5) * 4;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.random() * 1000000;

    candles.push({
      symbol,
      interval,
      openTime: time.toISOString(),
      closeTime: new Date(time.getTime() + intervalMinutes * 60 * 1000).toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
      trades: Math.floor(Math.random() * 100),
      createdAt: time.toISOString(),
      updatedAt: time.toISOString(),
    });
  }

  return candles;
}

/**
 * Busca candles históricos do backend
 */
export async function fetchCandles(
  symbol: string,
  interval: string = '1m',
  limit: number = 500
): Promise<Candle[]> {
  const url = new URL(`${API_BASE}/api/market/candles`);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('limit', limit.toString());

  try {
    console.log('[fetchCandles] Tentando buscar de:', url.toString());
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(3000), // Timeout de 3 segundos
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CandleResponse = await response.json();
    console.log('[fetchCandles] Resposta recebida:', {
      symbol: data.symbol,
      interval: data.interval,
      candlesCount: data.candles?.length || 0,
    });
    
    return data.candles || [];
  } catch (error) {
    // Se falhar, usa dados mock para desenvolvimento
    console.warn('[fetchCandles] Backend não disponível, usando dados mock:', error);
    const mockCandles = generateMockCandles(symbol, interval, limit);
    console.log('[fetchCandles] Dados mock gerados:', mockCandles.length, 'candles');
    return mockCandles;
  }
}

