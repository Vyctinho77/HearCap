const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const USER_ID = import.meta.env.VITE_MOCK_USER_ID || 'mock-user-default';

export type TradeSide = 'buy' | 'sell';

export interface WalletBalance {
  symbol: string;
  balance: number;
}

export interface TradePayload {
  user_id: string;
  symbol: string;
  quantity: number;
}

export interface TradeRecord {
  id: string;
  user_id: string;
  symbol: string;
  side: TradeSide;
  price: number;
  quantity: number;
  notional: number;
  created_at: string;
}

export interface TradeResponse {
  trade: TradeRecord;
  new_price: number;
  wallets?: Record<string, number>;
}

const withBase = (path: string) => `${API_BASE}${path}`;

export async function fetchWallets() {
  // Silencioso - usa fallback se não estiver definido
  if (!USER_ID || USER_ID === 'mock-user-default') {
    return [];
  }

  const res = await fetch(withBase(`/api/wallets/${USER_ID}`));
  if (!res.ok) {
    throw new Error('Falha ao carregar carteira');
  }

  const data = await res.json();
  const rawWallets = data.wallets ?? data.balances ?? [];
  return rawWallets.map((wallet: any) => ({
    symbol: wallet.symbol,
    balance: Number(wallet.balance ?? 0),
  })) as WalletBalance[];
}

export async function executeTrade(side: TradeSide, symbol: string, quantity: number): Promise<TradeResponse> {
  if (!USER_ID) {
    throw new Error('Configuração de usuário não encontrada (VITE_MOCK_USER_ID).');
  }

  const payload: TradePayload = {
    user_id: USER_ID,
    symbol,
    quantity,
  };

  const res = await fetch(withBase(`/api/trades/${side}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.error ?? 'Não foi possível executar a negociação');
  }

  return res.json();
}

