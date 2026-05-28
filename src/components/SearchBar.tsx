import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon} aria-hidden>
        ⌕
      </span>
      <input
        type="search"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Поиск по названию, описанию…'}
        aria-label="Поиск"
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange('')}
          aria-label="Очистить поиск"
        >
          ×
        </button>
      )}
    </div>
  );
}
