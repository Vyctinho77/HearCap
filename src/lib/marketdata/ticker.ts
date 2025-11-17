/**
 * Market Data API helpers para ticker 24h
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8080';

export interface Ticker24h {
  symbol: string;
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  priceChange: number;
  priceChangePercent: number;
  openTime: string;
  closeTime: string;
  updatedAt: string;
}

export interface TickerResponse {
  tickers?: Ticker24h[];
  symbol?: string;
  lastPrice?: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
  quoteVolume?: number;
  trades?: number;
  priceChange?: number;
  priceChangePercent?: number;
  openTime?: string;
  closeTime?: string;
  updatedAt?: string;
}

/**
 * Gera ticker mock para desenvolvimento
 */
function generateMockTicker(symbol: string): Ticker24h {
  const basePrice = 50 + (symbol.charCodeAt(0) % 100);
  const change = (Math.random() - 0.5) * 20;
  const lastPrice = basePrice + change;
  const openPrice = basePrice;
  const highPrice = lastPrice + Math.random() * 5;
  const lowPrice = lastPrice - Math.random() * 5;
  const volume = Math.random() * 10000000;
  const priceChange = lastPrice - openPrice;
  const priceChangePercent = (priceChange / openPrice) * 100;

  return {
    symbol,
    lastPrice: Number(lastPrice.toFixed(2)),
    openPrice: Number(openPrice.toFixed(2)),
    highPrice: Number(highPrice.toFixed(2)),
    lowPrice: Number(lowPrice.toFixed(2)),
    volume: Number(volume.toFixed(2)),
    quoteVolume: Number((volume * lastPrice).toFixed(2)),
    trades: Math.floor(Math.random() * 10000),
    priceChange: Number(priceChange.toFixed(2)),
    priceChangePercent: Number(priceChangePercent.toFixed(2)),
    openTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    closeTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Busca ticker 24h de um símbolo específico
 */
export async function fetchTicker(symbol: string): Promise<Ticker24h | null> {
  const url = new URL(`${API_BASE}/api/market/ticker24h`);
  url.searchParams.set('symbol', symbol);

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(3000), // Timeout de 3 segundos
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: Ticker24h = await response.json();
    return data;
  } catch (error) {
    // Se falhar, usa dados mock para desenvolvimento
    console.warn('[fetchTicker] Backend não disponível, usando dados mock:', error);
    return generateMockTicker(symbol);
  }
}

/**
 * Busca todos os tickers
 */
export async function fetchAllTickers(): Promise<Ticker24h[]> {
  const url = new URL(`${API_BASE}/api/market/ticker24h`);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }

    const data: TickerResponse = await response.json();
    return data.tickers || [];
  } catch (error) {
    console.error('[Ticker] Failed to fetch all:', error);
    return [];
  }
}

/**
 * Gera pontos de sparkline a partir de ticker
 * Usa uma curva suave baseada em open/high/low/close
 */
export function generateSparklinePoints(
  ticker: Ticker24h,
  pointCount: number = 50
): number[] {
  const points: number[] = [];
  const { openPrice, highPrice, lowPrice, lastPrice } = ticker;

  // Se não tiver dados suficientes, retorna array vazio
  if (!openPrice || !lastPrice) {
    return [];
  }

  const range = highPrice - lowPrice || Math.abs(lastPrice - openPrice) || 1;

  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1);
    
    // Curva suave interpolando entre open e last
    // Com pequena variação para parecer mais natural
    const base = openPrice + (lastPrice - openPrice) * t;
    
    // Adiciona uma pequena variação senoidal para suavizar
    const variation = Math.sin(t * Math.PI) * (range * 0.15);
    const point = base + variation;
    
    // Garantir que está dentro do range high/low
    const clamped = Math.max(
      Math.min(openPrice, lastPrice, lowPrice),
      Math.min(Math.max(openPrice, lastPrice, highPrice), point)
    );
    points.push(clamped);
  }

  return points;
}

/**
 * Gera pontos de sparkline a partir de array de preços (candles)
 */
export function generateSparklineFromPrices(
  prices: number[],
  pointCount?: number
): number[] {
  if (prices.length === 0) return [];
  
  // Se não especificar pointCount, usa todos os pontos
  if (!pointCount || pointCount >= prices.length) {
    return prices;
  }

  // Amostragem uniforme
  const step = prices.length / pointCount;
  const sampled: number[] = [];
  
  for (let i = 0; i < pointCount; i++) {
    const index = Math.floor(i * step);
    sampled.push(prices[index]);
  }
  
  return sampled;
}

/**
 * WebSocket client para ticker updates
 */
export class TickerWSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduzido para 3 tentativas
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isDisabled = false; // Flag para desabilitar completamente

  constructor(
    private symbol: string | null,
    private onUpdate?: (ticker: Ticker24h) => void
  ) {}

  async connect(): Promise<void> {
    // Verifica se backend está disponível antes de tentar conectar
    if (typeof window !== 'undefined') {
      try {
        const { isBackendAvailable } = await import('../utils/backend-check');
        const available = await isBackendAvailable();
        if (!available) {
          this.isDisabled = true;
          return; // Não tenta conectar se backend não está disponível
        }
      } catch {
        // Se o módulo não existir, continua normalmente
      }
    }

    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN) || this.isDisabled) {
      return;
    }

    this.isConnecting = true;
    const url = new URL(`${WS_BASE}/ws/market/ticker`);
    if (this.symbol) {
      url.searchParams.set('symbol', this.symbol);
    }

    try {
      this.ws = new WebSocket(url.toString());

      this.ws.onopen = () => {
        console.log(`[TickerWS] Connected ${this.symbol || 'all'}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if ('type' in message && message.type === 'ping') {
            return;
          }

          if ('stream' in message && message.stream === 'ticker' && this.onUpdate) {
            // Verifica se data não é null/undefined
            if (message.data == null) {
              return; // Ignora mensagens com data null
            }
            
            const ticker = Array.isArray(message.data) ? message.data : [message.data];
            ticker.forEach((t: Ticker24h | null) => {
              // Verifica se t não é null e tem symbol
              if (t && t.symbol && (!this.symbol || t.symbol === this.symbol)) {
                this.onUpdate?.(t);
              }
            });
          }
        } catch (error) {
          console.error('[TickerWS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = () => {
        // Silencioso - não loga nada para evitar spam no console
        this.isConnecting = false;
        
        // Se falhou na primeira tentativa, desabilita completamente
        if (this.reconnectAttempts === 0) {
          this.isDisabled = true;
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        // Só tenta reconectar se não excedeu o limite e não está desabilitado
        if (!this.isDisabled && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          // Silencioso - não loga nada
          this.isDisabled = true;
        }
      };
    } catch (error) {
      console.error('[TickerWS] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Silencioso após limite atingido
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    // Silencioso - não loga tentativas de reconexão

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect();
      }
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

