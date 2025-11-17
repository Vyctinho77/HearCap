import React from 'react';

const MusicCardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 8px',
      }}
    >
      {/* Capa Skeleton 48x48 */}
      <div
        className="skeleton"
        style={{
          width: 48,
          height: 48,
          borderRadius: 4,
          flexShrink: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        }}
      />

      {/* Info da Música Skeleton */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* Título */}
        <div
          className="skeleton skeleton-title"
          style={{
            width: '70%',
            height: 13,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
        {/* Artista */}
        <div
          className="skeleton skeleton-text"
          style={{
            width: '50%',
            height: 11,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
      </div>

      {/* Espaço para os 3 pontinhos */}
      <div style={{ width: 24, flexShrink: 0 }} />
    </div>
  );
};

export default MusicCardSkeleton;

