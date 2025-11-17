/**
 * WebSocket client para Order Book (Depth of Market)
 */

const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8080';

export interface OrderBookLevel {
  price: number;
  quantity: number;
  count: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface OrderBookUpdate {
  stream: 'book';
  data: OrderBookSnapshot;
}

export type OrderBookWSMessage = OrderBookUpdate | { type: 'ping' };

/**
 * Classe para gerenciar conexão WebSocket de Order Book
 */
export class OrderBookWSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduzido para 3 tentativas
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isDisabled = false; // Flag para desabilitar completamente

  constructor(
    private symbol: string,
    private onUpdate?: (snapshot: OrderBookSnapshot) => void
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
    const url = new URL(`${WS_BASE}/ws/market/book`);
    url.searchParams.set('symbol', this.symbol);

    try {
      this.ws = new WebSocket(url.toString());

      this.ws.onopen = () => {
        console.log(`[OrderBookWS] Connected to ${this.symbol}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: OrderBookWSMessage = JSON.parse(event.data);

          if ('type' in message && message.type === 'ping') {
            return;
          }

          if ('stream' in message && message.stream === 'book' && this.onUpdate) {
            this.onUpdate(message.data);
          }
        } catch (error) {
          console.error('[OrderBookWS] Failed to parse message:', error);
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
      console.error('[OrderBookWS] Failed to create WebSocket:', error);
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
 * Busca snapshot inicial do order book via REST
 */
export async function fetchOrderBookSnapshot(
  symbol: string,
  level: number = 50
): Promise<OrderBookSnapshot> {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
  const url = new URL(`${API_BASE}/api/market/orderbook`);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('level', level.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch orderbook: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Agrupa níveis do order book por tick size
 */
export function groupOrderBookLevels(
  levels: OrderBookLevel[],
  tickSize: number
): OrderBookLevel[] {
  const grouped = new Map<number, OrderBookLevel>();

  for (const level of levels) {
    const groupedPrice = Math.floor(level.price / tickSize) * tickSize;
    const existing = grouped.get(groupedPrice);

    if (existing) {
      existing.quantity += level.quantity;
      existing.count += level.count;
    } else {
      grouped.set(groupedPrice, {
        price: groupedPrice,
        quantity: level.quantity,
        count: level.count,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.price - a.price);
}

