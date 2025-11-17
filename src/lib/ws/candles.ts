/**
 * WebSocket client para candles em tempo real
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

export interface CandleUpdate {
  stream: 'candles';
  data: {
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
  };
}

export interface TradeUpdate {
  stream: 'trades';
  data: TradeEvent;
}

export type WSMessage = CandleUpdate | TradeUpdate | { type: 'ping' };

/**
 * Classe para gerenciar conexão WebSocket de candles
 */
export class CandlesWSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduzido para 3 tentativas
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isDisabled = false; // Flag para desabilitar completamente

  constructor(
    private symbol: string,
    private interval: string = '1m',
    private onCandleUpdate?: (candle: CandleUpdate['data']) => void,
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

    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN) || this.isDisabled) {
      return;
    }

    this.isConnecting = true;
    const url = new URL(`${WS_BASE}/ws/market/candles`);
    url.searchParams.set('symbol', this.symbol);
    url.searchParams.set('interval', this.interval);

    try {
      this.ws = new WebSocket(url.toString());

      this.ws.onopen = () => {
        console.log(`[CandlesWS] Connected to ${this.symbol}@${this.interval}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          if ('type' in message && message.type === 'ping') {
            return;
          }

          if ('stream' in message) {
            if (message.stream === 'candles' && this.onCandleUpdate) {
              this.onCandleUpdate(message.data);
            } else if (message.stream === 'trades' && this.onTradeUpdate) {
              this.onTradeUpdate(message.data);
            }
          }
        } catch (error) {
          console.error('[CandlesWS] Failed to parse message:', error);
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
      console.error('[CandlesWS] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isDisabled) {
      // Silencioso após limite atingido
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    // Silencioso - não loga tentativas de reconexão

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts && !this.isDisabled) {
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

    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN) || this.isDisabled) {
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
          const message: WSMessage = JSON.parse(event.data);

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
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isDisabled) {
      // Silencioso após limite atingido
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    // Silencioso - não loga tentativas de reconexão

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts && !this.isDisabled) {
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

