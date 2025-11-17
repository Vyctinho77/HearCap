import { ReactNode, useEffect, useState } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  baseWidth?: number;
  baseHeight?: number;
}

/**
 * Container responsivo que escala o conteúdo proporcionalmente
 * mantendo o design original intacto em qualquer resolução
 */
export default function ResponsiveContainer({ 
  children, 
  baseWidth = 1440, 
  baseHeight = 900 
}: ResponsiveContainerProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Calcula a escala baseada na menor dimensão para garantir que tudo caiba
      const scaleX = windowWidth / baseWidth;
      const scaleY = windowHeight / baseHeight;
      
      // Usa a menor escala para garantir que tudo caiba na tela
      const newScale = Math.min(scaleX, scaleY, 1.5); // Limite máximo de 1.5x
      
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    
    return () => window.removeEventListener('resize', calculateScale);
  }, [baseWidth, baseHeight]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <div
        style={{
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}


