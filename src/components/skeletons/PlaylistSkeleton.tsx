import React from 'react';

interface PlaylistSkeletonProps {
  isExpanded?: boolean;
}

const PlaylistSkeleton: React.FC<PlaylistSkeletonProps> = ({ isExpanded = true }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isExpanded ? 12 : 0,
        width: '100%',
      }}
    >
      {/* Capa Skeleton */}
      <div
        className="skeleton"
        style={{
          width: isExpanded ? 56 : 48,
          height: isExpanded ? 56 : 48,
          borderRadius: 8,
          flexShrink: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        }}
      />

      {/* Info Skeleton - só aparece quando expandido */}
      {isExpanded && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minWidth: 0,
          }}
        >
          {/* Título */}
          <div
            className="skeleton skeleton-title"
            style={{
              width: '70%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
          />
          {/* Artista */}
          <div
            className="skeleton skeleton-text"
            style={{
              width: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PlaylistSkeleton;

