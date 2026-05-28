import type { CatalogKind } from '../types';

export interface UserItemState {
  favorite?: boolean;
  consumed?: boolean;
  inPlaylist?: boolean;
}

export type UserLibrary = Record<CatalogKind, Record<string, UserItemState>>;

const STORAGE_KEY = 'random-manager-library';

export function emptyUserLibrary(): UserLibrary {
  return { movies: {}, games: {}, books: {} };
}

export function loadUserLibrary(): UserLibrary {
  if (typeof window === 'undefined') return emptyUserLibrary();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyUserLibrary();
    const parsed = JSON.parse(raw) as Partial<UserLibrary>;
    return {
      movies: parsed.movies ?? {},
      games: parsed.games ?? {},
      books: parsed.books ?? {},
    };
  } catch {
    return emptyUserLibrary();
  }
}

export function saveUserLibrary(library: UserLibrary): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function getItemState(
  library: UserLibrary,
  kind: CatalogKind,
  id: string,
): UserItemState {
  return library[kind][id] ?? {};
}

export function patchItemState(
  library: UserLibrary,
  kind: CatalogKind,
  id: string,
  patch: Partial<UserItemState>,
): UserLibrary {
  const prev = library[kind][id] ?? {};
  const next = { ...prev, ...patch };

  if (!next.favorite) delete next.favorite;
  if (!next.consumed) delete next.consumed;
  if (!next.inPlaylist) delete next.inPlaylist;

  const kindMap = { ...library[kind] };
  if (Object.keys(next).length === 0) {
    delete kindMap[id];
  } else {
    kindMap[id] = next;
  }

  return { ...library, [kind]: kindMap };
}

export function toggleFlag(
  library: UserLibrary,
  kind: CatalogKind,
  id: string,
  flag: keyof UserItemState,
): UserLibrary {
  const current = getItemState(library, kind, id);
  return patchItemState(library, kind, id, { [flag]: !current[flag] });
}

export function clearPlaylist(
  library: UserLibrary,
  kind: CatalogKind,
): UserLibrary {
  const kindMap = { ...library[kind] };
  for (const [id, state] of Object.entries(kindMap)) {
    if (state.inPlaylist) {
      const next = { ...state };
      delete next.inPlaylist;
      if (Object.keys(next).length === 0) delete kindMap[id];
      else kindMap[id] = next;
    }
  }
  return { ...library, [kind]: kindMap };
}

export function countByFlag(
  library: UserLibrary,
  kind: CatalogKind,
  flag: keyof UserItemState,
): number {
  return Object.values(library[kind]).filter((s) => s[flag]).length;
}

export function playlistIds(library: UserLibrary, kind: CatalogKind): string[] {
  return Object.entries(library[kind])
    .filter(([, s]) => s.inPlaylist)
    .map(([id]) => id);
}
