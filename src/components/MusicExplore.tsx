import React from 'react';
import MusicCardHorizontalSkeleton from './skeletons/MusicCardHorizontalSkeleton';

interface MusicCard {
  id: number;
  title: string;
  artist: string;
  cover: string;
  type?: 'album' | 'single' | 'playlist';
}

interface MusicSectionProps {
  title: string;
  items: MusicCard[];
  onItemClick?: (id: number) => void;
  isLoading?: boolean;
}

const HorizontalMusicSection: React.FC<MusicSectionProps> = ({ title, items, onItemClick, isLoading = false }) => {
  const [hoveredItem, setHoveredItem] = React.useState<number | null>(null);

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Título da Seção */}
      <h3
        style={{
          color: '#fff',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'Montserrat, sans-serif',
          marginBottom: 16,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h3>

      {/* Scroll Horizontal */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 12,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        }}
      >
        {isLoading ? (
          // Mostra skeletons quando está carregando
          Array.from({ length: 6 }).map((_, index) => (
            <MusicCardHorizontalSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          // Mostra os cards normalmente
          items.map((item) => (
          <div
            key={item.id}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => onItemClick?.(item.id)}
            style={{
              minWidth: 160,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              transform: hoveredItem === item.id ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {/* Capa */}
            <div
              style={{
                width: 160,
                height: 160,
                background: item.cover,
                borderRadius: 8,
                marginBottom: 12,
                boxShadow: hoveredItem === item.id ? '0 8px 24px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'box-shadow 0.2s ease',
              }}
            />

            {/* Info */}
            <div style={{ paddingRight: 8 }}>
              <div
                style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'Montserrat, sans-serif',
                  marginBottom: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontFamily: 'Montserrat, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.artist}
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

// Mock data
const newReleases: MusicCard[] = [
  {
    id: 1,
    title: 'Starboy',
    artist: 'The Weeknd',
    cover: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    type: 'album',
  },
  {
    id: 2,
    title: 'After Hours',
    artist: 'The Weeknd',
    cover: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    type: 'album',
  },
  {
    id: 3,
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    cover: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    type: 'single',
  },
  {
    id: 4,
    title: 'Save Your Tears',
    artist: 'The Weeknd',
    cover: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    type: 'single',
  },
  {
    id: 5,
    title: 'Dawn FM',
    artist: 'The Weeknd',
    cover: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    type: 'album',
  },
  {
    id: 6,
    title: 'House of Balloons',
    artist: 'The Weeknd',
    cover: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    type: 'album',
  },
];

const trendingNow: MusicCard[] = [
  {
    id: 7,
    title: 'Levitating',
    artist: 'Dua Lipa',
    cover: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  },
  {
    id: 8,
    title: 'Peaches',
    artist: 'Justin Bieber',
    cover: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
  {
    id: 9,
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    cover: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
  },
  {
    id: 10,
    title: 'MONTERO',
    artist: 'Lil Nas X',
    cover: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  },
  {
    id: 11,
    title: 'drivers license',
    artist: 'Olivia Rodrigo',
    cover: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)',
  },
  {
    id: 12,
    title: 'Stay',
    artist: 'The Kid LAROI',
    cover: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  },
];

const popularPlaylists: MusicCard[] = [
  {
    id: 13,
    title: 'Today\'s Top Hits',
    artist: 'HearCap',
    cover: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    type: 'playlist',
  },
  {
    id: 14,
    title: 'RapCaviar',
    artist: 'HearCap',
    cover: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    type: 'playlist',
  },
  {
    id: 15,
    title: 'All Out 2020s',
    artist: 'HearCap',
    cover: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    type: 'playlist',
  },
  {
    id: 16,
    title: 'Rock Classics',
    artist: 'HearCap',
    cover: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    type: 'playlist',
  },
  {
    id: 17,
    title: 'Chill Vibes',
    artist: 'HearCap',
    cover: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    type: 'playlist',
  },
  {
    id: 18,
    title: 'Workout Mix',
    artist: 'HearCap',
    cover: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    type: 'playlist',
  },
];

interface MusicExploreProps {
  onItemClick?: (id: number) => void;
  isLoading?: boolean;
}

const MusicExplore: React.FC<MusicExploreProps> = ({ onItemClick, isLoading = false }) => {
  return (
    <div
      style={{
        width: '100%',
        paddingTop: 24,
      }}
    >
      {/* Lançamentos */}
      <HorizontalMusicSection
        title="Lançamentos"
        items={newReleases}
        onItemClick={onItemClick}
        isLoading={isLoading}
      />

      {/* Trending */}
      <HorizontalMusicSection
        title="Em Alta"
        items={trendingNow}
        onItemClick={onItemClick}
        isLoading={isLoading}
      />

      {/* Playlists Populares */}
      <HorizontalMusicSection
        title="Playlists Populares"
        items={popularPlaylists}
        onItemClick={onItemClick}
        isLoading={isLoading}
      />
    </div>
  );
};

export default MusicExplore;

