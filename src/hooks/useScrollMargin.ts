import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useScrollMargin(
  containerRef: RefObject<HTMLElement | null>,
  /** Пересчитать, когда меняется контент над сеткой (вкладка, фильтры). */
  resetKey: string | number,
) {
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [containerRef, resetKey]);

  return scrollMargin;
}
