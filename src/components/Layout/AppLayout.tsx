import React, { ReactNode } from 'react';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  rightPanel: ReactNode;
  player: ReactNode;
  topbar: ReactNode;
  isSidebarExpanded?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  topbar,
  sidebar,
  main,
  rightPanel,
  player,
  isSidebarExpanded = true,
}) => {
  return (
    <div
      className={styles.layout}
      style={{
        gridTemplateColumns: `${isSidebarExpanded ? 'minmax(280px, 420px)' : '72px'} minmax(0, 1fr) var(--right-panel-width)`,
      }}
    >
      <div className={styles.topbar}>{topbar}</div>
      <aside className={styles.sidebar}>{sidebar}</aside>
      <main className={styles.main}>{main}</main>
      <aside className={styles.rightPanel}>{rightPanel}</aside>
      <div className={styles.player}>{player}</div>
    </div>
  );
};

export default AppLayout;
