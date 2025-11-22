import { ReactNode } from 'react';
import { colors } from '../../../tokens';

interface BottomPanelProps {
    children: ReactNode;
}

export function BottomPanel({ children }: BottomPanelProps) {
    return (
        <div
            style={{
                gridColumn: '1',
                gridRow: '3',
                background: colors.background.secondary,
                borderTop: `1px solid ${colors.border}`,
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            {children}
        </div>
    );
}
