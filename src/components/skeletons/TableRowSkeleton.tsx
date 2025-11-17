import React from 'react';

const TableRowSkeleton: React.FC = () => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.9fr 0.9fr',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {/* Coluna Symbol */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div
          className="skeleton skeleton-title"
          style={{
            width: '60%',
            height: 13,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
        <div
          className="skeleton skeleton-text"
          style={{
            width: '50%',
            height: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
      </div>

      {/* Coluna Last */}
      <div
        style={{
          textAlign: 'center',
        }}
      >
        <div
          className="skeleton skeleton-text"
          style={{
            width: '70%',
            height: 12,
            margin: '0 auto',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
      </div>

      {/* Coluna Change */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'flex-end',
        }}
      >
        <div
          className="skeleton skeleton-text"
          style={{
            width: '50%',
            height: 11,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
        <div
          className="skeleton skeleton-text"
          style={{
            width: '40%',
            height: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />
      </div>
    </div>
  );
};

export default TableRowSkeleton;

