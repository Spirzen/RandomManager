import { motion } from 'framer-motion';
import type { Theme } from '../hooks/useTheme';
import type { CatalogKind } from '../types';
import { TabNav } from './TabNav';
import styles from './Header.module.css';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  activeTab: CatalogKind;
  onTabChange: (tab: CatalogKind) => void;
}

export function Header({
  theme,
  onToggleTheme,
  activeTab,
  onTabChange,
}: HeaderProps) {
  return (
    <motion.header
      className={styles.header}
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            ◈
          </span>
          <span className={styles.name}>RandomManager</span>
        </div>

        <div className={styles.tabsWrap}>
          <TabNav active={activeTab} onChange={onTabChange} />
        </div>

        <button
          type="button"
          className={styles.themeBtn}
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={styles.themeIcon}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </motion.span>
        </button>
      </div>
    </motion.header>
  );
}
