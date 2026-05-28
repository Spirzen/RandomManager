import { useMemo, useState } from 'react';
import styles from './FilterPanel.module.css';

const SEARCH_THRESHOLD = 18;
const MAX_VISIBLE = 40;

interface SearchableChipGroupProps {
  label: string;
  items: string[];
  selected: string[];
  disabled?: boolean;
  onToggle: (item: string) => void;
}

export function SearchableChipGroup({
  label,
  items,
  selected,
  disabled = false,
  onToggle,
}: SearchableChipGroupProps) {
  const [query, setQuery] = useState('');

  const needsSearch = items.length > SEARCH_THRESHOLD;

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? items.filter((item) => item.toLowerCase().includes(q))
      : items;
    return needsSearch ? list.slice(0, MAX_VISIBLE) : list;
  }, [items, query, needsSearch]);

  const hiddenCount = useMemo(() => {
    if (!needsSearch) return 0;
    const q = query.trim().toLowerCase();
    const total = q
      ? items.filter((item) => item.toLowerCase().includes(q)).length
      : items.length;
    return Math.max(0, total - visibleItems.length);
  }, [items, query, needsSearch, visibleItems.length]);

  if (!items.length) return null;

  return (
    <div
      className={styles.field}
      role="group"
      aria-label={label}
      aria-disabled={disabled}
    >
      <h4 className={styles.legend}>
        {label}
        <span className={styles.legendCount}>({items.length})</span>
      </h4>
      {needsSearch && (
        <input
          type="search"
          className={styles.chipSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Найти в «${label}»…`}
          aria-label={`Поиск: ${label}`}
        />
      )}
      <div className={styles.chips}>
        {visibleItems.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              className={`${styles.chip} ${active ? styles.chipActive : ''}`}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onToggle(item)}
            >
              {item}
            </button>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <p className={styles.chipHint}>
          Ещё {hiddenCount} — уточните поиск выше
        </p>
      )}
      {needsSearch && selected.length > 0 && (
        <div className={styles.selectedChips}>
          <span className={styles.selectedLabel}>Выбрано:</span>
          {selected.map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.chip} ${styles.chipActive}`}
              aria-pressed
              onClick={() => onToggle(item)}
            >
              {item} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
