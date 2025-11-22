import React from 'react';
import styles from './Topbar.module.css';
import SearchIcon from '../SearchIcon';
import { Bell } from 'lucide-react';

export const Topbar: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.searchWrapper}>
        <SearchIcon />
        <input className={styles.searchInput} placeholder="Buscar..." />
      </div>
      <div className={styles.actions}>
        <Bell size={22} color="#C750FF" style={{ cursor: 'pointer' }} />
        <button className={styles.loginBtn}>Login</button>
      </div>
    </div>
  );
};

export default Topbar;
