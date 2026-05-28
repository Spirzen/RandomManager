import type { CatalogKind } from '../types';
import styles from './ItemActions.module.css';

const CONSUMED_LABELS: Record<CatalogKind, { on: string; off: string }> = {
  movies: { on: 'Смотрел', off: 'Не смотрел' },
  games: { on: 'Играл', off: 'Не играл' },
  books: { on: 'Читал', off: 'Не читал' },
};

interface ItemActionsProps {
  kind: CatalogKind;
  favorite: boolean;
  consumed: boolean;
  inPlaylist: boolean;
  onToggleFavorite: () => void;
  onToggleConsumed: () => void;
  onTogglePlaylist: () => void;
  centered?: boolean;
}

export function ItemActions({
  kind,
  favorite,
  consumed,
  inPlaylist,
  onToggleFavorite,
  onToggleConsumed,
  onTogglePlaylist,
  centered = false,
}: ItemActionsProps) {
  const consumedLabels = CONSUMED_LABELS[kind];

  return (
    <div
      className={`${styles.actions} ${centered ? styles.centered : ''}`}
      role="group"
      aria-label="Действия с позицией"
    >
      <button
        type="button"
        className={`${styles.btn} ${favorite ? styles.favoriteActive : ''}`}
        aria-pressed={favorite}
        aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
        title={favorite ? 'В избранном' : 'В избранное'}
        onClick={onToggleFavorite}
      >
        <span className={styles.icon} aria-hidden>
          {favorite ? '♥' : '♡'}
        </span>
      </button>
      <button
        type="button"
        className={`${styles.btn} ${consumed ? styles.consumedActive : ''}`}
        aria-pressed={consumed}
        aria-label={consumed ? consumedLabels.on : consumedLabels.off}
        title={consumed ? consumedLabels.on : consumedLabels.off}
        onClick={onToggleConsumed}
      >
        <span className={styles.icon} aria-hidden>
          {consumed ? '✓' : '○'}
        </span>
      </button>
      <button
        type="button"
        className={`${styles.btn} ${inPlaylist ? styles.playlistActive : ''}`}
        aria-pressed={inPlaylist}
        aria-label={inPlaylist ? 'Убрать из плейлиста' : 'В плейлист'}
        title={inPlaylist ? 'В плейлисте' : 'В плейлист'}
        onClick={onTogglePlaylist}
      >
        <span className={styles.icon} aria-hidden>
          {inPlaylist ? '▣' : '▢'}
        </span>
      </button>
    </div>
  );
}

export { CONSUMED_LABELS };
