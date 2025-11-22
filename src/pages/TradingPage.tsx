import { useParams } from 'react-router-dom';
import { TradingLayout } from '../components/trading/TradingLayout';

export function TradingPage() {
    const { symbol } = useParams<{ symbol: string }>();

    if (!symbol) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#000',
                color: '#fff',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Invalid Symbol</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Please select an asset to trade.</p>
                </div>
            </div>
        );
    }

    return <TradingLayout symbol={symbol.toUpperCase()} />;
}
