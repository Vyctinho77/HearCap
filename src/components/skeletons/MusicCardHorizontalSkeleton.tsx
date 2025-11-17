import React from 'react';

const MusicCardHorizontalSkeleton: React.FC = () => {
  return (
    <div
      style={{
        minWidth: 160,
      }}
    >
      {/* Capa Skeleton 160x160 */}
      <div
        className="skeleton"
        style={{
          width: 160,
          height: 160,
          borderRadius: 8,
          marginBottom: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        }}
      />

      {/* Info Skeleton */}
      <div style={{ paddingRight: 8 }}>
        {/* Título */}
        <div
          className="skeleton skeleton-title"
          style={{
            width: '80%',
            height: 14,
            marginBottom: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
        {/* Artista */}
        <div
          className="skeleton skeleton-text"
          style={{
            width: '60%',
            height: 13,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
      </div>
    </div>
  );
};

export default MusicCardHorizontalSkeleton;

