import React from 'react';
import styles from './MainPanel.module.css';
import BannerCarousel from '../BannerCarousel';
import MusicFeed from '../MusicFeed';
import MusicExplore from '../MusicExplore';
import TokenExplore, { TradingAsset } from '../TokenExplore';

interface MainPanelProps {
  activeTab: 'tudo' | 'musica' | 'token';
  onTabChange: (tab: 'tudo' | 'musica' | 'token') => void;
  isMusicFeedLoading: boolean;
  isMusicExploreLoading: boolean;
  selectedSymbol: string | null;
  onAssetFocusChange: (asset: TradingAsset | null) => void;
}

export const MainPanel: React.FC<MainPanelProps> = ({
  activeTab,
  onTabChange,
  isMusicFeedLoading,
  isMusicExploreLoading,
  selectedSymbol,
  onAssetFocusChange,
}) => {
  return (
    <div className={styles.container}>
      {activeTab !== 'token' && (
        <BannerCarousel onTabChange={onTabChange} />
      )}

      <div
        className={styles.content}
        style={{
          padding: activeTab === 'token' ? '24px' : '20px 24px 24px 24px',
        }}
      >
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
            onAssetFocusChange={onAssetFocusChange}
            externalSymbol={selectedSymbol}
            onTabChange={onTabChange}
            activeTab={activeTab}
          />
        )}
      </div>
    </div>
  );
};

export default MainPanel;
