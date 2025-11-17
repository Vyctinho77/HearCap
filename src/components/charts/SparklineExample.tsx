/**
 * Exemplo de uso do Sparkline em diferentes contextos
 */

import { Sparkline } from './Sparkline';

export function SparklineExample() {
  const symbols = ['GNX', 'DRKE', 'KDK', 'LORD', 'SIAA'];

  return (
    <div style={{ padding: 24, background: '#02010A', color: 'white' }}>
      <h2 style={{ marginBottom: 24 }}>Sparkline Examples</h2>

      {/* Exemplo 1: Listagem simples */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Listagem de Ativos</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {symbols.map((symbol) => (
            <div
              key={symbol}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
              }}
            >
              <span style={{ width: 60, fontWeight: 600 }}>{symbol}</span>
              <span style={{ width: 100 }}>10.50 USDT</span>
              <Sparkline symbol={symbol} width={120} height={30} />
              <span style={{ width: 80, color: '#26a69a' }}>+2.5%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Exemplo 2: Tabela */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Tabela de Ranking</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ textAlign: 'left', padding: 12 }}>#</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Símbolo</th>
              <th style={{ textAlign: 'right', padding: 12 }}>Preço</th>
              <th style={{ textAlign: 'center', padding: 12 }}>24h</th>
              <th style={{ textAlign: 'right', padding: 12 }}>Volume</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol, idx) => (
              <tr
                key={symbol}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                }}
              >
                <td style={{ padding: 12 }}>{idx + 1}</td>
                <td style={{ padding: 12, fontWeight: 600 }}>{symbol}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>10.50</td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <Sparkline symbol={symbol} width={100} height={24} />
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>1.2M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Exemplo 3: Cards compactos */}
      <section>
        <h3 style={{ marginBottom: 16 }}>Cards Compactos</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {symbols.map((symbol) => (
            <div
              key={symbol}
              style={{
                padding: 16,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{symbol}</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Sparkline symbol={symbol} width={160} height={40} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>10.50</span>
                <span style={{ color: '#26a69a' }}>+2.5%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SparklineExample;


