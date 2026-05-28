export type CatalogKind = 'movies' | 'games' | 'books';

export interface BaseItem {
  id: string;
  title: string;
  year: number;
  genres: string[];
  rating: number;
  description: string;
}

export interface Movie extends BaseItem {
  actors: string[];
}

export interface Game extends BaseItem {
  developer: string;
  platforms: string[];
  /** Steam / Nintendo и др. из внешнего каталога */
  storeUrl?: string;
  /** Статья Wikipedia (импорт бестселлеров) */
  wikiUrl?: string;
}

export interface Book extends BaseItem {
  author: string;
}

export type CatalogItem = Movie | Game | Book;

export type ConsumedFilter = 'all' | 'unseen' | 'seen';

export interface FiltersState {
  search: string;
  genres: string[];
  yearMin: number | null;
  yearMax: number | null;
  ratingMin: number | null;
  actors: string[];
  developers: string[];
  platforms: string[];
  authors: string[];
  favoriteOnly: boolean;
  consumedFilter: ConsumedFilter;
  playlistOnly: boolean;
}

export const emptyFilters = (): FiltersState => ({
  search: '',
  genres: [],
  yearMin: null,
  yearMax: null,
  ratingMin: null,
  actors: [],
  developers: [],
  platforms: [],
  authors: [],
  favoriteOnly: false,
  consumedFilter: 'all',
  playlistOnly: false,
});

/** Сброс каталожных фильтров; пользовательские сохраняются при смене вкладки. */
export const resetCatalogFilters = (prev: FiltersState): FiltersState => ({
  ...emptyFilters(),
  favoriteOnly: prev.favoriteOnly,
  consumedFilter: prev.consumedFilter,
  playlistOnly: prev.playlistOnly,
});
