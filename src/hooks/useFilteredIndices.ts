import { useDeferredValue, useMemo } from 'react';
import type { CatalogBundle } from '../lib/catalog';
import { filterIndices } from '../lib/catalog';
import type { UserLibrary } from '../lib/userLibrary';
import type { CatalogKind, FiltersState } from '../types';

export function useFilteredIndices(
  kind: CatalogKind,
  bundle: CatalogBundle | null,
  filters: FiltersState,
  userLibrary: UserLibrary,
) {
  const deferredFilters = useDeferredValue(filters);
  const isPending = deferredFilters !== filters;

  const indices = useMemo(() => {
    if (!bundle) return [];
    return filterIndices(kind, bundle, deferredFilters, userLibrary);
  }, [kind, bundle, deferredFilters, userLibrary]);

  return { indices, isPending };
}
