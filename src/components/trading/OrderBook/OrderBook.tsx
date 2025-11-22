import { useState, useEffect, useMemo } from 'react';
import { mockBids, mockAsks, mockTrades, OrderbookEntry, Trade } from '../../../data/mockData';
import styles from './OrderBook.module.css';

interface OrderBookProps {
    onPriceSelect: (price: number) => void;
}

export function OrderBook({ onPriceSelect }: OrderBookProps) {
    const [tab, setTab] = useState<'book' | 'trades'>('book');
    const [bids, setBids] = useState<OrderbookEntry[]>(mockBids);
    const [asks, setAsks] = useState<OrderbookEntry[]>(mockAsks);
    const [trades, setTrades] = useState<Trade[]>(mockTrades.slice(0, 40));

    // Simulate live updates
    useEffect(() => {
        const interval = setInterval(() => {
            const target = Math.random() > 0.5 ? 'bid' : 'ask';
            if (target === 'bid') {
                setBids((prev) => {
                    const next = [...prev];
                    const idx = Math.floor(Math.random() * next.length);
                    const base = next[idx];
                    const size = Math.max(0.01, Math.random() * 0.8);
                    const priceDrift = (Math.random() - 0.5) * 2;
                    const price = Math.max(0, base.price + priceDrift);
                    next[idx] = {
                        ...base,
                        price,
                        size,
                        total: price * size,
                    };
                    return next;
                });
            } else {
                setAsks((prev) => {
                    const next = [...prev];
                    const idx = Math.floor(Math.random() * next.length);
                    const base = next[idx];
                    const size = Math.max(0.01, Math.random() * 0.8);
                    const priceDrift = (Math.random() - 0.5) * 2;
                    const price = Math.max(0, base.price + priceDrift);
                    next[idx] = {
                        ...base,
                        price,
                        size,
                        total: price * size,
                    };
                    return next;
                });
            }
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTrades((prev) => {
                const next: Trade = {
                    id: crypto.randomUUID(),
                    price: 81500 + (Math.random() * 40 - 20),
                    qty: parseFloat((Math.random() * 0.15).toFixed(4)),
                    time: new Date().toLocaleTimeString(),
                    side: Math.random() > 0.5 ? 'buy' : 'sell',
                };
                return [next, ...prev].slice(0, 50);
            });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const maxTotal = useMemo(() => {
        const bidMax = bids.length ? Math.max(...bids.map((b) => b.total)) : 0;
        const askMax = asks.length ? Math.max(...asks.map((a) => a.total)) : 0;
        return Math.max(bidMax, askMax, 1);
    }, [bids, asks]);

    const asksDescending = [...asks].reverse();
    const midPrice =
        bids.length && asks.length ? ((bids[0].price + asks[0].price) / 2).toFixed(1) : '--';

    const renderRow = (entry: OrderbookEntry, type: 'buy' | 'sell') => {
        const depth = Math.min(100, (entry.total / maxTotal) * 100);
        return (
            <button
                key={`${type}-${entry.price}-${entry.total}`}
                type="button"
                className={`${styles.bookRow} ${type === 'buy' ? styles.buy : styles.sell}`}
                onClick={() => onPriceSelect(entry.price)}
            >
                <span
                    className={`${styles.depthBar} ${
                        type === 'buy' ? styles.depthBarBid : styles.depthBarAsk
                    }`}
                    style={{ width: `${depth}%` }}
                />
                <span className={`${styles.rowCell} ${styles.priceCell}`}>{entry.price.toFixed(1)}</span>
                <span className={`${styles.rowCell} ${styles.qtyCell}`}>{entry.size.toFixed(4)}</span>
                <span className={`${styles.rowCell} ${styles.totalCell}`}>{entry.total.toFixed(4)}</span>
            </button>
        );
    };

    return (
        <div className={styles.bookCard}>
            <div className={styles.tabBar}>
                <button
                    type="button"
                    className={`${styles.tabButton} ${tab === 'book' ? styles.tabButtonActive : ''}`}
                    onClick={() => setTab('book')}
                >
                    Order Book
                </button>
                <button
                    type="button"
                    className={`${styles.tabButton} ${tab === 'trades' ? styles.tabButtonActive : ''}`}
                    onClick={() => setTab('trades')}
                >
                    Recent Trades
                </button>
            </div>

            {tab === 'book' ? (
                <>
                    <div className={styles.headerRow}>
                        <span>Price (USDT)</span>
                        <span style={{ textAlign: 'right' }}>Qty (BTC)</span>
                        <span style={{ textAlign: 'right' }}>Total</span>
                    </div>
                    <div className={styles.sideBody}>
                        {asksDescending.map((ask) => renderRow(ask, 'sell'))}
                    </div>
                    <div className={styles.spreadRow}>
                        {midPrice} <span>≈ ${midPrice}</span>
                    </div>
                    <div className={styles.sideBody}>
                        {bids.map((bid) => renderRow(bid, 'buy'))}
                    </div>
                </>
            ) : (
                <div className={styles.recentTradesList}>
                    {trades.map((trade) => (
                        <div
                            key={trade.id + trade.time}
                            className={styles.tradeRow}
                            style={{ color: trade.side === 'buy' ? '#00c087' : '#ff4d4d' }}
                        >
                            <span>{trade.price.toFixed(2)}</span>
                            <span>{trade.qty.toFixed(4)}</span>
                            <span className={styles.tradeTime}>{trade.time}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
