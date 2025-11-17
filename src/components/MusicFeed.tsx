import React, { useState } from 'react';
import { Play, MoreVertical } from 'lucide-react';
import MusicCardSkeleton from './skeletons/MusicCardSkeleton';

interface MusicTrack {
  id: number;
  title: string;
  artist: string;
  cover: string;
  duration: string;
}

const mockTracks: MusicTrack[] = [
  {
    id: 1,
    title: 'Carry Go',
    artist: 'Reezy, Tym',
    cover: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    duration: '3:38',
  },
  {
    id: 2,
    title: 'Neon Dreams',
    artist: 'Luna Star',
    cover: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    duration: '4:12',
  },
  {
    id: 3,
    title: 'Digital Horizons',
    artist: 'Echo Wave',
    cover: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    duration: '3:45',
  },
  {
    id: 4,
    title: 'Golden Hour',
    artist: 'Sunset Vibes',
    cover: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    duration: '2:58',
  },
  {
    id: 5,
    title: 'Blue Notes',
    artist: 'Midnight Jazz',
    cover: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    duration: '5:21',
  },
  {
    id: 6,
    title: 'Cosmic Waves',
    artist: 'Star Rider',
    cover: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    duration: '4:05',
  },
  {
    id: 7,
    title: 'Urban Pulse',
    artist: 'City Nights',
    cover: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    duration: '3:32',
  },
  {
    id: 8,
    title: 'Velvet Sky',
    artist: 'Dream Catcher',
    cover: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    duration: '4:48',
  },
  {
    id: 9,
    title: 'Electric Soul',
    artist: 'Neon Pulse',
    cover: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    duration: '3:15',
  },
  {
    id: 10,
    title: 'Midnight Run',
    artist: 'Shadow Walker',
    cover: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    duration: '4:22',
  },
  {
    id: 11,
    title: 'Solar Flare',
    artist: 'Cosmic DJ',
    cover: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)',
    duration: '3:55',
  },
  {
    id: 12,
    title: 'Ocean Breeze',
    artist: 'Wave Rider',
    cover: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    duration: '4:33',
  },
];

interface MusicFeedProps {
  onTrackPlay?: (trackId: number) => void;
  isLoading?: boolean;
  loadingCount?: number; // Quantos skeletons mostrar durante loading
}

const MusicFeed: React.FC<MusicFeedProps> = ({ onTrackPlay, isLoading = false, loadingCount = 12 }) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        marginTop: 52,
      }}
    >
      {/* Título */}
      <h2
        style={{
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          fontFamily: 'Montserrat, sans-serif',
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        Para você
      </h2>

      {/* Grid de 3 colunas com layout compacto */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px 16px',
          width: '100%',
        }}
      >
        {isLoading ? (
          // Mostra skeletons quando está carregando
          Array.from({ length: loadingCount }).map((_, index) => (
            <MusicCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          // Mostra as músicas normalmente
          mockTracks.map((track) => (
            <div
              key={track.id}
              onMouseEnter={() => setHoveredRow(track.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: hoveredRow === track.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                transition: 'background 0.2s ease',
              }}
              onClick={() => onTrackPlay?.(track.id)}
            >
              {/* Capa 48x48 */}
              <div
                style={{
                  position: 'relative',
                  width: 48,
                  height: 48,
                  background: track.cover,
                  borderRadius: 4,
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Play Button - aparece no hover */}
                {hoveredRow === track.id && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play
                      size={20}
                      color="#fff"
                      fill="#fff"
                      style={{
                        marginLeft: 1,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Info da Música */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'Montserrat, sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {track.title}
                </span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 11,
                    fontFamily: 'Montserrat, sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {track.artist}
                </span>
              </div>

              {/* 3 pontinhos */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle options menu
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: hoveredRow === track.id ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <MoreVertical size={16} color="rgba(255,255,255,0.7)" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MusicFeed;

