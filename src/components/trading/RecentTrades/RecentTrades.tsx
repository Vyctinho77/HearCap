import { useEffect, useState } from 'react';
import { mockTrades, Trade } from '../../../data/mockData';

interface RecentTradesProps {
    className?: string;
}

const MAX_TRADES = 50;

export function RecentTrades({ className }: RecentTradesProps) {
    const [trades, setTrades] = useState<Trade[]>(() => mockTrades.slice(0, 20));

    useEffect(() => {
        const interval = setInterval(() => {
            setTrades((prev) => {
                const nextTrade: Trade = {
                    id: `${Date.now()}`,
                    price: 81500 + (Math.random() * 40 - 20),
                    qty: parseFloat((Math.random() * 0.15).toFixed(4)),
                    time: new Date().toLocaleTimeString(),
                    side: Math.random() > 0.5 ? 'buy' : 'sell',
                };
                const next = [nextTrade, ...prev];
                return next.slice(0, MAX_TRADES);
            });
        }, 1800);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
                style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontWeight: 600,
                    fontSize: 13,
                }}
            >
                Recent Trades
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 16px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                <span>Price (USDT)</span>
                <span style={{ textAlign: 'right' }}>Qty (BTC)</span>
                <span style={{ textAlign: 'right' }}>Time</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 12px 16px' }}>
                {trades.map((trade) => (
                    <div
                        key={`${trade.id}-${trade.time}`}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            padding: '4px 0',
                            fontSize: 12,
                        }}
                    >
                        <span style={{ color: trade.side === 'buy' ? '#0ecb81' : '#f6465d' }}>
                            {trade.price.toFixed(2)}
                        </span>
                        <span style={{ textAlign: 'right', color: '#f7f9fb' }}>{trade.qty.toFixed(4)}</span>
                        <span style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>{trade.time}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

