import { useEffect, useState, useRef } from 'react';
import { fetchTicker, generateSparklinePoints, TickerWSClient } from '../../lib/marketdata/ticker';
import { fetchCandles } from '../../lib/marketdata/candles';

interface SparklineProps {
  symbol: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  showGradient?: boolean;
  realtime?: boolean;
}

export function Sparkline({
  symbol,
  width = 120,
  height = 40,
  strokeWidth = 1.5,
  showGradient = true,
  realtime = true,
}: SparklineProps) {
  const [points, setPoints] = useState<number[]>([]);
  const [color, setColor] = useState<string>('#26a69a');
  const wsRef = useRef<TickerWSClient | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Carregar dados iniciais (tenta candles primeiro, fallback para ticker)
  useEffect(() => {
    let hasData = false;

    // Tentar buscar candles recentes para dados mais precisos
    fetchCandles(symbol, '1h', 50)
      .then((candles) => {
        if (candles && candles.length > 0) {
          hasData = true;
          // Usar preços de close dos candles
          const closePrices = candles.map((c) => c.close);
          setPoints(closePrices);
          
          // Determinar cor baseada na primeira vs última
          const firstPrice = closePrices[0];
          const lastPrice = closePrices[closePrices.length - 1];
          const isPositive = lastPrice >= firstPrice;
          setColor(isPositive ? '#26a69a' : '#ef5350');
        }
        
        // Se não tiver candles, tenta ticker
        if (!hasData) {
          return fetchTicker(symbol);
        }
        return null;
      })
      .then((tickerData) => {
        if (tickerData && !hasData) {
          const sparkPoints = generateSparklinePoints(tickerData, 50);
          setPoints(sparkPoints);
          
          const isPositive = tickerData.priceChange >= 0;
          setColor(isPositive ? '#26a69a' : '#ef5350');
        }
      })
      .catch((err) => console.error('[Sparkline] Failed to fetch data:', err));
  }, [symbol]);

  // Conectar WebSocket para updates (apenas se backend estiver disponível)
  useEffect(() => {
    if (!realtime) return;

    // Verifica se backend está disponível antes de conectar
    const checkAndConnect = async () => {
      try {
        const { isBackendAvailable } = await import('../../lib/utils/backend-check');
        const available = await isBackendAvailable();
        if (!available) {
          return; // Não conecta se backend não está disponível
        }
      } catch {
        // Se o módulo não existir, continua normalmente
      }

      wsRef.current = new TickerWSClient(symbol, (updatedTicker) => {
        // Atualizar sparkline com novo ticker
        const sparkPoints = generateSparklinePoints(updatedTicker, 50);
        setPoints(sparkPoints);
        
        const isPositive = updatedTicker.priceChange >= 0;
        setColor(isPositive ? '#26a69a' : '#ef5350');
        
        // Opcional: também atualizar com candles se disponível
        fetchCandles(symbol, '1h', 50)
          .then((candles) => {
            if (candles && candles.length > 0) {
              const closePrices = candles.map((c) => c.close);
              setPoints(closePrices);
            }
          })
          .catch(() => {
            // Ignora erro, mantém sparkline do ticker
          });
      });
      wsRef.current.connect();
    };

    checkAndConnect();

    return () => {
      wsRef.current?.disconnect();
    };
  }, [symbol, realtime]);

  // Gerar path SVG
  const pathData = points.length > 0
    ? points
        .map((point, index) => {
          const x = (index / (points.length - 1)) * width;
          const y = height - ((point - Math.min(...points)) / (Math.max(...points) - Math.min(...points) || 1)) * height;
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ')
    : '';

  const minPrice = points.length > 0 ? Math.min(...points) : 0;
  const maxPrice = points.length > 0 ? Math.max(...points) : 0;
  const priceRange = maxPrice - minPrice || 1;

  // Área de gradiente (opcional)
  const areaPath = points.length > 0
    ? `${pathData} L ${width} ${height} L 0 ${height} Z`
    : '';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          {showGradient && (
            <linearGradient id={`gradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          )}
        </defs>

        {/* Área de gradiente (opcional) */}
        {showGradient && areaPath && (
          <path
            d={areaPath}
            fill={`url(#gradient-${symbol})`}
            style={{ transition: 'fill 0.3s ease' }}
          />
        )}

        {/* Linha do sparkline */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        )}

        {/* Ponto final (último preço) */}
        {points.length > 0 && (
          <circle
            cx={width}
            cy={height - ((points[points.length - 1] - minPrice) / priceRange) * height}
            r={2}
            fill={color}
            style={{ transition: 'fill 0.3s ease, cy 0.3s ease' }}
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Versão simplificada sem WebSocket (apenas visualização estática)
 */
export function SparklineStatic({
  symbol,
  width = 120,
  height = 40,
  strokeWidth = 1.5,
  showGradient = true,
}: Omit<SparklineProps, 'realtime'>) {
  return <Sparkline symbol={symbol} width={width} height={height} strokeWidth={strokeWidth} showGradient={showGradient} realtime={false} />;
}

export default Sparkline;

