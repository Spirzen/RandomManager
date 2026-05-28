import { useCallback, useMemo, useState, useTransition } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { PlaylistPanel } from './components/PlaylistPanel';
import { RandomPicker } from './components/RandomPicker';
import { CatalogGrid } from './components/CatalogGrid';
import { useCatalog } from './hooks/useCatalog';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useFilteredIndices } from './hooks/useFilteredIndices';
import { useTheme } from './hooks/useTheme';
import { useUserLibrary } from './hooks/useUserLibrary';
import { emptyFilterOptions } from './lib/catalog';
import { countByFlag } from './lib/userLibrary';
import type { CatalogKind, FiltersState } from './types';
import { emptyFilters, resetCatalogFilters } from './types';
import appStyles from './styles/App.module.css';

export default function App() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<CatalogKind>('movies');
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [, startTransition] = useTransition();

  const {
    library,
    getState: getRawState,
    toggleFavorite,
    toggleConsumed,
    togglePlaylist,
    clearPlaylist,
  } = useUserLibrary();

  const { bundle, loading: catalogLoading } = useCatalog(tab);

  const debouncedSearch = useDebouncedValue(filters.search);
  const filtersForQuery = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const { indices, isPending: filterPending } = useFilteredIndices(
    tab,
    bundle,
    filtersForQuery,
    library,
  );

  const searchPending = filters.search !== debouncedSearch;
  const isPending = filterPending || searchPending;

  const options = bundle?.options ?? emptyFilterOptions();
  const items = bundle?.items ?? [];
  const favoriteCount = countByFlag(library, tab, 'favorite');
  const playlistCount = countByFlag(library, tab, 'inPlaylist');

  const getCardState = useCallback(
    (id: string) => {
      const state = getRawState(tab, id);
      return {
        favorite: !!state.favorite,
        consumed: !!state.consumed,
        inPlaylist: !!state.inPlaylist,
      };
    },
    [getRawState, tab],
  );

  const patchFilters = (patch: Partial<FiltersState>) => {
    startTransition(() => {
      setFilters((f) => ({ ...f, ...patch }));
    });
  };

  const handleTabChange = (next: CatalogKind) => {
    setTab(next);
    setFilters((f) => resetCatalogFilters(f));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const tabLabel =
    tab === 'movies' ? 'фильмов' : tab === 'games' ? 'игр' : 'книг';

  return (
    <div className={appStyles.app}>
      <Header
        theme={theme}
        onToggleTheme={toggle}
        activeTab={tab}
        onTabChange={handleTabChange}
      />
      <main className={appStyles.main}>
        <header className={appStyles.pageIntro}>
          <h1 className={appStyles.pageTitle}>Что выбрать сегодня?</h1>
          <p className={appStyles.pageLead}>
            Каталог с поиском и фильтрами — избранное, плейлист и отметки «уже
            смотрел». И одна кнопка, чтобы решить за вас.
          </p>
        </header>

        <div className={appStyles.layout}>
          <div className={appStyles.randomSlot}>
            <RandomPicker
              kind={tab}
              items={items}
              poolIndices={indices}
              disabled={catalogLoading}
              getState={getCardState}
              onToggleFavorite={(id) => toggleFavorite(tab, id)}
              onToggleConsumed={(id) => toggleConsumed(tab, id)}
              onTogglePlaylist={(id) => togglePlaylist(tab, id)}
            />
          </div>

          <aside className={appStyles.sidebar}>
            <FilterPanel
              kind={tab}
              filters={filters}
              options={options}
              favoriteCount={favoriteCount}
              playlistCount={playlistCount}
              disabled={catalogLoading}
              onChange={patchFilters}
              onReset={() => setFilters(emptyFilters())}
            />
            <PlaylistPanel
              kind={tab}
              items={items}
              library={library}
              onRemove={(id) => togglePlaylist(tab, id)}
              onClear={() => clearPlaylist(tab)}
            />
          </aside>

          <div className={appStyles.content}>
            <div className={appStyles.toolbar}>
              <SearchBar
                value={filters.search}
                onChange={(search) => patchFilters({ search })}
                placeholder={`Поиск среди ${tabLabel}…`}
              />
              <p className={appStyles.resultCount}>
                {catalogLoading ? (
                  'Загрузка…'
                ) : (
                  <>
                    Найдено: <strong>{indices.length}</strong>
                    {isPending && (
                      <span className={appStyles.pending}> · обновляем</span>
                    )}
                  </>
                )}
              </p>
            </div>

            {catalogLoading ? (
              <p className={appStyles.catalogLoading} role="status">
                Загружаем каталог…
              </p>
            ) : (
              <CatalogGrid
                key={tab}
                items={items}
                indices={indices}
                kind={tab}
                isPending={isPending}
                getState={getCardState}
                onToggleFavorite={(id) => toggleFavorite(tab, id)}
                onToggleConsumed={(id) => toggleConsumed(tab, id)}
                onTogglePlaylist={(id) => togglePlaylist(tab, id)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
