import { Bell, LayoutTemplate, Maximize2, Monitor, Search, Settings, Smartphone } from 'lucide-react';
import type { LayoutMode } from '../Layout/MarketHeader';

interface TradingHeaderProps {
    symbol: string;
    price: number;
    priceChange: number;
    high: number;
    low: number;
    volume: string;
    layoutMode: LayoutMode;
    onLayoutModeChange: (mode: LayoutMode) => void;
    onToggleTradeDrawer: () => void;
    isTradeDrawerOpen: boolean;
    showTradeButton: boolean;
}

const modes: { id: LayoutMode; label: string; icon: typeof LayoutTemplate }[] = [
    { id: 'standard', label: 'Std', icon: LayoutTemplate },
    { id: 'focus', label: 'Focus', icon: Maximize2 },
    { id: 'theatre', label: 'Theatre', icon: Monitor },
    { id: 'compact', label: 'Compact', icon: Smartphone },
];

export function TradingHeader({
    symbol,
    price,
    priceChange,
    high,
    low,
    volume,
    layoutMode,
    onLayoutModeChange,
    onToggleTradeDrawer,
    isTradeDrawerOpen,
    showTradeButton,
}: TradingHeaderProps) {
    const formattedPrice = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(price);
    const formattedHigh = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 }).format(high);
    const formattedLow = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 }).format(low);
    const priceTone = priceChange >= 0 ? '#0ecb81' : '#f6465d';
    const percent = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;

    return (
        <header
            style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0f121a',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '0 20px',
                minHeight: 64,
                gap: 24,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #c750ff, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#0a0312',
                    }}
                >
                    H
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{symbol}/USDT</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 14 }}>
                        <span style={{ fontSize: 20, fontWeight: 700, color: priceTone }}>{formattedPrice}</span>
                        <span style={{ color: priceTone }}>{percent}</span>
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#191d2a',
                    padding: 6,
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.08)',
                    flexWrap: 'wrap',
                }}
            >
                {modes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = layoutMode === mode.id;
                    return (
                        <button
                            key={mode.id}
                            onClick={() => onLayoutModeChange(mode.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 36,
                                height: 36,
                                borderRadius: 999,
                                border: isActive ? '1px solid rgba(199,80,255,0.8)' : '1px solid transparent',
                                background: isActive ? 'rgba(199,80,255,0.15)' : 'transparent',
                                color: isActive ? '#c750ff' : 'rgba(255,255,255,0.6)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            title={mode.label}
                        >
                            <Icon size={16} strokeWidth={2} />
                        </button>
                    );
                })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#191d2a',
                        padding: '6px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                        <span>24h High</span>
                        <span style={{ fontSize: 13, color: '#f7f9fb', fontWeight: 600 }}>{formattedHigh}</span>
                    </div>
                    <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                        <span>24h Low</span>
                        <span style={{ fontSize: 13, color: '#f7f9fb', fontWeight: 600 }}>{formattedLow}</span>
                    </div>
                    <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                        <span>Volume</span>
                        <span style={{ fontSize: 13, color: '#f7f9fb', fontWeight: 600 }}>{volume}</span>
                    </div>
                </div>

            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: '#191d2a',
                    }}
                >
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Buscar mercados"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#f7f9fb',
                            fontSize: 12,
                            width: 140,
                        }}
                    />
                </div>

                <Bell size={18} color="rgba(255,255,255,0.8)" style={{ cursor: 'pointer' }} />
                <Settings size={18} color="rgba(255,255,255,0.8)" style={{ cursor: 'pointer' }} />

                {showTradeButton && (
                    <button
                        onClick={onToggleTradeDrawer}
                        style={{
                            background: isTradeDrawerOpen ? '#c750ff' : '#a855f7',
                            color: '#0a0312',
                            fontWeight: 700,
                            border: 'none',
                            borderRadius: 999,
                            padding: '10px 18px',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease',
                        }}
                    >
                        {isTradeDrawerOpen ? 'Fechar Trade' : 'Abrir Trade'}
                    </button>
                )}
            </div>
        </header>
    );
}

