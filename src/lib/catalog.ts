import type { Book, CatalogItem, CatalogKind, FiltersState, Game, Movie } from '../types';
import type { UserLibrary } from './userLibrary';
import { getItemState } from './userLibrary';
import { sanitizeMovieGenres } from './movieGenres';

export interface FilterOptions {
  genres: string[];
  yearMin: number;
  yearMax: number;
  actors: string[];
  developers: string[];
  platforms: string[];
  authors: string[];
}

export interface CatalogBundle {
  items: CatalogItem[];
  options: FilterOptions;
  /** Предсобранная строка для поиска (lowercase). */
  searchText: string[];
}

const loaders: Record<CatalogKind, () => Promise<CatalogItem[]>> = {
  movies: () => import('../../data/movies.json').then((m) => m.default as Movie[]),
  games: () => import('../../data/games.json').then((m) => m.default as Game[]),
  books: () => import('../../data/books.json').then((m) => m.default as Book[]),
};

const cache: Partial<Record<CatalogKind, CatalogBundle>> = {};

export function getCachedCatalog(kind: CatalogKind): CatalogBundle | undefined {
  return cache[kind];
}

function buildSearchText(item: CatalogItem): string {
  const parts = [
    item.title,
    item.description,
    ...item.genres,
    String(item.year),
    String(item.rating),
  ];
  if ('actors' in item) parts.push(...(item.actors ?? []));
  if ('developer' in item) parts.push(item.developer);
  if ('platforms' in item) parts.push(...(item.platforms ?? []));
  if ('author' in item) parts.push(item.author);
  return parts.join('\n').toLowerCase();
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ru'));
}

export function emptyFilterOptions(): FilterOptions {
  const y = new Date().getFullYear();
  return {
    genres: [],
    yearMin: 1900,
    yearMax: y,
    actors: [],
    developers: [],
    platforms: [],
    authors: [],
  };
}

function buildFilterOptions(kind: CatalogKind, items: CatalogItem[]): FilterOptions {
  if (!items.length) return emptyFilterOptions();

  const genres = uniqueSorted(items.flatMap((i) => i.genres));
  const years = items.map((i) => i.year).filter((y) => y > 0);
  const yearMin = years.length ? Math.min(...years) : 1900;
  const yearMax = years.length ? Math.max(...years) : new Date().getFullYear();

  if (kind === 'movies') {
    const movies = items as Movie[];
    return {
      genres,
      yearMin,
      yearMax,
      actors: uniqueSorted(movies.flatMap((m) => m.actors)),
      developers: [],
      platforms: [],
      authors: [],
    };
  }
  if (kind === 'games') {
    const games = items as Game[];
    return {
      genres,
      yearMin,
      yearMax,
      actors: [],
      developers: uniqueSorted(games.map((g) => g.developer).filter(Boolean)),
      platforms: uniqueSorted(games.flatMap((g) => g.platforms ?? [])),
      authors: [],
    };
  }
  const books = items as Book[];
  return {
    genres,
    yearMin,
    yearMax,
    actors: [],
    developers: [],
    platforms: [],
    authors: uniqueSorted(books.map((b) => b.author)),
  };
}

function buildBundle(kind: CatalogKind, items: CatalogItem[]): CatalogBundle {
  const normalized =
    kind === 'movies'
      ? (items as Movie[]).map((m) => ({
          ...m,
          genres: sanitizeMovieGenres(m.genres),
        }))
      : items;
  return {
    items: normalized,
    options: buildFilterOptions(kind, normalized),
    searchText: normalized.map(buildSearchText),
  };
}

export async function loadCatalog(kind: CatalogKind): Promise<CatalogBundle> {
  const existing = cache[kind];
  if (existing) return existing;
  const items = await loaders[kind]();
  const bundle = buildBundle(kind, items);
  cache[kind] = bundle;
  return bundle;
}

/** Подгрузка при наведении на вкладку — без блокировки UI. */
export function preloadCatalog(kind: CatalogKind): void {
  void loadCatalog(kind);
}

export function filterIndices(
  kind: CatalogKind,
  bundle: CatalogBundle,
  filters: FiltersState,
  userLibrary?: UserLibrary,
): number[] {
  const { items, searchText } = bundle;
  const needle = filters.search.trim().toLowerCase();
  const genreSet =
    filters.genres.length > 0 ? new Set(filters.genres) : null;
  const actorSet =
    filters.actors.length > 0 ? new Set(filters.actors) : null;
  const developerSet =
    filters.developers.length > 0 ? new Set(filters.developers) : null;
  const platformSet =
    filters.platforms.length > 0 ? new Set(filters.platforms) : null;
  const authorSet =
    filters.authors.length > 0 ? new Set(filters.authors) : null;

  const result: number[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;

    if (needle && !searchText[i]!.includes(needle)) continue;

    if (genreSet) {
      let ok = false;
      for (const g of item.genres) {
        if (genreSet.has(g)) {
          ok = true;
          break;
        }
      }
      if (!ok) continue;
    }

    if (filters.yearMin != null && item.year < filters.yearMin) continue;
    if (filters.yearMax != null && item.year > filters.yearMax) continue;
    if (filters.ratingMin != null && item.rating < filters.ratingMin) continue;

    if (kind === 'movies' && actorSet) {
      const m = item as Movie;
      let ok = false;
      for (const a of m.actors) {
        if (actorSet.has(a)) {
          ok = true;
          break;
        }
      }
      if (!ok) continue;
    }

    if (kind === 'games' && developerSet) {
      if (!developerSet.has((item as Game).developer)) continue;
    }

    if (kind === 'games' && platformSet) {
      const g = item as Game;
      let ok = false;
      for (const p of g.platforms ?? []) {
        if (platformSet.has(p)) {
          ok = true;
          break;
        }
      }
      if (!ok) continue;
    }

    if (kind === 'books' && authorSet) {
      if (!authorSet.has((item as Book).author)) continue;
    }

    if (userLibrary && (filters.favoriteOnly || filters.playlistOnly || filters.consumedFilter !== 'all')) {
      const state = getItemState(userLibrary, kind, item.id);
      if (filters.favoriteOnly && !state.favorite) continue;
      if (filters.playlistOnly && !state.inPlaylist) continue;
      if (filters.consumedFilter === 'seen' && !state.consumed) continue;
      if (filters.consumedFilter === 'unseen' && state.consumed) continue;
    }

    result.push(i);
  }

  return result;
}

export function pickRandomIndex(indices: number[]): number | null {
  if (!indices.length) return null;
  return indices[Math.floor(Math.random() * indices.length)]!;
}
