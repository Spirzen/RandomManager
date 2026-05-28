import { useMemo, useState, useTransition } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { RandomPicker } from './components/RandomPicker';
import { CatalogGrid } from './components/CatalogGrid';
import { useCatalog } from './hooks/useCatalog';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useFilteredIndices } from './hooks/useFilteredIndices';
import { useTheme } from './hooks/useTheme';
import { emptyFilterOptions } from './lib/catalog';
import type { CatalogKind, FiltersState } from './types';
import { emptyFilters } from './types';
import appStyles from './styles/App.module.css';

export default function App() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<CatalogKind>('movies');
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [, startTransition] = useTransition();

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
  );

  const searchPending = filters.search !== debouncedSearch;
  const isPending = filterPending || searchPending;

  const options = bundle?.options ?? emptyFilterOptions();
  const items = bundle?.items ?? [];

  const patchFilters = (patch: Partial<FiltersState>) => {
    startTransition(() => {
      setFilters((f) => ({ ...f, ...patch }));
    });
  };

  const handleTabChange = (next: CatalogKind) => {
    setTab(next);
    setFilters(emptyFilters());
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
            Каталог с поиском и фильтрами — и одна кнопка, чтобы решить за вас.
          </p>
        </header>

        <div className={appStyles.layout}>
          <div className={appStyles.randomSlot}>
            <RandomPicker
              kind={tab}
              items={items}
              poolIndices={indices}
              disabled={catalogLoading}
            />
          </div>

          <aside className={appStyles.sidebar}>
            <FilterPanel
              kind={tab}
              filters={filters}
              options={options}
              disabled={catalogLoading}
              onChange={patchFilters}
              onReset={() => setFilters(emptyFilters())}
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
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
