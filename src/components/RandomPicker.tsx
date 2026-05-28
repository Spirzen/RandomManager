import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogItem, CatalogKind } from '../types';
import { pickRandomIndex } from '../lib/catalog';
import { ItemActions } from './ItemActions';
import styles from './RandomPicker.module.css';

const LABELS: Record<CatalogKind, { btn: string; empty: string }> = {
  movies: { btn: 'Случайный фильм', empty: 'Нет фильмов по фильтрам' },
  games: { btn: 'Случайная игра', empty: 'Нет игр по фильтрам' },
  books: { btn: 'Случайная книга', empty: 'Нет книг по фильтрам' },
};

interface RandomPickerProps {
  kind: CatalogKind;
  items: CatalogItem[];
  poolIndices: number[];
  disabled?: boolean;
  getState: (id: string) => {
    favorite: boolean;
    consumed: boolean;
    inPlaylist: boolean;
  };
  onToggleFavorite: (id: string) => void;
  onToggleConsumed: (id: string) => void;
  onTogglePlaylist: (id: string) => void;
}

export function RandomPicker({
  kind,
  items,
  poolIndices,
  disabled = false,
  getState,
  onToggleFavorite,
  onToggleConsumed,
  onTogglePlaylist,
}: RandomPickerProps) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<CatalogItem | null>(null);
  const [flashTitle, setFlashTitle] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poolRef = useRef(poolIndices);
  const itemsRef = useRef(items);
  const kindRef = useRef(kind);
  const spinGenerationRef = useRef(0);

  poolRef.current = poolIndices;
  itemsRef.current = items;
  kindRef.current = kind;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    spinGenerationRef.current += 1;
    setResult(null);
    setFlashTitle(null);
    setSpinning(false);
    clearTimer();
  }, [kind, clearTimer]);

  const resolveItem = (index: number): CatalogItem | null => {
    const list = itemsRef.current;
    const item = list[index];
    return item ?? null;
  };

  const runRandom = () => {
    const pool = poolRef.current;
    if (!pool.length || spinning || disabled) return;

    clearTimer();
    const generation = ++spinGenerationRef.current;
    setSpinning(true);
    setResult(null);

    let ticks = 0;
    const maxTicks = 18 + Math.floor(Math.random() * 8);
    const activeKind = kindRef.current;

    timerRef.current = setInterval(() => {
      if (spinGenerationRef.current !== generation || kindRef.current !== activeKind) {
        clearTimer();
        return;
      }

      const idx = pickRandomIndex(poolRef.current);
      if (idx != null) {
        const item = resolveItem(idx);
        if (item) setFlashTitle(item.title);
      }

      ticks += 1;
      if (ticks >= maxTicks) {
        clearTimer();
        if (spinGenerationRef.current !== generation) return;

        const finalIdx = pickRandomIndex(poolRef.current);
        const finalItem = finalIdx != null ? resolveItem(finalIdx) : null;
        setResult(finalItem);
        setFlashTitle(null);
        setSpinning(false);
      }
    }, 70);
  };

  const labels = LABELS[kind];
  const canPick = poolIndices.length > 0 && !disabled;
  const genres = result?.genres ?? [];
  const resultState = result ? getState(result.id) : null;

  return (
    <section className={styles.section} aria-label="Случайный выбор">
      <div className={styles.card}>
        <button
          type="button"
          className={styles.btn}
          onClick={runRandom}
          disabled={!canPick || spinning}
        >
          <span className={styles.btnGlow} aria-hidden />
          <span className={styles.btnText}>
            {spinning ? 'Выбираем…' : labels.btn}
          </span>
        </button>

        <div className={styles.display}>
          {spinning && flashTitle && (
            <p className={styles.flash}>{flashTitle}</p>
          )}
          {!spinning && result && resultState && (
            <div className={styles.reveal}>
              <span className={styles.badge}>Ваш выбор</span>
              <h3 className={styles.revealTitle}>{result.title}</h3>
              <p className={styles.revealMeta}>
                {result.year}
                {' · '}
                <span className={styles.rating}>★ {result.rating.toFixed(1)}</span>
                {'author' in result && ` · ${result.author}`}
                {'developer' in result && ` · ${result.developer}`}
              </p>
              <p className={styles.revealDesc}>{result.description}</p>
              {genres.length > 0 && (
                <div className={styles.tags}>
                  {genres.map((g) => (
                    <span key={g} className={styles.tag}>
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <ItemActions
                kind={kind}
                favorite={resultState.favorite}
                consumed={resultState.consumed}
                inPlaylist={resultState.inPlaylist}
                onToggleFavorite={() => onToggleFavorite(result.id)}
                onToggleConsumed={() => onToggleConsumed(result.id)}
                onTogglePlaylist={() => onTogglePlaylist(result.id)}
                centered
              />
            </div>
          )}
          {!spinning && !result && (
            <p className={styles.hint}>
              {poolIndices.length
                ? 'Нажмите кнопку — учтутся текущие фильтры'
                : labels.empty}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
