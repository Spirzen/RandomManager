import { motion } from 'framer-motion';
import { preloadCatalog } from '../lib/catalog';
import type { CatalogKind } from '../types';
import styles from './TabNav.module.css';

const TABS: { id: CatalogKind; label: string; icon: string }[] = [
  { id: 'movies', label: 'Кино', icon: '🎬' },
  { id: 'games', label: 'Игры', icon: '🎮' },
  { id: 'books', label: 'Книги', icon: '📚' },
];

interface TabNavProps {
  active: CatalogKind;
  onChange: (tab: CatalogKind) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className={styles.nav} role="tablist" aria-label="Раздел каталога">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={styles.tab}
            onClick={() => onChange(tab.id)}
            onMouseEnter={() => preloadCatalog(tab.id)}
            onFocus={() => preloadCatalog(tab.id)}
          >
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                className={styles.pill}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className={styles.tabContent}>
              <span className={styles.icon} aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
