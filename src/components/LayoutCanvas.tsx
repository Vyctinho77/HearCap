import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Maximize2, Plus, Check, Bell, X } from 'lucide-react';
import SearchIcon from './SearchIcon';
import SidebarLibraryHeader from './SidebarLibraryHeader';
import PlaylistStrip from './PlaylistStrip';
import BannerCarousel from './BannerCarousel';
import MusicFeed from './MusicFeed';
import MusicExplore from './MusicExplore';
import TokenExplore, { tradingAssets } from './TokenExplore';
import type { TradingAsset } from './TokenExplore';
import AssetTradePanel from './AssetTradePanel';
import PlaylistSkeleton from './skeletons/PlaylistSkeleton';
import TokenSkeleton from './skeletons/TokenSkeleton';
import TableRowSkeleton from './skeletons/TableRowSkeleton';
import { Sparkline } from './charts/Sparkline';

export default function LayoutCanvas() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(20);
  const [volume, setVolume] = useState(80);
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isSaved, setIsSaved] = useState(false);
  const [hoverSave, setHoverSave] = useState(false);
  const [hoverProgress, setHoverProgress] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMusicFeedLoading, setIsMusicFeedLoading] = useState(false);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);
  const [isTokensLoading, setIsTokensLoading] = useState(false);
  const [isGlobalTableLoading, setIsGlobalTableLoading] = useState(false);
  const [isMusicExploreLoading, setIsMusicExploreLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tudo' | 'musica' | 'token'>('tudo');
  const [focusedAsset, setFocusedAsset] = useState<TradingAsset | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

const track = {
    title: 'Carry Go',
    artists: ['Reezy', 'Tym', 'Dr3w', 'Nani'],
    albumArt: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiBmaWxsPSIjMURCOTU0Ii8+PHRleHQgeD0iMjgiIHk9IjMyIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DYXBhPC90ZXh0Pjwvc3ZnPg==',
    duration: 218,
  } as const;

const topRankingAssets: TradingAsset[] = tradingAssets.slice(0, 4);

  const handleAssetFocusChange = (asset: TradingAsset | null) => {
    setFocusedAsset(asset);
    setSelectedSymbol(asset?.symbol ?? null);
  };

  // Simula carregamento inicial de todas as áreas
  useEffect(() => {
    // Ativa loading de todas as áreas
    setIsMusicFeedLoading(true);
    setIsPlaylistsLoading(true);
    setIsTokensLoading(true);
    setIsGlobalTableLoading(true);

    // Playlists carregam primeiro (800ms)
    const playlistsTimer = setTimeout(() => {
      setIsPlaylistsLoading(false);
    }, 800);

    // Tokens carregam em seguida (1200ms)
    const tokensTimer = setTimeout(() => {
      setIsTokensLoading(false);
    }, 1200);

    // Feed de música - aba "Tudo" (1500ms)
    const feedTimer = setTimeout(() => {
      setIsMusicFeedLoading(false);
    }, 1500);

    // Tabela global por último (1800ms)
    const tableTimer = setTimeout(() => {
      setIsGlobalTableLoading(false);
    }, 1800);

    return () => {
      clearTimeout(playlistsTimer);
      clearTimeout(tokensTimer);
      clearTimeout(feedTimer);
      clearTimeout(tableTimer);
    };
  }, []);

  useEffect(() => {
    if (isPlaying && currentTime < track.duration) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime((p) => Math.min(p + 1, track.duration));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentTime, track.duration]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newVolume = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    setVolume(newVolume);
  };

  const sidebarWidth = isSidebarExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)';
  const centerWidth = isSidebarExpanded ? 'var(--center-width-expanded)' : 'var(--center-width-collapsed)';

  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', minWidth: 1024 }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 'var(--search-width)', height: 'var(--search-height)', background: '#1c1c1c', borderRadius: 9999, padding: '0 16px', display: 'flex', alignItems: 'center', zIndex: 50 }}>
        <SearchIcon />
        <input type="text" placeholder="Search..." style={{ flex: 1, height: '100%', background: 'transparent', color: '#fff', paddingLeft: 10, outline: 'none', border: 'none', fontSize: 14 }} />
      </div>

      {/* Right actions */}
      <div style={{ position: 'absolute', top: 'calc(14px + var(--search-height) / 2)', transform: 'translateY(-50%)', right: 20, display: 'flex', alignItems: 'center', gap: 12, zIndex: 60 }}>
        <Bell size={22} color="#C750FF" style={{ cursor: 'pointer' }} />
        <button style={{ background: '#C750FF', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 20, width: 98, height: 29, cursor: 'pointer', fontSize: 12, fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Login</button>
      </div>

      {/* Panels */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--margin-top)', marginBottom: 'var(--margin-bottom)', gap: 'var(--gap-panels)', padding: '0 8px', flex: 1 }}>
        {/* Left Sidebar - Recolhível */}
        <div 
          style={{ 
            background: '#171717', 
            borderRadius: 20, 
            width: sidebarWidth, 
            height: 'var(--panel-height)', 
            padding: isSidebarExpanded ? '25px 22px 29px 22px' : '20px 0',
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: isSidebarExpanded ? 14 : 0,
            overflow: 'hidden',
          }}
        >
          <SidebarLibraryHeader 
            isExpanded={isSidebarExpanded} 
            onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)} 
          />

          {focusedAsset && isSidebarExpanded && (
            <div
              data-trade-panel="true"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 18,
                padding: 16,
                background: 'linear-gradient(135deg, rgba(12,12,16,0.95), rgba(20,20,28,0.95))',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <img
                    src={focusedAsset.avatar}
                    alt={focusedAsset.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.28em',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    Ativo selecionado
                  </p>
                  <h3 style={{ margin: '4px 0 0', color: '#fff', fontSize: 16, fontWeight: 600 }}>
                    {focusedAsset.name}{' '}
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>/ {focusedAsset.symbol}</span>
                  </h3>
                </div>
                 <button
                   onClick={() => handleAssetFocusChange(null)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 999,
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <AssetTradePanel symbol={focusedAsset.symbol} />
            </div>
          )}
          
          {/* Área de Playlists - Alinhada à Esquerda */}
          <div
            className="scroll-container-thin"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isSidebarExpanded ? 'flex-start' : 'center',
              gap: 20,
              paddingLeft: isSidebarExpanded ? 10 : 0,
              paddingRight: isSidebarExpanded ? 16 : 0,
              paddingBottom: isSidebarExpanded ? 8 : 0,
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {isPlaylistsLoading ? (
              <>
                <PlaylistSkeleton isExpanded={isSidebarExpanded} />
                <PlaylistSkeleton isExpanded={isSidebarExpanded} />
                <PlaylistSkeleton isExpanded={isSidebarExpanded} />
                <PlaylistSkeleton isExpanded={isSidebarExpanded} />
                <PlaylistSkeleton isExpanded={isSidebarExpanded} />
              </>
            ) : (
              <>
                <PlaylistStrip color="#444444" isExpanded={isSidebarExpanded} />
                <PlaylistStrip color="#444444" isExpanded={isSidebarExpanded} />
                <PlaylistStrip color="#444444" isExpanded={isSidebarExpanded} />
                <PlaylistStrip color="#444444" isExpanded={isSidebarExpanded} />
                <PlaylistStrip color="#444444" isExpanded={isSidebarExpanded} />
              </>
            )}
          </div>
        </div>

        {/* Center */}
        <div 
          style={{ 
            background: '#171717', 
            borderRadius: 20, 
            width: centerWidth, 
            height: 'var(--panel-height)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }} 
        >
          {/* Banner ocupa o topo do painel - NÃO aparece na aba Token */}
          {activeTab !== 'token' && (
            <BannerCarousel 
              isSidebarExpanded={isSidebarExpanded}
              onTabChange={(tab) => {
                setActiveTab(tab);
                // Simula carregamento ao trocar de categoria
                if (tab === 'tudo') {
                  setIsMusicFeedLoading(true);
                  setTimeout(() => {
                    setIsMusicFeedLoading(false);
                  }, 1000);
                } else if (tab === 'musica') {
                  setIsMusicExploreLoading(true);
                  setTimeout(() => {
                    setIsMusicExploreLoading(false);
                  }, 1200);
                }
                console.log('Aba ativa:', tab);
              }}
            />
          )}
          
          {/* Conteúdo abaixo do banner (ou topo na aba Token) */}
          <div 
            className="scroll-container-hover"
            style={{ 
              padding: activeTab === 'token' ? '24px' : '20px 24px 24px 24px',
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {/* Renderização condicional baseada na aba ativa */}
            {activeTab === 'tudo' && (
              <MusicFeed 
                onTrackPlay={(trackId) => {
                  console.log('Playing track:', trackId);
                }}
                isLoading={isMusicFeedLoading}
              />
            )}
            
            {activeTab === 'musica' && (
              <MusicExplore
                onItemClick={(itemId) => {
                  console.log('Clicked on item:', itemId);
                }}
                isLoading={isMusicExploreLoading}
              />
            )}

            {activeTab === 'token' && (
              <TokenExplore
                onAssetClick={(symbol) => {
                  console.log('Clicked on asset:', symbol);
                }}
                onAssetFocusChange={handleAssetFocusChange}
                externalSymbol={selectedSymbol}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  if (tab === 'tudo') {
                    setIsMusicFeedLoading(true);
                    setTimeout(() => {
                      setIsMusicFeedLoading(false);
                    }, 1000);
                  } else if (tab === 'musica') {
                    setIsMusicExploreLoading(true);
                    setTimeout(() => {
                      setIsMusicExploreLoading(false);
                    }, 1200);
                  }
                }}
                activeTab={activeTab}
              />
            )}
          </div>
        </div>

        {/* Right Panel - TOP 4 Ativos / Detalhes */}
        <div style={{ 
          background: '#171717', 
          borderRadius: 20, 
          width: 'var(--right-panel-width)', 
          height: 'var(--panel-height)',
          padding: '25px 22px 29px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflow: 'hidden',
        }}>
          {/* Título */}
          <h2 style={{
            color: '#fff',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            fontSize: 18,
            margin: 0,
          }}>
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
              topRankingAssets.map((asset) => (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => {
                    setActiveTab('token');
                    handleAssetFocusChange(asset);
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkline symbol={asset.symbol} width={60} height={18} realtime={true} />
                      <div
                        style={{
                          color: asset.isPositive ? '#0F0' : '#f43f5e',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {asset.change}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: '#333' }} />

          {/* Seção GLOBAL */}
          <div 
            className="scroll-container-thin"
            style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 14,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <div style={{
              color: '#C750FF',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <div style={{ width: 3, height: 12, background: '#C750FF', borderRadius: 2 }} />
              GLOBAL
            </div>

            {/* Header da tabela */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.2fr 0.9fr 0.7fr 0.9fr',
              gap: 8,
              color: '#888',
              fontSize: 10,
              fontWeight: 600,
              paddingBottom: 6,
              borderBottom: '1px solid #333',
            }}>
              <div>Symbol</div>
              <div style={{ textAlign: 'center' }}>Last</div>
              <div style={{ textAlign: 'center' }}>24h</div>
              <div style={{ textAlign: 'right' }}>Change</div>
            </div>

            {/* Linhas da tabela */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isGlobalTableLoading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : (
                <>
              {/* COMP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.7fr 0.9fr', gap: 8, alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>COMP</div>
                  <div style={{ color: '#666', fontSize: 10 }}>Compound</div>
                </div>
                <div style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>22,856.73</div>
                <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                  <Sparkline symbol="COMP" width={60} height={20} realtime={true} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#0F0', fontSize: 11, fontWeight: 600 }}>+161.57</div>
                  <div style={{ color: '#0F0', fontSize: 10 }}>+0.45%</div>
                </div>
              </div>

              {/* HRC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.7fr 0.9fr', gap: 8, alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>HRC</div>
                  <div style={{ color: '#666', fontSize: 10 }}>HRC</div>
                </div>
                <div style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>24,903.07</div>
                <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                  <Sparkline symbol="HRC" width={60} height={20} realtime={true} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#0F0', fontSize: 11, fontWeight: 600 }}>+152.71</div>
                  <div style={{ color: '#0F0', fontSize: 10 }}>+0.41%</div>
                </div>
              </div>

              {/* HCAP500L */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.7fr 0.9fr', gap: 8, alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>HCAP500L</div>
                  <div style={{ color: '#666', fontSize: 10 }}>CE_500</div>
                </div>
                <div style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>3,563.72</div>
                <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                  <Sparkline symbol="HCAP500L" width={60} height={20} realtime={true} />
                </div>
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
      </div>

      {/* Footer */}
      <footer style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 14, height: 'var(--footer-height)', width: 'var(--footer-width)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.45)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <img src={track.albumArt} alt="Album Art" width={52} height={52} style={{ borderRadius: 8, marginRight: 8, objectFit: 'cover', alignSelf: 'center' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.1 }}>
            <div style={{ color: '#e5e5e5', fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{track.title}</div>
            <div style={{ color: '#b3b3b3', fontSize: 13 }}>{track.artists.join(', ')}</div>
          </div>
          <button
            onMouseEnter={() => setHoverSave(true)}
            onMouseLeave={() => setHoverSave(false)}
            onClick={() => setIsSaved(!isSaved)}
            title="Salvar música"
            style={{
              background: 'transparent',
              cursor: 'pointer',
              position: 'absolute',
              left: 300,
              top: '20%',
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              color: isSaved ? '#C750FF' : hoverSave ? '#fff' : '#b3b3b3',
              border: isSaved ? '1px solid #C750FF' : hoverSave ? '1px solid #fff' : '1px solid rgba(179,179,179,0.4)',
              transition: 'all 150ms ease'
            }}
          >
            {isSaved ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Shuffle size={18} color={isShuffled ? '#C750FF' : '#b3b3b3'} style={{ cursor: 'pointer' }} onClick={() => setIsShuffled(!isShuffled)} />
            <SkipBack size={20} color="#fff" style={{ cursor: 'pointer' }} />
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: '#C750FF', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {isPlaying ? <Pause size={20} color="#fff" strokeLinecap="round" strokeLinejoin="round" /> : <Play size={20} color="#fff" strokeLinecap="round" strokeLinejoin="round" />}
            </button>
            <SkipForward size={20} color="#fff" style={{ cursor: 'pointer' }} />
            <Repeat 
              size={18} 
              color={repeatMode !== 'off' ? '#C750FF' : '#b3b3b3'} 
              style={{ cursor: 'pointer' }}
              onClick={() => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')}
            />
          </div>

          <div
            onMouseEnter={() => setHoverProgress(true)}
            onMouseLeave={() => setHoverProgress(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: 442 }}
          >
            <span style={{ color: '#b3b3b3', fontSize: 12, width: 30, textAlign: 'right' }}>{formatTime(currentTime)}</span>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: '#333', position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: `${(currentTime / track.duration) * 100}%`, height: '100%', background: '#C750FF', borderRadius: 4 }} />
              <div
                style={{
                  position: 'absolute',
                  left: `${(currentTime / track.duration) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: hoverProgress ? '#C750FF' : 'transparent',
                  transition: 'background 0.2s ease',
                }}
              />
            </div>
            <span style={{ color: '#b3b3b3', fontSize: 12, width: 30 }}>{formatTime(track.duration)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <Volume2 size={18} color="#fff" />
          <div
            style={{ width: 80, height: 4, background: '#333', borderRadius: 4, position: 'relative', cursor: 'pointer' }}
            onMouseDown={(e) => { setIsAdjustingVolume(true); handleVolumeChange(e); }}
            onMouseMove={(e) => isAdjustingVolume && handleVolumeChange(e)}
            onMouseUp={() => setIsAdjustingVolume(false)}
            onMouseLeave={() => setIsAdjustingVolume(false)}
          >
            <div style={{ width: `${volume}%`, height: '100%', background: '#C750FF', borderRadius: 4 }} />
            <div style={{ position: 'absolute', left: `${volume}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: '#C750FF' }} />
          </div>
          <Maximize2 size={18} color="#fff" style={{ cursor: 'pointer' }} />
        </div>
      </footer>
    </div>
  );
}

