import React, { useState, useEffect } from 'react';
import { Play, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BannerItem {
  id: number;
  artistName: string;
  albumTitle: string;
  trackTitle: string;
  trackDescription: string;
  coverImage: string;
  backgroundImage: string;
  price: string;
  currency: string;
  priceChange: string;
  priceLabel: string;
}

const bannerData: BannerItem[] = [
  {
    id: 1,
    artistName: 'Dark Tayler',
    albumTitle: 'ALBUM',
    trackTitle: 'Mascaras',
    trackDescription: 'Máscaras é um mergulho nas identidades fragmentadas que tesamos na sobreviver.',
    coverImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundImage: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
    price: '0.2609',
    currency: 'USDT',
    priceChange: '(1.58%)',
    priceLabel: 'PNL de Hoje',
  },
  {
    id: 2,
    artistName: 'Luna Star',
    albumTitle: 'EP',
    trackTitle: 'Neon Dreams',
    trackDescription: 'Uma jornada sonora através das luzes da cidade.',
    coverImage: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    backgroundImage: 'linear-gradient(135deg, rgba(240, 147, 251, 0.3) 0%, rgba(245, 87, 108, 0.3) 100%)',
    price: '0.3421',
    currency: 'USDT',
    priceChange: '(2.34%)',
    priceLabel: 'PNL de Hoje',
  },
  {
    id: 3,
    artistName: 'Echo Wave',
    albumTitle: 'ALBUM',
    trackTitle: 'Digital Horizons',
    trackDescription: 'Explorando as fronteiras entre o digital e o analógico.',
    coverImage: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    backgroundImage: 'linear-gradient(135deg, rgba(79, 172, 254, 0.3) 0%, rgba(0, 242, 254, 0.3) 100%)',
    price: '0.1879',
    currency: 'USDT',
    priceChange: '(-0.45%)',
    priceLabel: 'PNL de Hoje',
  },
  {
    id: 4,
    artistName: 'Sunset Vibes',
    albumTitle: 'SINGLE',
    trackTitle: 'Golden Hour',
    trackDescription: 'Capturando a magia dos momentos finais do dia.',
    coverImage: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    backgroundImage: 'linear-gradient(135deg, rgba(250, 112, 154, 0.3) 0%, rgba(254, 225, 64, 0.3) 100%)',
    price: '0.5234',
    currency: 'USDT',
    priceChange: '(3.12%)',
    priceLabel: 'PNL de Hoje',
  },
  {
    id: 5,
    artistName: 'Midnight Jazz',
    albumTitle: 'ALBUM',
    trackTitle: 'Blue Notes',
    trackDescription: 'Jazz moderno com toques eletrônicos.',
    coverImage: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    backgroundImage: 'linear-gradient(135deg, rgba(48, 207, 208, 0.3) 0%, rgba(51, 8, 103, 0.3) 100%)',
    price: '0.7654',
    currency: 'USDT',
    priceChange: '(1.89%)',
    priceLabel: 'PNL de Hoje',
  },
];

// Componente de Card com barra de progresso usando maskImage (igual ao exemplo)
const CarouselCard: React.FC<{
  item: BannerItem;
  isActive: boolean;
  progress: number;
  onClick: () => void;
}> = ({ item, isActive, progress, onClick }) => {
  const size = isActive ? 82 : 69;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        cursor: 'pointer',
        flexShrink: 0,
        transform: isActive ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      {/* Imagem do Card */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: item.coverImage,
          borderRadius: 3,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Contorno fixo de base */}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: 5,
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}
      />

      {/* Contorno animado (3px afastado do card) */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            inset: -5,
            borderRadius: 8,
            border: '2px solid transparent',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 8,
              border: '2px solid rgba(255,255,255,0.8)',
              maskImage: `conic-gradient(from 0deg, white ${progress}%, transparent ${progress}%)`,
              WebkitMaskImage: `conic-gradient(from 0deg, white ${progress}%, transparent ${progress}%)`,
              transition: 'mask-image 0.05s linear, -webkit-mask-image 0.05s linear',
            }}
          />
        </div>
      )}
    </div>
  );
};

interface BannerCarouselProps {
  onTabChange?: (tab: 'tudo' | 'musica' | 'token') => void;
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ onTabChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'tudo' | 'musica' | 'token'>('tudo');
  
  const handleTabClick = (tab: 'tudo' | 'musica' | 'token') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  
  // Largura dinâmica baseada no estado do sidebar
  const bannerWidth = '100%';

  // Incrementa o progresso (igual ao exemplo: 50ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p < 100 ? p + 1 : 0));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Auto-advance quando progresso chega a 100%
  useEffect(() => {
    if (progress === 100) {
      setCurrentIndex((a) => (a + 1) % bannerData.length);
      setProgress(0);
    }
  }, [progress]);

  // Reset progress quando mudar manualmente
  const handleCardClick = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  const currentBanner = bannerData[currentIndex];

  return (
    <div
      style={{
        position: 'relative',
        width: bannerWidth,
        height: 254,
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Banner de fundo com transição overlap suave (igual ao exemplo) */}
      <AnimatePresence mode="sync">
        <motion.div
          key={bannerData[currentIndex].id}
          initial={{ opacity: 0, x: 60, scale: 0.98, filter: 'blur(6px)' }}
          animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: -60, scale: 0.98, filter: 'blur(6px)' }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          style={{
            position: 'absolute',
            inset: 0,
            background: currentBanner.backgroundImage,
            zIndex: 1,
          }}
        />
      </AnimatePresence>

      {/* Conteúdo do banner (sempre visível, acima do background) */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '25px 24px 20px 24px',
          justifyContent: 'space-between',
        }}
      >
      {/* Botões Superior Esquerdo: Tudo, Música, Token */}
      <div
        style={{
          display: 'flex',
          gap: 7,
          alignSelf: 'flex-start',
        }}
      >
        {(['tudo', 'musica', 'token'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            style={{
              width: 98,
              height: 29,
              background: activeTab === tab ? '#fff' : 'transparent',
              color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.7)',
              border: activeTab === tab ? 'none' : '1px solid rgba(255,255,255,0.3)',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Montserrat, sans-serif',
              cursor: 'pointer',
              textTransform: 'capitalize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {tab === 'musica' ? 'Música' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Container Inferior */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        {/* Info + Botões (Inferior Esquerdo) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxWidth: 550,
          }}
        >
          {/* Título e Descrição */}
          <div>
            <div
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {currentBanner.artistName} • {currentBanner.albumTitle}
            </div>
            <div
              style={{
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 6,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {currentBanner.trackTitle}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              {currentBanner.trackDescription}
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#C750FF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Play size={20} color="#fff" strokeLinecap="round" strokeLinejoin="round" fill="#fff" />
            </button>
            <button
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Plus size={16} color="rgba(255,255,255,0.8)" />
            </button>
            <button
              style={{
                width: 98,
                height: 29,
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'Montserrat, sans-serif',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              }}
            >
              Token
            </button>
          </div>
        </div>

        {/* Cards Carrossel (Inferior Direito) */}
        <div
          style={{
            display: 'flex',
            gap: 15,
            alignItems: 'flex-end',
          }}
        >
          {bannerData.map((item, index) => (
            <CarouselCard
              key={item.id}
              item={item}
              isActive={index === currentIndex}
              progress={index === currentIndex ? progress : 0}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default BannerCarousel;
