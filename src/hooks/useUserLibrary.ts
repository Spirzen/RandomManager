import { useCallback, useEffect, useState } from 'react';
import type { CatalogKind } from '../types';
import {
  clearPlaylist as clearPlaylistLib,
  getItemState,
  loadUserLibrary,
  patchItemState,
  saveUserLibrary,
  toggleFlag,
  type UserItemState,
  type UserLibrary,
} from '../lib/userLibrary';

export function useUserLibrary() {
  const [library, setLibrary] = useState<UserLibrary>(loadUserLibrary);

  useEffect(() => {
    saveUserLibrary(library);
  }, [library]);

  const getState = useCallback(
    (kind: CatalogKind, id: string): UserItemState =>
      getItemState(library, kind, id),
    [library],
  );

  const toggleFavorite = useCallback((kind: CatalogKind, id: string) => {
    setLibrary((lib) => toggleFlag(lib, kind, id, 'favorite'));
  }, []);

  const toggleConsumed = useCallback((kind: CatalogKind, id: string) => {
    setLibrary((lib) => toggleFlag(lib, kind, id, 'consumed'));
  }, []);

  const togglePlaylist = useCallback((kind: CatalogKind, id: string) => {
    setLibrary((lib) => toggleFlag(lib, kind, id, 'inPlaylist'));
  }, []);

  const clearPlaylist = useCallback((kind: CatalogKind) => {
    setLibrary((lib) => clearPlaylistLib(lib, kind));
  }, []);

  const setItemState = useCallback(
    (kind: CatalogKind, id: string, patch: Partial<UserItemState>) => {
      setLibrary((lib) => patchItemState(lib, kind, id, patch));
    },
    [],
  );

  return {
    library,
    getState,
    toggleFavorite,
    toggleConsumed,
    togglePlaylist,
    clearPlaylist,
    setItemState,
  };
}
