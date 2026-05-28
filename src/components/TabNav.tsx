import { motion } from 'framer-motion';
import { preloadCatalog } from '../lib/catalog';
import type { CatalogKind } from '../types';
import styles from './TabNav.module.css';

const TABS: { id: CatalogKind; label: string }[] = [
  { id: 'movies', label: 'Кино' },
  { id: 'games', label: 'Игры' },
  { id: 'books', label: 'Книги' },
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
                layoutId="header-tab-indicator"
                className={styles.indicator}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
