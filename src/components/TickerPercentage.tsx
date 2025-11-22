import React, { useEffect, useState, useRef } from 'react';
import { TickerWSClient } from '../lib/marketdata/ticker';

interface TickerPercentageProps {
    symbol: string;
    initialChange: string;
    isPositive: boolean;
}

export const TickerPercentage: React.FC<TickerPercentageProps> = ({
    symbol,
    initialChange,
    isPositive: initialIsPositive,
}) => {
    const [changePercent, setChangePercent] = useState<string>(initialChange);
    const [isPositive, setIsPositive] = useState<boolean>(initialIsPositive);
    const wsRef = useRef<TickerWSClient | null>(null);

    useEffect(() => {
        // Verifica se backend está disponível antes de conectar
        const checkAndConnect = async () => {
            try {
                const { isBackendAvailable } = await import('../lib/utils/backend-check');
                const available = await isBackendAvailable();
                if (!available) {
                    return; // Não conecta se backend não está disponível
                }
            } catch {
                // Se o módulo não existir, continua normalmente
            }

            wsRef.current = new TickerWSClient(symbol, (ticker) => {
                const percent = ticker.priceChangePercent;
                const positive = percent >= 0;

                setChangePercent(`${positive ? '+' : ''}${percent.toFixed(2)}%`);
                setIsPositive(positive);
            });

            wsRef.current.connect();
        };

        checkAndConnect();

        return () => {
            wsRef.current?.disconnect();
        };
    }, [symbol]);

    return (
        <div
            style={{
                color: isPositive ? '#0ecb81' : '#C750FF',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'IBM Plex Sans, sans-serif',
                transition: 'color 0.3s ease',
            }}
        >
            {changePercent}
        </div>
    );
};
