import type { CatalogKind } from '../types';

export const CONSUMED_FILTER_LABELS: Record<
  CatalogKind,
  { section: string; unseen: string; seen: string }
> = {
  movies: { section: 'Просмотрено', unseen: 'Не смотрел', seen: 'Смотрел' },
  games: { section: 'Пройдено', unseen: 'Не играл', seen: 'Играл' },
  books: { section: 'Прочитано', unseen: 'Не читал', seen: 'Читал' },
};
