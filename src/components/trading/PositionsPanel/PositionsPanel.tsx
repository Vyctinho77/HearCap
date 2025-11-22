import { OrderManagement } from '../BottomPanel/OrderManagement';

interface PositionsPanelProps {
    className?: string;
}

export function PositionsPanel({ className }: PositionsPanelProps) {
    return (
        <section className={className} style={{ height: '100%' }}>
            <OrderManagement />
        </section>
    );
}

