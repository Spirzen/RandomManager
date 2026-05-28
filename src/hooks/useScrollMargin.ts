import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

function scheduleMeasure(callback: () => void): () => void {
  let raf = 0;
  return () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(callback);
  };
}

export function useScrollMargin(
  containerRef: RefObject<HTMLElement | null>,
  /** Пересчитать, когда меняется контент над сеткой (вкладка, фильтры). */
  resetKey: string | number,
) {
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    };

    const update = scheduleMeasure(measure);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [containerRef, resetKey]);

  return scrollMargin;
}
