interface PlaylistStripProps {
  color: string;
  isExpanded: boolean;
}

function PlaylistStrip({ color, isExpanded }: PlaylistStripProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      {/* Quadrado da thumbnail */}
      <div
        style={{
          width: isExpanded ? '60px' : '40px',
          height: isExpanded ? '60px' : '40px',
          background: color,
          borderRadius: '8px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: 0.8,
          flexShrink: 0,
        }}
      />
      
      {/* Skeleton de título e subtítulo - apenas quando expandido */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Título */}
          <div
            style={{
              width: '140px',
              height: '14px',
              background: '#444444',
              borderRadius: '4px',
              opacity: 0.6,
            }}
          />
          {/* Subtítulo */}
          <div
            style={{
              width: '80px',
              height: '12px',
              background: '#444444',
              borderRadius: '4px',
              opacity: 0.4,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default PlaylistStrip;

