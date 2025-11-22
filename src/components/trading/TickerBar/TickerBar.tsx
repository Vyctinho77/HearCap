interface TickerStat {
    label: string;
    value: string;
    tone?: 'positive' | 'negative' | 'muted';
    helper?: string;
}

interface TickerBarProps {
    stats: TickerStat[];
    className?: string;
}

const toneMap: Record<NonNullable<TickerStat['tone']>, string> = {
    positive: '#0ecb81',
    negative: '#f6465d',
    muted: 'rgba(255,255,255,0.65)',
};

export function TickerBar({ stats, className }: TickerBarProps) {
    return (
        <div className={className} style={{ overflow: 'hidden' }}>
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.6)',
                    }}
                >
                    <span style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{stat.label}</span>
                    <span
                        style={{
                            fontWeight: 600,
                            color: stat.tone ? toneMap[stat.tone] : '#f7f9fb',
                        }}
                    >
                        {stat.value}
                    </span>
                    {stat.helper && <span style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.helper}</span>}
                </div>
            ))}
        </div>
    );
}

