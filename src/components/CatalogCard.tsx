import { memo } from 'react';
import type { Book, CatalogItem, CatalogKind, Game, Movie } from '../types';
import { ItemActions } from './ItemActions';
import styles from './CatalogCard.module.css';

interface CatalogCardProps {
  item: CatalogItem;
  kind: CatalogKind;
  favorite: boolean;
  consumed: boolean;
  inPlaylist: boolean;
  onToggleFavorite: () => void;
  onToggleConsumed: () => void;
  onTogglePlaylist: () => void;
}

function Rating({ value }: { value: number }) {
  return (
    <span className={styles.rating} title={`Рейтинг ${value}`}>
      ★ {value.toFixed(1)}
    </span>
  );
}

function formatExtra(item: CatalogItem, kind: CatalogKind): string {
  if (kind === 'movies') {
    return ((item as Movie).actors ?? []).slice(0, 2).join(', ');
  }
  if (kind === 'games') {
    const g = item as Game;
    const dev = g.developer?.trim() || '—';
    const plats = (g.platforms ?? []).slice(0, 2).join(', ') || '—';
    return `${dev} · ${plats}`;
  }
  return (item as Book).author?.trim() || '—';
}

export const CatalogCard = memo(function CatalogCard({
  item,
  kind,
  favorite,
  consumed,
  inPlaylist,
  onToggleFavorite,
  onToggleConsumed,
  onTogglePlaylist,
}: CatalogCardProps) {
  const genres = item.genres ?? [];
  const extra = formatExtra(item, kind);
  const hasStatus = favorite || consumed || inPlaylist;

  return (
    <article
      className={`${styles.card} ${favorite ? styles.cardFavorite : ''} ${inPlaylist ? styles.cardPlaylist : ''} ${consumed ? styles.cardConsumed : ''}`}
    >
      <header className={styles.head}>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>{item.title}</h3>
          {hasStatus && (
            <div className={styles.badges} aria-label="Статус">
              {favorite && <span className={styles.badgeFavorite} title="Избранное">♥</span>}
              {consumed && <span className={styles.badgeConsumed} title="Просмотрено">✓</span>}
              {inPlaylist && <span className={styles.badgePlaylist} title="В плейлисте">▣</span>}
            </div>
          )}
        </div>
        <Rating value={item.rating} />
      </header>
      <p className={styles.meta}>
        {item.year > 0 ? `${item.year} · ` : ''}
        {extra}
      </p>
      <p className={styles.desc}>{item.description}</p>
      {kind === 'games' && ((item as Game).storeUrl || (item as Game).wikiUrl) && (
        <div className={styles.links}>
          {(item as Game).storeUrl && (
            <a
              className={styles.storeLink}
              href={(item as Game).storeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              В магазин
            </a>
          )}
          {(item as Game).wikiUrl && (
            <a
              className={styles.storeLink}
              href={(item as Game).wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Wikipedia
            </a>
          )}
        </div>
      )}
      {genres.length > 0 && (
        <ul className={styles.genres} aria-label="Жанры">
          {genres.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
      <footer className={styles.footer}>
        <ItemActions
          kind={kind}
          favorite={favorite}
          consumed={consumed}
          inPlaylist={inPlaylist}
          onToggleFavorite={onToggleFavorite}
          onToggleConsumed={onToggleConsumed}
          onTogglePlaylist={onTogglePlaylist}
        />
      </footer>
    </article>
  );
});
