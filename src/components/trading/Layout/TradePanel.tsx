import { ReactNode } from 'react';

interface TradePanelProps {
    children: ReactNode;
}

export function TradePanel({ children }: TradePanelProps) {
    return (
        <div
            style={{
                gridColumn: '2',
                gridRow: '2 / 4', // Spans from row 2 to end of row 3
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            {children}
        </div>
    );
}
