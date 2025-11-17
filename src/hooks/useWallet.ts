import { useCallback, useEffect, useState } from 'react';
import { executeTrade, fetchWallets, TradeResponse, TradeSide, WalletBalance } from '../lib/api/trades';

interface WalletState {
  wallets: WalletBalance[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  trade: (side: TradeSide, symbol: string, quantity: number) => Promise<TradeResponse>;
}

export function useWallet(): WalletState {
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWallets();
      setWallets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar carteira');
    } finally {
      setLoading(false);
    }
  }, []);

  const trade = useCallback(
    async (side: TradeSide, symbol: string, quantity: number) => {
      const response = await executeTrade(side, symbol, quantity);
      if (response.wallets) {
        const updated: WalletBalance[] = Object.entries(response.wallets).map(([sym, balance]) => ({
          symbol: sym,
          balance: Number(balance),
        }));
        setWallets(updated);
      } else {
        await reload();
      }
      return response;
    },
    [reload]
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { wallets, loading, error, reload, trade };
}

