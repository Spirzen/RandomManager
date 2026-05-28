import type { FilterOptions } from '../lib/catalog';
import { CONSUMED_FILTER_LABELS } from '../lib/filterLabels';
import type { CatalogKind, ConsumedFilter, FiltersState } from '../types';
import { SearchableChipGroup } from './SearchableChipGroup';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  kind: CatalogKind;
  filters: FiltersState;
  options: FilterOptions;
  favoriteCount: number;
  playlistCount: number;
  disabled?: boolean;
  onChange: (patch: Partial<FiltersState>) => void;
  onReset: () => void;
}

function toggleInList(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

const CONSUMED_OPTIONS: { value: ConsumedFilter; labelKey: 'all' | 'unseen' | 'seen' }[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'unseen', labelKey: 'unseen' },
  { value: 'seen', labelKey: 'seen' },
];

const CONSUMED_ALL_LABEL = 'Все';

export function FilterPanel({
  kind,
  filters,
  options,
  favoriteCount,
  playlistCount,
  disabled = false,
  onChange,
  onReset,
}: FilterPanelProps) {
  const hasCatalogActive =
    filters.genres.length > 0 ||
    filters.actors.length > 0 ||
    filters.developers.length > 0 ||
    filters.platforms.length > 0 ||
    filters.authors.length > 0 ||
    filters.yearMin != null ||
    filters.yearMax != null ||
    filters.ratingMin != null;

  const hasUserActive =
    filters.favoriteOnly || filters.playlistOnly || filters.consumedFilter !== 'all';

  const hasActive = hasCatalogActive || hasUserActive;
  const consumedLabels = CONSUMED_FILTER_LABELS[kind];

  const consumedOptionLabel = (key: 'all' | 'unseen' | 'seen') => {
    if (key === 'all') return CONSUMED_ALL_LABEL;
    return consumedLabels[key];
  };

  return (
    <aside className={styles.panel} aria-busy={disabled}>
      {disabled && <p className={styles.loadingHint}>Загрузка каталога…</p>}

      <div className={styles.head}>
        <h2 className={styles.title}>Фильтры</h2>
        {hasActive && (
          <button
            type="button"
            className={styles.reset}
            onClick={onReset}
            disabled={disabled}
          >
            Сбросить
          </button>
        )}
      </div>

      <div className={disabled ? styles.filtersDisabled : undefined}>
        <section className={styles.section} aria-label="Мои списки">
          <h3 className={styles.sectionTitle}>Мои списки</h3>

          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={filters.favoriteOnly}
              disabled={disabled}
              onChange={(e) => onChange({ favoriteOnly: e.target.checked })}
            />
            <span className={styles.toggleText}>
              Только избранное
              {favoriteCount > 0 && (
                <span className={styles.toggleCount}>{favoriteCount}</span>
              )}
            </span>
          </label>

          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={filters.playlistOnly}
              disabled={disabled}
              onChange={(e) => onChange({ playlistOnly: e.target.checked })}
            />
            <span className={styles.toggleText}>
              Только плейлист
              {playlistCount > 0 && (
                <span className={styles.toggleCount}>{playlistCount}</span>
              )}
            </span>
          </label>

          <div className={styles.field}>
            <span className={styles.fieldLabel} id={`consumed-filter-${kind}`}>
              {consumedLabels.section}
            </span>
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-labelledby={`consumed-filter-${kind}`}
            >
              {CONSUMED_OPTIONS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={filters.consumedFilter === value}
                  className={`${styles.segment} ${
                    filters.consumedFilter === value ? styles.segmentActive : ''
                  }`}
                  disabled={disabled}
                  onClick={() => onChange({ consumedFilter: value })}
                >
                  {consumedOptionLabel(labelKey)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-label="Год и рейтинг">
          <h3 className={styles.sectionTitle}>Год и рейтинг</h3>

          <div className={styles.rangeRow}>
            <label className={styles.label}>
              <span className={styles.fieldLabel}>Год от</span>
              <input
                type="number"
                className={styles.number}
                min={options.yearMin}
                max={options.yearMax}
                placeholder={String(options.yearMin)}
                value={filters.yearMin ?? ''}
                onChange={(e) =>
                  onChange({
                    yearMin: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label className={styles.label}>
              <span className={styles.fieldLabel}>до</span>
              <input
                type="number"
                className={styles.number}
                min={options.yearMin}
                max={options.yearMax}
                placeholder={String(options.yearMax)}
                value={filters.yearMax ?? ''}
                onChange={(e) =>
                  onChange({
                    yearMax: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
          </div>

          <div className={styles.field}>
            <div className={styles.rangeHead}>
              <span className={styles.fieldLabel}>Рейтинг от</span>
              <span className={styles.rangeValue}>
                {filters.ratingMin != null && filters.ratingMin > 0
                  ? `${filters.ratingMin}+`
                  : 'любой'}
              </span>
            </div>
            <input
              type="range"
              className={styles.range}
              min={0}
              max={10}
              step={0.5}
              value={filters.ratingMin ?? 0}
              aria-label="Минимальный рейтинг"
              onChange={(e) =>
                onChange({
                  ratingMin: Number(e.target.value) > 0 ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </section>

        <section className={styles.section} aria-label="Жанры и теги">
          <h3 className={styles.sectionTitle}>Каталог</h3>

          <SearchableChipGroup
            label="Жанры"
            items={options.genres}
            selected={filters.genres}
            disabled={disabled}
            onToggle={(g) => onChange({ genres: toggleInList(filters.genres, g) })}
          />

          {kind === 'movies' && (
            <SearchableChipGroup
              label="Актёры"
              items={options.actors}
              selected={filters.actors}
              disabled={disabled}
              onToggle={(a) => onChange({ actors: toggleInList(filters.actors, a) })}
            />
          )}

          {kind === 'games' && (
            <>
              <SearchableChipGroup
                label="Разработчик"
                items={options.developers}
                selected={filters.developers}
                disabled={disabled}
                onToggle={(d) =>
                  onChange({ developers: toggleInList(filters.developers, d) })
                }
              />
              <SearchableChipGroup
                label="Платформа"
                items={options.platforms}
                selected={filters.platforms}
                disabled={disabled}
                onToggle={(p) =>
                  onChange({ platforms: toggleInList(filters.platforms, p) })
                }
              />
            </>
          )}

          {kind === 'books' && (
            <SearchableChipGroup
              label="Автор"
              items={options.authors}
              selected={filters.authors}
              disabled={disabled}
              onToggle={(a) => onChange({ authors: toggleInList(filters.authors, a) })}
            />
          )}
        </section>
      </div>
    </aside>
  );
}
