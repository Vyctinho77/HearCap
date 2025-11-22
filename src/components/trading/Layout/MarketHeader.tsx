import { Search, Bell, Settings, Globe, LayoutTemplate, Maximize2, Monitor, Smartphone } from 'lucide-react';
import { colors, spacing } from '../../../tokens';

export type LayoutMode = 'standard' | 'focus' | 'theatre' | 'compact';

interface MarketHeaderProps {
    symbol: string;
    layoutMode: LayoutMode;
    onLayoutModeChange: (mode: LayoutMode) => void;
    onToggleTradeDrawer: () => void;
    isTradeDrawerOpen: boolean;
}

export function MarketHeader({ symbol, layoutMode, onLayoutModeChange, onToggleTradeDrawer, isTradeDrawerOpen }: MarketHeaderProps) {
    const modes: { id: LayoutMode; icon: any; label: string }[] = [
        { id: 'standard', icon: LayoutTemplate, label: 'Std' },
        { id: 'focus', icon: Maximize2, label: 'Focus' },
        { id: 'theatre', icon: Monitor, label: 'Theatre' },
        { id: 'compact', icon: Smartphone, label: 'Compact' },
    ];

    return (
        <header
            style={{
                gridColumn: '1 / -1',
                gridRow: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `0 ${spacing.md}`,
                background: colors.background.secondary,
                borderBottom: `1px solid ${colors.border}`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontWeight: 600, fontSize: 18 }}>
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            background: '#a855f7',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#000',
                            fontWeight: 700,
                        }}
                    >
                        H
                    </div>
                    HearCap
                </div>

                {/* Symbol Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, fontSize: 14 }}>
                    <span style={{ fontWeight: 700 }}>{symbol}/USDT</span>
                    <span style={{ color: '#10b981' }}>81,520.9</span>
                    <span style={{ color: colors.text.secondary, fontSize: 12 }}>+2.34%</span>
                </div>

                {/* Layout Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: spacing.xl, background: colors.background.elevated, padding: 4, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                    {modes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => onLayoutModeChange(mode.id)}
                            title={mode.label}
                            style={{
                                background: layoutMode === mode.id ? colors.background.primary : 'transparent',
                                color: layoutMode === mode.id ? colors.text.primary : colors.text.secondary,
                                border: 'none',
                                borderRadius: 4,
                                padding: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <mode.icon size={16} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, color: colors.text.secondary }}>
                {/* Trade Toggle Button - Only in Compact Mode */}
                {layoutMode === 'compact' && (
                    <button
                        onClick={onToggleTradeDrawer}
                        style={{
                            background: isTradeDrawerOpen ? colors.background.primary : colors.background.elevated,
                            color: isTradeDrawerOpen ? '#a855f7' : colors.text.primary,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            padding: `${spacing.xs} ${spacing.md}`,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        Trade
                    </button>
                )}

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        background: colors.background.elevated,
                        padding: `${spacing.xs} ${spacing.md}`,
                        borderRadius: 20,
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 12,
                            color: colors.text.primary,
                            width: 100,
                        }}
                    />
                </div>
                <Globe size={18} style={{ cursor: 'pointer' }} />
                <Settings size={18} style={{ cursor: 'pointer' }} />
                <Bell size={18} style={{ cursor: 'pointer' }} />
                <div
                    style={{
                        width: 32,
                        height: 32,
                        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                        borderRadius: '50%',
                        cursor: 'pointer',
                    }}
                />
            </div>
        </header>
    );
}
