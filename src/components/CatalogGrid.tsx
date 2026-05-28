import { useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { CatalogItem, CatalogKind } from '../types';
import { useGridColumns } from '../hooks/useGridColumns';
import { useScrollMargin } from '../hooks/useScrollMargin';
import { CatalogCard } from './CatalogCard';
import styles from './CatalogGrid.module.css';

interface CatalogGridProps {
  items: CatalogItem[];
  indices: number[];
  kind: CatalogKind;
  isPending?: boolean;
}

const ROW_ESTIMATE_PX = 228;
const OVERSCAN_ROWS = 3;

export function CatalogGrid({
  items,
  indices,
  kind,
  isPending = false,
}: CatalogGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const columnCount = useGridColumns(containerRef);
  const scrollMargin = useScrollMargin(
    containerRef,
    `${kind}-${indices.length}-${columnCount}`,
  );

  const rowCount = Math.ceil(indices.length / columnCount);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: OVERSCAN_ROWS,
    scrollMargin,
  });

  const virtualRows = virtualizer.getVirtualItems();

  if (indices.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden>
          ∅
        </span>
        <p>Ничего не найдено. Измените фильтры или поиск.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.virtualRoot} ${isPending ? styles.pending : ''}`}
    >
      <p className={styles.progress}>
        Найдено: <strong>{indices.length}</strong>
        {isPending && <span className={styles.pendingLabel}> · обновляем…</span>}
      </p>
      <div
        className={styles.virtualSpacer}
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualRows.map((virtualRow) => {
          const rowStart = virtualRow.index * columnCount;
          const rowEnd = rowStart + columnCount;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={styles.virtualRow}
              style={{
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              <div
                className={styles.rowGrid}
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                }}
              >
                {indices.slice(rowStart, rowEnd).map((itemIndex) => {
                  const item = items[itemIndex];
                  if (!item) return null;
                  return (
                    <CatalogCard key={item.id} item={item} kind={kind} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
