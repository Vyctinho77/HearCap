import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  Time, 
  ColorType,
  CandlestickSeries 
} from 'lightweight-charts';
import { fetchCandles, type Candle } from '../lib/marketdata/candles';
import { CandlesWSClient } from '../lib/ws/candles';

interface HearCapChartProps {
  symbol: string;
  height?: number;
  interval?: string;
}

/**
 * Converte candle do backend para formato Lightweight Charts
 */
function candleToLWCData(candle: Candle): CandlestickData {
  // Lightweight Charts aceita time como number (timestamp em segundos) ou string (YYYY-MM-DD)
  let time: Time;
  
  try {
    const date = new Date(candle.openTime);
    if (isNaN(date.getTime())) {
      console.error('[HearCapChart] Data inválida:', candle.openTime);
      // Fallback: usa timestamp atual
      time = (Date.now() / 1000) as Time;
    } else {
      time = (date.getTime() / 1000) as Time;
    }
  } catch (e) {
    console.error('[HearCapChart] Erro ao converter data:', e, candle);
    time = (Date.now() / 1000) as Time;
  }
  
  const data: CandlestickData = {
    time,
    open: Number(candle.open) || 0,
    high: Number(candle.high) || 0,
    low: Number(candle.low) || 0,
    close: Number(candle.close) || 0,
  };

  // Validação básica
  if (data.open === 0 && data.high === 0 && data.low === 0 && data.close === 0) {
    console.warn('[HearCapChart] Candle com valores zero:', candle);
  }

  return data;
}

export function HearCapChart({ symbol, height = 420, interval = '5m' }: HearCapChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsClientRef = useRef<CandlesWSClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let isCancelled = false;

    const initializeChart = async () => {
      try {
        // Cria o gráfico
        const chart = createChart(containerRef.current!, {
          width: containerRef.current!.clientWidth,
          height: height,
          layout: {
            background: { type: ColorType.Solid, color: '#050509' },
            textColor: '#DDD',
          },
          grid: {
            vertLines: {
              color: 'rgba(255, 255, 255, 0.06)',
            },
            horzLines: {
              color: 'rgba(255, 255, 255, 0.06)',
            },
          },
          crosshair: {
            mode: 0, // Normal crosshair
          },
          rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
          timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true,
            secondsVisible: false,
            barSpacing: 2, // Espaçamento mínimo entre barras
            minBarSpacing: 1, // Espaçamento mínimo absoluto
            rightOffset: 10, // Espaço à direita
          },
        });

        chartRef.current = chart;

        // Adiciona série de candlestick
        const candlestickSeriesInstance = chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });

        seriesRef.current = candlestickSeriesInstance as ISeriesApi<'Candlestick'>;

        // Busca candles históricos
        setIsLoading(true);
        setError(null);

        try {
          console.log('[HearCapChart] Buscando candles para', symbol, 'intervalo', interval);
          // Carrega menos candles para melhor performance e visualização
        const candles = await fetchCandles(symbol, interval, 200);
          
          if (isCancelled) return;

          console.log('[HearCapChart] Candles recebidos:', candles.length);
          
          if (candles.length === 0) {
            // Se não há candles, tenta usar mock automaticamente
            console.log('[HearCapChart] Nenhum candle retornado, usando dados mock');
            try {
              const { generateMockCandles } = await import('../lib/marketdata/candles');
              const mockCandles = generateMockCandles(symbol, interval, 200);
              const chartData = mockCandles.map(candleToLWCData);
              candlestickSeriesInstance.setData(chartData);
              
              if (chartData.length > 0) {
                const visibleCandles = Math.min(100, chartData.length);
                const lastCandle = chartData[chartData.length - 1];
                const firstVisibleCandle = chartData[Math.max(0, chartData.length - visibleCandles)];
                
                chart.timeScale().setVisibleRange({
                  from: firstVisibleCandle.time,
                  to: lastCandle.time,
                });
              }
              setIsLoading(false);
              return;
            } catch (mockErr) {
              console.error('[HearCapChart] Erro ao gerar mock:', mockErr);
              setError('Nenhum dado disponível');
              setIsLoading(false);
              return;
            }
          }

          const chartData = candles.map(candleToLWCData);
          console.log('[HearCapChart] Dados convertidos:', chartData.length, 'primeiro:', chartData[0]);
          
          candlestickSeriesInstance.setData(chartData);

          // Ajusta o viewport para mostrar os últimos candles (apenas os últimos 100 para melhor visualização)
          if (chartData.length > 0) {
            const visibleCandles = Math.min(100, chartData.length);
            const lastCandle = chartData[chartData.length - 1];
            const firstVisibleCandle = chartData[Math.max(0, chartData.length - visibleCandles)];
            
            // Define o range visível para mostrar apenas os últimos candles
            chart.timeScale().setVisibleRange({
              from: firstVisibleCandle.time,
              to: lastCandle.time,
            });
          }

          setIsLoading(false);
        } catch (err) {
          console.error('[HearCapChart] Erro ao buscar candles:', err);
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
          setIsLoading(false);
        }

        // Conecta WebSocket para atualizações em tempo real (opcional - não bloqueia se falhar)
        try {
          const wsClient = new CandlesWSClient(
            symbol,
            interval,
            (candleUpdate) => {
              if (isCancelled || !candlestickSeriesInstance) return;

              try {
                // Atualiza o último candle ou adiciona um novo
                const time = (new Date(candleUpdate.openTime).getTime() / 1000) as Time;
                const update: CandlestickData = {
                  time,
                  open: candleUpdate.open,
                  high: candleUpdate.high,
                  low: candleUpdate.low,
                  close: candleUpdate.close,
                };

                // Verifica se já existe um candle com esse time
                const existingData = candlestickSeriesInstance.data();
                const lastCandle = existingData[existingData.length - 1];
                
                if (lastCandle && lastCandle.time === time) {
                  // Atualiza o candle existente
                  candlestickSeriesInstance.update(update);
                } else {
                  // Adiciona novo candle (precisa adicionar ao array completo)
                  const newData = [...existingData, update];
                  candlestickSeriesInstance.setData(newData);
                  
                  // Mantém apenas os últimos 500 candles
                  if (newData.length > 500) {
                    candlestickSeriesInstance.setData(newData.slice(-500));
                  }
                }
              } catch (wsErr) {
                console.warn('[HearCapChart] Erro ao processar update do WebSocket:', wsErr);
              }
            }
          );

          wsClient.connect();
          wsClientRef.current = wsClient;
        } catch (wsError) {
          // WebSocket é opcional - não bloqueia o gráfico se falhar
          console.warn('[HearCapChart] WebSocket não disponível, usando apenas dados históricos:', wsError);
        }

        // Ajusta tamanho quando a janela redimensiona
        const handleResize = () => {
          if (chart && containerRef.current) {
            chart.applyOptions({
              width: containerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          isCancelled = true;
          window.removeEventListener('resize', handleResize);
          if (wsClientRef.current) {
            wsClientRef.current.disconnect();
          }
          chart.remove();
        };
      } catch (err) {
        console.error('[HearCapChart] Erro ao inicializar gráfico:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setIsLoading(false);
      }
    };

    const cleanup = initializeChart();

    return () => {
      isCancelled = true;
      cleanup.then((cleanupFn) => {
        if (cleanupFn) cleanupFn();
      }).catch(() => {
        // Ignora erros no cleanup
      });
    };
  }, [symbol, interval, height]);

  return (
    <div
      style={{
        width: '100%',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.05)',
        background: '#050509',
        padding: 16,
        minHeight: height + 32,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
          }}
        >
          Carregando gráfico...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ef5350',
            fontSize: 14,
          }}
        >
          Erro: {error}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          minHeight: height,
          position: 'relative',
        }}
      />
    </div>
  );
}

export default HearCapChart;
