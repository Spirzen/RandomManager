import { useEffect, useState } from 'react';
import type { CatalogBundle } from '../lib/catalog';
import { getCachedCatalog, loadCatalog } from '../lib/catalog';
import type { CatalogKind } from '../types';

type CatalogState = {
  kind: CatalogKind;
  bundle: CatalogBundle | null;
  loading: boolean;
};

function stateForKind(kind: CatalogKind): CatalogState {
  const cached = getCachedCatalog(kind);
  return { kind, bundle: cached ?? null, loading: !cached };
}

export function useCatalog(kind: CatalogKind) {
  const [state, setState] = useState<CatalogState>(() => stateForKind(kind));

  // Сброс сразу при смене вкладки — не ждём useEffect (иначе 1 кадр с чужим bundle).
  if (kind !== state.kind) {
    setState(stateForKind(kind));
  }

  useEffect(() => {
    if (getCachedCatalog(kind)) return;

    let cancelled = false;

    loadCatalog(kind).then((data) => {
      if (!cancelled) {
        setState({ kind, bundle: data, loading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [kind]);

  const inSync = state.kind === kind;

  return {
    bundle: inSync ? state.bundle : null,
    loading: !inSync || state.loading,
  };
}
