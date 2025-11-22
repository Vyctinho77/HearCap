import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TickerPercentage } from './TickerPercentage';

const blocos = [
  { id: 1, nome: 'Siaaa', percentual: '+4,01%', symbol: 'SIAA' },
  { id: 2, nome: 'Drake', percentual: '+2,33%', symbol: 'DRKE' },
  { id: 3, nome: 'Lorde', percentual: '+3,21%', symbol: 'LORD' },
  { id: 4, nome: 'Kendrick', percentual: '+1,80%', symbol: 'KDK' },
];

const avatarPool = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
];

export interface TradingAsset {
  symbol: string;
  name: string;
  change: string;
  isPositive: boolean;
  price: number;
  volatility: string;
  availability: string;
  avatar: string;
}

const tradingAssetData: Array<Omit<TradingAsset, 'avatar'>> = [
  { symbol: 'GNX', name: 'GNX Collective', change: '+1.58%', isPositive: true, price: 10.04, volatility: '+1.01%', availability: '1.0M USDT' },
  { symbol: 'KDK', name: 'Kendrick', change: '+0.78%', isPositive: true, price: 12.67, volatility: '+0.64%', availability: '850K USDT' },
  { symbol: 'DRKE', name: 'Drake', change: '+2.33%', isPositive: true, price: 9.88, volatility: '+0.92%', availability: '910K USDT' },
  { symbol: 'LORD', name: 'Lorde', change: '+3.21%', isPositive: true, price: 8.45, volatility: '+1.34%', availability: '640K USDT' },
  { symbol: 'SIAA', name: 'Siaaa', change: '+4.01%', isPositive: true, price: 11.02, volatility: '+1.42%', availability: '1.3M USDT' },
  { symbol: 'DJCT', name: 'Kuwait', change: '+2.5867%', isPositive: true, price: 7.91, volatility: '+0.73%', availability: '520K USDT' },
  { symbol: 'BND', name: 'Brandão85', change: '+2.167%', isPositive: true, price: 6.54, volatility: '+0.44%', availability: '470K USDT' },
  { symbol: 'EMM', name: 'Zamáa', change: '+4.667%', isPositive: true, price: 13.05, volatility: '+1.55%', availability: '1.8M USDT' },
  { symbol: 'DTLV', name: 'Don telesi', change: '+1.245%', isPositive: true, price: 5.87, volatility: '+0.32%', availability: '380K USDT' },
  { symbol: 'KHD', name: 'Kuwait', change: '+4.00046%', isPositive: true, price: 10.75, volatility: '+1.21%', availability: '1.1M USDT' },
  { symbol: 'PHK', name: 'Phink Pantheress', change: '-1.6411%', isPositive: false, price: 4.66, volatility: '-0.45%', availability: '290K USDT' },
  { symbol: 'SNP', name: 'Stowy Dog', change: '+3.00036%', isPositive: true, price: 6.11, volatility: '+0.64%', availability: '410K USDT' },
  { symbol: 'IVE', name: 'IVE', change: '-1.4588%', isPositive: false, price: 5.34, volatility: '-0.38%', availability: '360K USDT' },
  { symbol: 'ALK', name: 'Alaska', change: '+0.4785%', isPositive: true, price: 3.92, volatility: '+0.12%', availability: '220K USDT' },
  { symbol: 'RYE', name: 'Rype', change: '-0.5066%', isPositive: false, price: 4.21, volatility: '-0.15%', availability: '250K USDT' },
  { symbol: 'CENT', name: '25 Cent', change: '-2.66%', isPositive: false, price: 2.84, volatility: '-0.74%', availability: '180K USDT' },
];

export const tradingAssets: TradingAsset[] = tradingAssetData.map((asset, index) => ({
  ...asset,
  avatar: avatarPool[index % avatarPool.length],
}));

// Ícone das setas laterais do carrossel
const ArrowIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="9"
    height="29"
    fill="none"
    viewBox="0 0 9 29"
    {...props}
  >
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeWidth="2.085"
      d="m1.043 27.043 6-13-6-13"
    />
  </svg>
);

// Ícone de indicador de volatilidade (triângulo estilo corretora)
const VolatilityIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="8"
    height="7"
    fill="none"
    viewBox="0 0 8 7"
    {...props}
  >
    <path
      fill="#0ecb81"
      d="M3.53.115a.23.23 0 0 1 .398 0l3.5 6.061a.23.23 0 0 1-.199.345h-7a.23.23 0 0 1-.198-.345z"
    />
  </svg>
);

interface TokenExploreProps {
  onAssetClick?: (symbol: string) => void;
  onAssetFocusChange?: (asset: TradingAsset | null) => void;
  onTabChange?: (tab: 'tudo' | 'musica' | 'token') => void;
  activeTab?: 'tudo' | 'musica' | 'token';
  externalSymbol?: string | null;
}

const TokenExplore: React.FC<TokenExploreProps> = ({
  onAssetClick,
  onAssetFocusChange,
  onTabChange,
  activeTab = 'token',
  externalSymbol,
}) => {
  // Começa neutro sem card destacado
  const [ativo, setAtivo] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const proximo = () => {
    setIsResetting(false);
    setAtivo((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % blocos.length;
    });
  };

  const anterior = () => {
    setIsResetting(false);
    setAtivo((prev) => {
      if (prev === null) return blocos.length - 1;
      return (prev - 1 + blocos.length) % blocos.length;
    });
  };

  const handleAssetSelection = (symbol: string) => {
    // Open trading window in new tab
    window.open(`/trade/${symbol}`, '_blank', 'noopener,noreferrer');

    // Still call callbacks for compatibility
    const asset = tradingAssets.find((item) => item.symbol === symbol) ?? null;
    if (asset) {
      onAssetFocusChange?.(asset);
    }
    onAssetClick?.(symbol);
  };

  useEffect(() => {
    if (!externalSymbol) return;
    const exists = tradingAssets.some((asset) => asset.symbol === externalSymbol);
    if (!exists) return;
    handleAssetSelection(externalSymbol);
  }, [externalSymbol]);


  const handleCardClick = (index: number) => {
    setIsResetting(false);
    setAtivo(index);
    const bloco = blocos[index];
    if (bloco?.symbol) {
      handleAssetSelection(bloco.symbol);
    } else {
      onAssetClick?.(String(bloco?.id ?? index));
    }
  };



  return (
    <div
      ref={rootRef}
      style={{
        width: '100%',
        paddingTop: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      {/* Botões de Navegação de Abas */}
      <div
        style={{
          display: 'flex',
          gap: 7,
          marginBottom: 32,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(['tudo', 'musica', 'token'] as const).map((tab) => (
          <button
            key={tab}
            onClick={(e) => {
              e.stopPropagation();
              onTabChange?.(tab);
            }}
            style={{
              width: 98,
              height: 29,
              background: activeTab === tab ? '#fff' : 'transparent',
              color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.7)',
              border: activeTab === tab ? 'none' : '1px solid rgba(255,255,255,0.3)',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Montserrat, sans-serif',
              cursor: 'pointer',
              textTransform: 'capitalize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {tab === 'musica' ? 'Música' : tab === 'token' ? 'Token' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Seção Mais Quentes */}
      <div style={{ marginBottom: 48, width: '100%' }}>
        {/* Header sem navegação */}
        <h2
          style={{
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'Montserrat, sans-serif',
            margin: 0,
            marginBottom: 24,
            letterSpacing: '-0.02em',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Mais quentes
        </h2>

        {/* Carrossel com todas as animações */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 11,
            width: '100%',
            padding: 0,
            margin: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botão anterior */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              anterior();
            }}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              transform: 'rotate(180deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'rotate(180deg) scale(1.25)';
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'rotate(180deg) scale(1.5)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'rotate(180deg) scale(1.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(180deg)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            <ArrowIcon />
          </button>

          {/* Cards */}
          {blocos.map((bloco, index) => {
            const ativoAtual = ativo === index;

            return (
              <motion.div
                key={bloco.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(index);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  margin: 0,
                  padding: 0,
                }}
                initial={{ scale: 0.9, opacity: 0.6, y: 20 }}
                animate={{
                  scale: ativo === null ? 0.92 : ativoAtual ? 1.02 : 0.85,
                  opacity: ativo === null ? 1 : ativoAtual ? 1 : 0.5,
                  y: ativo === null ? 0 : ativoAtual ? 0 : 20,
                }}
                transition={{
                  type: 'spring',
                  stiffness: isResetting ? 200 : 150,
                  damping: isResetting ? 25 : 20,
                  duration: isResetting ? 0.5 : undefined
                }}
              >
                {/* Card */}
                <div style={{ position: 'relative' }}>
                  {ativo !== null && ativoAtual && (
                    <motion.div
                      style={{
                        position: 'absolute',
                        inset: -20,
                        borderRadius: 16,
                        background: 'rgba(168, 85, 247, 0.25)',
                        filter: 'blur(24px)',
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{
                        opacity: [0.2, 0.35, 0.2],
                        scale: [0.95, 1, 0.95],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}

                  <motion.div
                    style={{
                      position: 'relative',
                      width: 161,
                      height: 155,
                      background: 'linear-gradient(135deg, #262626 0%, #404040 100%)',
                      border: '1px solid #525252',
                      borderRadius: 16,
                      overflow: 'hidden',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    }}
                    animate={{
                      scale: ativoAtual ? 1 : 139 / 161
                    }}
                    whileHover={{ scale: ativoAtual ? 1.04 : (139 / 161) * 1.04 }}
                  />
                </div>

                {/* Nome e percentual fora do card com triângulo indicador */}
                <div
                  style={{
                    width: 'auto',
                    marginTop: 4,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'center',
                      }}
                    >
                      {bloco.nome}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <VolatilityIcon
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
                        }}
                      />
                      <span
                        style={{
                          color: '#0ecb81',
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: 'IBM Plex Sans, sans-serif',
                        }}
                      >
                        {bloco.percentual}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Botão próximo */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              proximo();
            }}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.25)';
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(1.5)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            <ArrowIcon />
          </button>
        </div>

        {/* Seção Most Active By USDT Volume */}
        <div style={{ marginTop: 48, width: '100%' }}>
          <h2
            style={{
              color: '#fff',
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'Montserrat, sans-serif',
              margin: 0,
              marginBottom: 24,
              letterSpacing: '-0.02em',
            }}
          >
            Most Active By USDT Volume
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} onClick={(e) => e.stopPropagation()}>
            {/* Grade de Ativos */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 20,
                width: '100%',
              }}
            >
              {tradingAssets.map((asset) => {
                return (
                  <div key={asset.symbol} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    <div
                      style={{
                        position: 'relative',
                        background: 'transparent',
                        border: '0.575px solid rgba(255, 255, 255, 0.5)',
                        borderRadius: 6,
                        width: '100%',
                        height: 38,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingRight: 12,
                        overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                      }}
                      onClick={() => handleAssetSelection(asset.symbol)}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 8,
                          background: asset.isPositive ? '#0ecb81' : '#C750FF',
                          borderRadius: '6px 0 0 6px',
                        }}
                      />
                      <div
                        style={{
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: 'IBM Plex Sans, sans-serif',
                          marginLeft: 20,
                        }}
                      >
                        {asset.symbol}
                      </div>
                      <TickerPercentage
                        symbol={asset.symbol}
                        initialChange={asset.change}
                        isPositive={asset.isPositive}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingLeft: 4,
                      }}
                    >
                      <div
                        style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: 12,
                          fontFamily: 'Montserrat, sans-serif',
                        }}
                      >
                        {asset.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>


          </div>
        </div>

      </div>
    </div>
  );
};

export default TokenExplore;

