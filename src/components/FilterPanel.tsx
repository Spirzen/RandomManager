import type { FilterOptions } from '../lib/catalog';
import type { CatalogKind, FiltersState } from '../types';
import { SearchableChipGroup } from './SearchableChipGroup';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  kind: CatalogKind;
  filters: FiltersState;
  options: FilterOptions;
  disabled?: boolean;
  onChange: (patch: Partial<FiltersState>) => void;
  onReset: () => void;
}

function toggleInList(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function FilterPanel({
  kind,
  filters,
  options,
  disabled = false,
  onChange,
  onReset,
}: FilterPanelProps) {
  const hasActive =
    filters.genres.length > 0 ||
    filters.actors.length > 0 ||
    filters.developers.length > 0 ||
    filters.platforms.length > 0 ||
    filters.authors.length > 0 ||
    filters.yearMin != null ||
    filters.yearMax != null ||
    filters.ratingMin != null;

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
        <div className={styles.rangeRow}>
          <label className={styles.label}>
            Год от
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
            до
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

        <label className={styles.label}>
          Рейтинг от
          <input
            type="range"
            className={styles.range}
            min={0}
            max={10}
            step={0.5}
            value={filters.ratingMin ?? 0}
            onChange={(e) =>
              onChange({
                ratingMin: Number(e.target.value) > 0 ? Number(e.target.value) : null,
              })
            }
          />
          <span className={styles.rangeValue}>
            {filters.ratingMin != null && filters.ratingMin > 0
              ? `${filters.ratingMin}+`
              : 'любой'}
          </span>
        </label>

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
      </div>
    </aside>
  );
}
