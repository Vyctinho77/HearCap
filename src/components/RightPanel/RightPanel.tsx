import React from 'react';
import styles from './RightPanel.module.css';
import TokenSkeleton from '../skeletons/TokenSkeleton';
import TableRowSkeleton from '../skeletons/TableRowSkeleton';
import { TickerPercentage } from '../TickerPercentage';
import type { TradingAsset } from '../TokenExplore';

interface RightPanelProps {
  assets: TradingAsset[];
  onSelectAsset: (asset: TradingAsset) => void;
  onFocusAsset: (asset: TradingAsset) => void;
  isTokensLoading: boolean;
  isGlobalTableLoading: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  assets,
  onSelectAsset,
  onFocusAsset,
  isTokensLoading,
  isGlobalTableLoading,
}) => {
  return (
    <div className={styles.container}>
      <h2
        style={{
          color: '#fff',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700,
          fontSize: 18,
          margin: 0,
        }}
      >
        TOP 4 Ativos
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isTokensLoading ? (
          <>
            <TokenSkeleton />
            <TokenSkeleton />
            <TokenSkeleton />
            <TokenSkeleton />
          </>
        ) : (
          assets.map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => {
                onSelectAsset(asset);
                onFocusAsset(asset);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: `url(${asset.avatar}) center/cover no-repeat, #444`,
                  borderRadius: 8,
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                  {asset.symbol}
                  <span style={{ color: '#666' }}>/USDT</span>
                </div>
                <div style={{ color: '#888', fontSize: 11 }}>{asset.availability}</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
                  {asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <TickerPercentage
                  symbol={asset.symbol}
                  initialChange={asset.change}
                  isPositive={asset.isPositive}
                />
              </div>
            </button>
          ))
        )}
      </div>

      <div style={{ height: 1, background: '#333' }} />

      <div className={styles.scrollArea}>
        <div
          style={{
            color: '#C750FF',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div style={{ width: 3, height: 12, background: '#C750FF', borderRadius: 2 }} />
          GLOBAL
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.9fr 0.9fr',
            gap: 8,
            color: '#888',
            fontSize: 10,
            fontWeight: 600,
            paddingBottom: 6,
            borderBottom: '1px solid #333',
          }}
        >
          <div>Symbol</div>
          <div style={{ textAlign: 'center' }}>Last</div>
          <div style={{ textAlign: 'right' }}>Change</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isGlobalTableLoading ? (
            <>
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.9fr', gap: 8, alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>COMP</div>
                  <div style={{ color: '#666', fontSize: 10 }}>Compound</div>
                </div>
                <div style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>22,856.73</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#0F0', fontSize: 11, fontWeight: 600 }}>+161.57</div>
                  <div style={{ color: '#0F0', fontSize: 10 }}>+0.45%</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.9fr', gap: 8, alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>HRC</div>
                  <div style={{ color: '#666', fontSize: 10 }}>HRC</div>
                </div>
                <div style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>24,903.07</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#0F0', fontSize: 11, fontWeight: 600 }}>+152.71</div>
                  <div style={{ color: '#0F0', fontSize: 10 }}>+0.41%</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.9fr', gap: 8, alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>HCAP500L</div>
                  <div style={{ color: '#666', fontSize: 10 }}>CE_500</div>
                </div>
                <div style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>3,563.72</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#0F0', fontSize: 11, fontWeight: 600 }}>+5.82</div>
                  <div style={{ color: '#0F0', fontSize: 10 }}>+0.38%</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
