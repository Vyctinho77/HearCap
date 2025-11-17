import { useState } from 'react';
import { Plus } from 'lucide-react';
import SvgIcon from './SvgIcon';
import SearchIcon from './SearchIcon';

interface SidebarLibraryHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

function SidebarLibraryHeader({ isExpanded, onToggle }: SidebarLibraryHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'space-between' : 'center',
          padding: isExpanded ? '0 16px' : '12px 0',
          cursor: 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <button
          onClick={onToggle}
          style={{
            position: isExpanded ? 'absolute' : 'relative',
            left: isExpanded ? 16 : 'auto',
            opacity: isExpanded ? (isHovered ? 1 : 0) : 1,
            transform: isExpanded ? (isHovered ? 'translateX(0)' : 'translateX(-12px)') : 'translateX(0)',
            transition: 'all 0.25s ease',
            pointerEvents: 'auto',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <SvgIcon />
          </div>
        </button>

        {isExpanded && (
          <>
            <h2
              style={{
                color: '#fff',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: 17,
                margin: 0,
                paddingLeft: 4,
                transform: isHovered ? 'translateX(24px)' : 'translateX(0)',
                transition: 'transform 0.25s ease',
                opacity: isExpanded ? 1 : 0,
                whiteSpace: 'nowrap',
              }}
            >
              Suas Playlists
            </h2>

            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginLeft: 'auto',
                opacity: isExpanded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '20px',
                  width: 98,
                  height: 29,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'Montserrat, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
              >
                <Plus size={14} color="rgba(255,255,255,0.7)" />
                Criar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Botões decorativos - apenas quando expandido */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '0 16px 0 10px',
          }}
        >
          <div
            style={{
              background: '#C750FF',
              color: '#fff',
              borderRadius: '20px',
              width: 98,
              height: 29,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Montserrat, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Playlist
          </div>
          <div
            style={{
              background: '#444444',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '20px',
              width: 98,
              height: 29,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Montserrat, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Artistas
          </div>
        </div>
      )}

      {/* Campo de Busca - apenas quando expandido */}
      {isExpanded && (
        <div
          style={{
            padding: '0 16px 0 10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#222222',
              borderRadius: 8,
              padding: '6px 12px',
              border: '1px solid #333',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#444')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#333')}
          >
            <div style={{ flexShrink: 0, opacity: 0.6 }}>
              <SearchIcon size={18} />
            </div>
            <input
              type="text"
              placeholder="Buscar playlist..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 13,
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SidebarLibraryHeader;

