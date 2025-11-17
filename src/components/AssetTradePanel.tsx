import { useMemo, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import type { TradeSide } from '../lib/api/trades';

interface AssetTradePanelProps {
  symbol: string;
  onPriceUpdate?: (symbol: string, price: number) => void;
}

export function AssetTradePanel({ symbol, onPriceUpdate }: AssetTradePanelProps) {
  const { wallets, trade, loading } = useWallet();
  const [quantity, setQuantity] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const balances = useMemo(() => {
    const usdt = wallets.find((w) => w.symbol === 'USDT')?.balance ?? 0;
    const token = wallets.find((w) => w.symbol === symbol)?.balance ?? 0;
    return { usdt, token };
  }, [wallets, symbol]);

  const handleTrade = async (side: TradeSide) => {
    if (quantity <= 0) {
      setFeedback('Quantidade deve ser maior que zero.');
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      const result = await trade(side, symbol, quantity);
      const price = result.trade.price;
      setFeedback(
        `${side === 'buy' ? 'Comprou' : 'Vendeu'} ${result.trade.quantity.toFixed(
          2
        )} ${result.trade.symbol} a ${price.toFixed(2)} USDT`
      );
      if (onPriceUpdate && Number.isFinite(result.new_price)) {
        onPriceUpdate(symbol, result.new_price);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Negociação falhou.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        padding: 16,
        minWidth: 240,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
        <span>
          Saldo USDT:{' '}
          <strong style={{ color: '#fff' }}>{balances.usdt.toFixed(2)} USDT</strong>
        </span>
        <span>
          Saldo {symbol}:{' '}
          <strong style={{ color: '#fff' }}>{balances.token.toFixed(2)} {symbol}</strong>
        </span>
        {loading && <span style={{ color: '#a855f7' }}>Sincronizando carteira…</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          style={{
            width: 120,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.15)',
            background: '#0f0f14',
            color: '#fff',
            padding: '8px 12px',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{symbol}</span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => handleTrade('buy')}
          disabled={submitting}
          style={{
            flex: 1,
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: 16,
            padding: '10px 14px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: submitting ? 0.7 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          Comprar {symbol}
        </button>
        <button
          onClick={() => handleTrade('sell')}
          disabled={submitting}
          style={{
            flex: 1,
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 16,
            padding: '10px 14px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: submitting ? 0.7 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          Vender
        </button>
      </div>

      {feedback && (
        <p style={{ fontSize: 12, color: feedback.includes('Erro') ? '#fb7185' : '#a3e635', margin: 0 }}>{feedback}</p>
      )}
    </div>
  );
}

export default AssetTradePanel;

