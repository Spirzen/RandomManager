import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

const MIN_COL_WIDTH = 260;
const GAP_PX = 16;

function scheduleMeasure(callback: () => void): () => void {
  let raf = 0;
  const run = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(callback);
  };
  return run;
}

export function useGridColumns(containerRef: RefObject<HTMLElement | null>) {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      setColumnCount(
        Math.max(1, Math.floor((width + GAP_PX) / (MIN_COL_WIDTH + GAP_PX))),
      );
    };

    const update = scheduleMeasure(measure);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  return columnCount;
}
