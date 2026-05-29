import { motion, useReducedMotion } from 'framer-motion';
import type { Theme } from '../hooks/useTheme';
import type { CatalogKind } from '../types';
import { TabNav } from './TabNav';
import styles from './Header.module.css';

const IT_UNIVERSE_URL = 'https://spirzen.ru';
const APK_URL = `${import.meta.env.BASE_URL}RandomManagerMobile.apk`;

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
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      className={styles.header}
      initial={reduceMotion ? false : { y: -12, opacity: 0 }}
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

        <div className={styles.actions}>
          <a
            className={styles.itLink}
            href={APK_URL}
            download="RandomManagerMobile.apk"
            aria-label="Скачать приложение RandomManager для Android"
          >
            <span className={styles.itFull}>Скачать APK</span>
            <span className={styles.itShort} aria-hidden>
              APK
            </span>
          </a>
          <a
            className={styles.itLink}
            href={IT_UNIVERSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Вселенная IT — перейти на spirzen.ru"
          >
            <span className={styles.itFull}>Вселенная IT</span>
            <span className={styles.itShort} aria-hidden>
              IT
            </span>
          </a>
          <button
            type="button"
            className={styles.themeBtn}
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            <motion.span
              key={theme}
              initial={reduceMotion ? false : { rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className={styles.themeIcon}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </motion.span>
          </button>
        </div>

        <div className={styles.tabsWrap}>
          <TabNav active={activeTab} onChange={onTabChange} />
        </div>
      </div>
    </motion.header>
  );
}
