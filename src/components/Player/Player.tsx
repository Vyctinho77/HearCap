import React, { useEffect, useRef, useState } from 'react';
import styles from './Player.module.css';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Plus, Check } from 'lucide-react';

const track = {
  title: 'Carry Go',
  artists: ['Reezy', 'Tym', 'Dr3w', 'Nani'],
  albumArt:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiBmaWxsPSIjMURCOTU0Ii8+PHRleHQgeD0iMjgiIHk9IjMyIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DYXBhPC90ZXh0Pjwvc3ZnPg==',
  duration: 218,
} as const;

export const Player: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(20);
  const [volume, setVolume] = useState(80);
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isSaved, setIsSaved] = useState(false);
  const [hoverSave, setHoverSave] = useState(false);
  const [hoverProgress, setHoverProgress] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && currentTime < track.duration) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => Math.min(prev + 1, track.duration));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentTime]);

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newVolume = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    setVolume(newVolume);
  };

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
        <img
          src={track.albumArt}
          alt="Album Art"
          width={52}
          height={52}
          style={{ borderRadius: 8, marginRight: 8, objectFit: 'cover', alignSelf: 'center' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.1 }}>
          <div style={{ color: '#e5e5e5', fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{track.title}</div>
          <div style={{ color: '#b3b3b3', fontSize: 13 }}>{track.artists.join(', ')}</div>
        </div>
        <button
          onMouseEnter={() => setHoverSave(true)}
          onMouseLeave={() => setHoverSave(false)}
          onClick={() => setIsSaved((prev) => !prev)}
          title="Salvar música"
          style={{
            background: 'transparent',
            cursor: 'pointer',
            position: 'absolute',
            left: 300,
            top: '20%',
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: isSaved ? '#C750FF' : hoverSave ? '#fff' : '#b3b3b3',
            border: isSaved ? '1px solid #C750FF' : hoverSave ? '1px solid #fff' : '1px solid rgba(179,179,179,0.4)',
            transition: 'all 150ms ease',
          }}
        >
          {isSaved ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.actions}>
          <Shuffle
            size={18}
            color={isShuffled ? '#C750FF' : '#b3b3b3'}
            style={{ cursor: 'pointer' }}
            onClick={() => setIsShuffled((prev) => !prev)}
          />
          <SkipBack size={20} color="#fff" style={{ cursor: 'pointer' }} />
          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            style={{
              background: '#C750FF',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? (
              <Pause size={20} color="#fff" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <Play size={20} color="#fff" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </button>
          <SkipForward size={20} color="#fff" style={{ cursor: 'pointer' }} />
          <Repeat
            size={18}
            color={repeatMode !== 'off' ? '#C750FF' : '#b3b3b3'}
            style={{ cursor: 'pointer' }}
            onClick={() =>
              setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'))
            }
          />
        </div>

        <div
          onMouseEnter={() => setHoverProgress(true)}
          onMouseLeave={() => setHoverProgress(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: 442 }}
        >
          <span style={{ color: '#b3b3b3', fontSize: 12, width: 30, textAlign: 'right' }}>
            {formatTime(currentTime)}
          </span>
          <div style={{ flex: 1, height: 4, borderRadius: 4, background: '#333', position: 'relative' }}>
            <div
              style={{
                width: `${(currentTime / track.duration) * 100}%`,
                height: '100%',
                background: '#C750FF',
                borderRadius: 4,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${(currentTime / track.duration) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: hoverProgress ? 14 : 12,
                height: hoverProgress ? 14 : 12,
                borderRadius: '50%',
                background: '#C750FF',
                transition: 'all 120ms ease',
              }}
            />
          </div>
          <span style={{ color: '#b3b3b3', fontSize: 12, width: 30 }}>{formatTime(track.duration)}</span>
        </div>
      </div>

      <div className={styles.volume}>
        <Volume2 size={18} color="#fff" />
        <div
          style={{ width: 120, height: 4, background: '#333', borderRadius: 4, position: 'relative', cursor: 'pointer' }}
          onMouseDown={(e) => {
            setIsAdjustingVolume(true);
            handleVolumeChange(e);
          }}
          onMouseMove={(e) => isAdjustingVolume && handleVolumeChange(e)}
          onMouseUp={() => setIsAdjustingVolume(false)}
          onMouseLeave={() => setIsAdjustingVolume(false)}
        >
          <div style={{ width: `${volume}%`, height: '100%', background: '#C750FF', borderRadius: 4 }} />
          <div
            style={{
              position: 'absolute',
              left: `${volume}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#C750FF',
            }}
          />
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default Player;
