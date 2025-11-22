import { ReactNode } from 'react';
import { LayoutMode } from './MarketHeader';

interface MainAreaProps {
    children: ReactNode;
    layoutMode: LayoutMode;
}

export function MainArea({ children, layoutMode }: MainAreaProps) {
    // Dynamic Grid Columns based on Mode
    let gridTemplateColumns = '64px minmax(400px, 1fr) 80px 318px';

    if (layoutMode === 'focus') {
        // Hide Orderbook
        gridTemplateColumns = '64px minmax(400px, 1fr) 80px 0px';
    } else if (layoutMode === 'theatre') {
        // Hide Tools & Orderbook
        gridTemplateColumns = '0px minmax(400px, 1fr) 80px 0px';
    }

    return (
        <div
            style={{
                gridColumn: '1',
                gridRow: '2',
                display: 'grid',
                gridTemplateColumns,
                gridTemplateRows: '100%',
                gap: '4px',
                minHeight: 0,
                minWidth: 0,
                overflow: 'hidden',
                transition: 'grid-template-columns 0.3s ease', // Smooth transition
            }}
        >
            {children}
        </div>
    );
}
