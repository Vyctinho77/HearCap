import { useState } from 'react';
import { colors, spacing } from '../../../tokens';

interface TradeFormProps {
    price: number;
    onPriceChange: (price: number) => void;
}

export function TradeForm({ price, onPriceChange }: TradeFormProps) {
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<'limit' | 'market' | 'tpsl'>('limit');
    const [qty, setQty] = useState<string>('');
    const [sliderVal, setSliderVal] = useState(0);

    const handleSliderChange = (val: number) => {
        setSliderVal(val);
        // Mock calculation: 100% = 0.5 BTC
        setQty((0.5 * (val / 100)).toFixed(4));
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                background: colors.background.secondary,
                borderTop: `1px solid ${colors.border}`,
                padding: spacing.md,
                gap: spacing.md,
            }}
        >
            {/* Top Tabs */}
            <div style={{ display: 'flex', gap: spacing.md, fontSize: 13, fontWeight: 600 }}>
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.text.primary,
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    Spot
                </button>
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.text.secondary,
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    Convert
                </button>
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.text.secondary,
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    Margin
                </button>
            </div>

            {/* Buy/Sell Toggle */}
            <div
                style={{
                    display: 'flex',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    padding: 4,
                    gap: 4,
                }}
            >
                <button
                    style={{
                        flex: 1,
                        padding: `${spacing.xs} 0`,
                        fontSize: 13,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        background: side === 'buy' ? '#10b981' : 'transparent',
                        color: side === 'buy' ? '#fff' : colors.text.secondary,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onClick={() => setSide('buy')}
                >
                    Buy
                </button>
                <button
                    style={{
                        flex: 1,
                        padding: `${spacing.xs} 0`,
                        fontSize: 13,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        background: side === 'sell' ? '#ef4444' : 'transparent',
                        color: side === 'sell' ? '#fff' : colors.text.secondary,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onClick={() => setSide('sell')}
                >
                    Sell
                </button>
            </div>

            {/* Order Type Tabs */}
            <div style={{ display: 'flex', gap: spacing.md, fontSize: 12 }}>
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: orderType === 'limit' ? '#a855f7' : colors.text.secondary,
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 600,
                    }}
                    onClick={() => setOrderType('limit')}
                >
                    Limit
                </button>
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: orderType === 'market' ? '#a855f7' : colors.text.secondary,
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 600,
                    }}
                    onClick={() => setOrderType('market')}
                >
                    Market
                </button>
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: orderType === 'tpsl' ? '#a855f7' : colors.text.secondary,
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 600,
                    }}
                    onClick={() => setOrderType('tpsl')}
                >
                    TP/SL
                </button>
            </div>

            {/* Available Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.text.secondary }}>
                <span>Available Balance</span>
                <span style={{ color: colors.text.primary, fontFamily: 'monospace', fontWeight: 500 }}>14,250.50 USDT</span>
            </div>

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {/* Price Input */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => onPriceChange(parseFloat(e.target.value))}
                        style={{
                            width: '100%',
                            background: colors.background.elevated,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            padding: `${spacing.sm} ${spacing.md}`,
                            paddingRight: '50px',
                            textAlign: 'right',
                            fontSize: 13,
                            color: colors.text.primary,
                            outline: 'none',
                        }}
                    />
                    <span style={{ position: 'absolute', left: 12, top: 9, fontSize: 11, color: colors.text.secondary }}>Price</span>
                    <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11, color: colors.text.secondary }}>USDT</span>
                </div>

                {/* Qty Input */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        style={{
                            width: '100%',
                            background: colors.background.elevated,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            padding: `${spacing.sm} ${spacing.md}`,
                            paddingRight: '50px',
                            textAlign: 'right',
                            fontSize: 13,
                            color: colors.text.primary,
                            outline: 'none',
                        }}
                    />
                    <span style={{ position: 'absolute', left: 12, top: 9, fontSize: 11, color: colors.text.secondary }}>Quantity</span>
                    <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11, color: colors.text.secondary }}>BTC</span>
                </div>

                {/* Slider */}
                <div style={{ padding: `0 ${spacing.xs}` }}>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={sliderVal}
                        onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                        style={{
                            width: '100%',
                            height: 4,
                            background: colors.background.hover,
                            borderRadius: 4,
                            cursor: 'pointer',
                            accentColor: '#a855f7',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.text.secondary, marginTop: 4 }}>
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Order Value */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        readOnly
                        value={(price * (parseFloat(qty) || 0)).toFixed(2)}
                        style={{
                            width: '100%',
                            background: colors.background.elevated,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            padding: `${spacing.sm} ${spacing.md}`,
                            paddingRight: '50px',
                            textAlign: 'right',
                            fontSize: 13,
                            color: colors.text.secondary,
                            outline: 'none',
                        }}
                    />
                    <span style={{ position: 'absolute', left: 12, top: 9, fontSize: 11, color: colors.text.secondary }}>Order Value</span>
                    <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11, color: colors.text.secondary }}>USDT</span>
                </div>
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.xs }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: 11, color: colors.text.secondary, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ borderRadius: 4, border: `1px solid ${colors.border}`, background: 'transparent' }} />
                    TP/SL
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: 11, color: colors.text.secondary, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ borderRadius: 4, border: `1px solid ${colors.border}`, background: 'transparent' }} />
                    Post-Only
                </label>
            </div>

            {/* Submit Button */}
            <button
                style={{
                    width: '100%',
                    padding: `${spacing.md} 0`,
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#fff',
                    background: side === 'buy' ? '#10b981' : '#ef4444',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, opacity 0.2s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
                {side === 'buy' ? 'Buy BTC' : 'Sell BTC'}
            </button>
        </div>
    );
}
