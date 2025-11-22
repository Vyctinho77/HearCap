import { useEffect, useState } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainPanel } from './components/MainPanel/MainPanel';
import { RightPanel } from './components/RightPanel/RightPanel';
import { Player } from './components/Player/Player';
import { Topbar } from './components/Topbar/Topbar';
import { generateCSSVariables } from './tokens';
import { tradingAssets, TradingAsset } from './components/TokenExplore';
import './App.css';
import layoutState from './state/layoutState';

type TabType = 'tudo' | 'musica' | 'token';

function App() {
  useEffect(() => {
    const root = document.documentElement;
    const variables = generateCSSVariables();
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, []);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMusicFeedLoading, setIsMusicFeedLoading] = useState(false);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);
  const [isTokensLoading, setIsTokensLoading] = useState(false);
  const [isGlobalTableLoading, setIsGlobalTableLoading] = useState(false);
  const [isMusicExploreLoading, setIsMusicExploreLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('tudo');
  const [focusedAsset, setFocusedAsset] = useState<TradingAsset | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const topRankingAssets: TradingAsset[] = tradingAssets.slice(0, 4);

  const handleAssetFocusChange = (asset: TradingAsset | null) => {
    setFocusedAsset(asset);
    setSelectedSymbol(asset?.symbol ?? null);
    if (asset) {
      layoutState.enterAssetOpen();
    } else {
      layoutState.enterCatalog();
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    if (tab === 'tudo') {
      setIsMusicFeedLoading(true);
      setTimeout(() => setIsMusicFeedLoading(false), 1000);
    } else if (tab === 'musica') {
      setIsMusicExploreLoading(true);
      setTimeout(() => setIsMusicExploreLoading(false), 1200);
    }
  };

  useEffect(() => {
    setIsMusicFeedLoading(true);
    setIsPlaylistsLoading(true);
    setIsTokensLoading(true);
    setIsGlobalTableLoading(true);

    const playlistsTimer = setTimeout(() => setIsPlaylistsLoading(false), 800);
    const tokensTimer = setTimeout(() => setIsTokensLoading(false), 1200);
    const feedTimer = setTimeout(() => setIsMusicFeedLoading(false), 1500);
    const tableTimer = setTimeout(() => setIsGlobalTableLoading(false), 1800);

    return () => {
      clearTimeout(playlistsTimer);
      clearTimeout(tokensTimer);
      clearTimeout(feedTimer);
      clearTimeout(tableTimer);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'token') {
      layoutState.enterCatalog();
    }
  }, [activeTab]);

  return (
    <AppLayout
      isSidebarExpanded={isSidebarExpanded}
      topbar={<Topbar />}
      sidebar={
        <Sidebar
          isExpanded={isSidebarExpanded}
          toggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
          focusedAsset={focusedAsset}
          onAssetFocusChange={handleAssetFocusChange}
          isPlaylistsLoading={isPlaylistsLoading}
        />
      }
      main={
        <MainPanel
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isMusicFeedLoading={isMusicFeedLoading}
          isMusicExploreLoading={isMusicExploreLoading}
          selectedSymbol={selectedSymbol}
          onAssetFocusChange={handleAssetFocusChange}
        />
      }
      rightPanel={
        <RightPanel
          assets={topRankingAssets}
          onSelectAsset={(_asset) => handleTabChange('token')}
          onFocusAsset={handleAssetFocusChange}
          isTokensLoading={isTokensLoading}
          isGlobalTableLoading={isGlobalTableLoading}
        />
      }
      player={<Player />}
    />
  );
}

export default App;
