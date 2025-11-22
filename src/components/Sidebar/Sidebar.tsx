import React from 'react';
import styles from './Sidebar.module.css';
import SidebarLibraryHeader from '../SidebarLibraryHeader';
import PlaylistStrip from '../PlaylistStrip';
import PlaylistSkeleton from '../skeletons/PlaylistSkeleton';
import type { TradingAsset } from '../TokenExplore';

interface SidebarProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
  focusedAsset: TradingAsset | null;
  onAssetFocusChange: (asset: TradingAsset | null) => void;
  isPlaylistsLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isExpanded,
  toggleSidebar,
  isPlaylistsLoading,
}) => {
  return (
    <div
      className={`${styles.container} ${isExpanded ? styles.expanded : styles.collapsed}`}
      style={{
        padding: isExpanded ? '25px 22px 29px 22px' : '20px 8px',
        gap: isExpanded ? 14 : 12,
      }}
    >
      <SidebarLibraryHeader isExpanded={isExpanded} onToggle={toggleSidebar} />

      <div
        className={styles.scrollArea}
        style={{
          alignItems: isExpanded ? 'flex-start' : 'center',
          paddingLeft: isExpanded ? 10 : 0,
          paddingRight: isExpanded ? 16 : 0,
          paddingBottom: isExpanded ? 8 : 0,
        }}
      >
        {isPlaylistsLoading ? (
          <>
            <PlaylistSkeleton isExpanded={isExpanded} />
            <PlaylistSkeleton isExpanded={isExpanded} />
            <PlaylistSkeleton isExpanded={isExpanded} />
            <PlaylistSkeleton isExpanded={isExpanded} />
            <PlaylistSkeleton isExpanded={isExpanded} />
          </>
        ) : (
          <>
            <PlaylistStrip color="#444444" isExpanded={isExpanded} />
            <PlaylistStrip color="#444444" isExpanded={isExpanded} />
            <PlaylistStrip color="#444444" isExpanded={isExpanded} />
            <PlaylistStrip color="#444444" isExpanded={isExpanded} />
            <PlaylistStrip color="#444444" isExpanded={isExpanded} />
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
