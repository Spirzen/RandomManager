import { useDeferredValue, useMemo } from 'react';
import type { CatalogBundle } from '../lib/catalog';
import { filterIndices } from '../lib/catalog';
import type { CatalogKind, FiltersState } from '../types';

export function useFilteredIndices(
  kind: CatalogKind,
  bundle: CatalogBundle | null,
  filters: FiltersState,
) {
  const deferredFilters = useDeferredValue(filters);
  const isPending = deferredFilters !== filters;

  const indices = useMemo(() => {
    if (!bundle) return [];
    return filterIndices(kind, bundle, deferredFilters);
  }, [kind, bundle, deferredFilters]);

  return { indices, isPending };
}
