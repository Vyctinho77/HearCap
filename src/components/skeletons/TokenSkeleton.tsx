import React from 'react';

const TokenSkeleton: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Ícone Skeleton */}
      <div
        className="skeleton"
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          flexShrink: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        }}
      />

      {/* Info Esquerda */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* Nome do Token */}
        <div
          className="skeleton skeleton-title"
          style={{
            width: '60%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
        {/* Volume */}
        <div
          className="skeleton skeleton-text"
          style={{
            width: '50%',
            height: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
      </div>

      {/* Info Direita (Preço) */}
      <div
        style={{
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* Preço */}
        <div
          className="skeleton skeleton-title"
          style={{
            width: 70,
            marginLeft: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
        {/* Percentual */}
        <div
          className="skeleton skeleton-text"
          style={{
            width: 50,
            height: 10,
            marginLeft: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
      </div>
    </div>
  );
};

export default TokenSkeleton;

