/**
 * WebSocket client para Trade Feed (Time & Sales)
 */

const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8080';

export interface TradeEvent {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  source: 'LIT' | 'DARK_POOL';
  timestamp: string;
}

export interface TradeUpdate {
  stream: 'trades';
  data: TradeEvent;
}

export type TradesWSMessage = TradeUpdate | { type: 'ping' };

/**
 * Classe para gerenciar conexão WebSocket de trades
 */
export class TradesWSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduzido para 3 tentativas
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isDisabled = false; // Flag para desabilitar completamente

  constructor(
    private symbol: string,
    private onTradeUpdate?: (trade: TradeEvent) => void
  ) {}

  async connect(): Promise<void> {
    // Verifica se backend está disponível antes de tentar conectar
    if (typeof window !== 'undefined') {
      try {
        const { isBackendAvailable } = await import('../utils/backend-check');
        const available = await isBackendAvailable();
        if (!available) {
          return; // Não tenta conectar se backend não está disponível
        }
      } catch {
        // Se o módulo não existir, continua normalmente
      }
    }

    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const url = new URL(`${WS_BASE}/ws/market/trades`);
    url.searchParams.set('symbol', this.symbol);

    try {
      this.ws = new WebSocket(url.toString());

      this.ws.onopen = () => {
        console.log(`[TradesWS] Connected to ${this.symbol}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: TradesWSMessage = JSON.parse(event.data);

          if ('type' in message && message.type === 'ping') {
            return;
          }

          if ('stream' in message && message.stream === 'trades' && this.onTradeUpdate) {
            this.onTradeUpdate(message.data);
          }
        } catch (error) {
          console.error('[TradesWS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = () => {
        // Silencioso - não loga nada
        this.isConnecting = false;
        if (this.reconnectAttempts === 0) {
          this.isDisabled = true;
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        if (!this.isDisabled && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          this.isDisabled = true;
        }
      };
    } catch (error) {
      console.error('[TradesWS] Failed to create WebSocket:', error);
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

/**
 * Gera trades mock para desenvolvimento
 */
function generateMockTrades(symbol: string, limit: number): TradeEvent[] {
  const trades: TradeEvent[] = [];
  const basePrice = 50 + (symbol.charCodeAt(0) % 100);
  const now = Date.now();

  for (let i = 0; i < limit; i++) {
    const time = new Date(now - i * 1000); // 1 segundo entre cada trade
    const variation = (Math.random() - 0.5) * 5;
    const price = basePrice + variation;
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const quantity = Math.random() * 100;

    trades.push({
      id: `mock-${symbol}-${i}`,
      symbol,
      price: Number(price.toFixed(2)),
      quantity: Number(quantity.toFixed(4)),
      side: side as 'BUY' | 'SELL',
      source: 'LIT',
      timestamp: time.toISOString(),
    });
  }

  return trades;
}

/**
 * Busca trades recentes via REST
 */
export async function fetchRecentTrades(symbol: string, limit: number = 100): Promise<TradeEvent[]> {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
  const url = new URL(`${API_BASE}/api/market/trades/recent`);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('limit', limit.toString());

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(3000), // Timeout de 3 segundos
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.trades || [];
  } catch (error) {
    // Se falhar, usa dados mock para desenvolvimento
    console.warn('[fetchRecentTrades] Backend não disponível, usando dados mock:', error);
    return generateMockTrades(symbol, limit);
  }
}

