# RandomManager

SPA-каталог **фильмов**, **игр** и **книг** со случайным выбором с учётом фильтров. Статический сайт для [GitHub Pages](https://pages.github.com/).

## Возможности

- Три раздела: кино (жанры, актёры, рейтинг), игры (жанр, год, разработчик, платформа), книги (автор, год, жанр)
- Поиск и фильтры (жанры, год, рейтинг, актёры / разработчик / платформы / авторы)
- **Случайный выбор** по текущей вкладке и активным фильтрам, с анимацией «рулетки»
- Тёмная тема по умолчанию, переключение на светлую
- Каталог в папке [`data/`](data/) — JSON (удобно править вручную; SQLite на GH Pages без сервера не используется)

## Локальная разработка

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
npm run preview
```

Для деплоя в **корень** `username.github.io` задайте при сборке:

```bash
# Windows PowerShell
$env:GITHUB_PAGES_BASE="./"; npm run build
```

Для репозитория `RandomManager` workflow уже подставляет `base: /RandomManager/`.

## Android-приложение

APK лежит в [`public/RandomManagerMobile.apk`](public/RandomManagerMobile.apk) и попадает в сборку как статический файл. На сайте в шапке есть ссылка «Скачать APK». Чтобы обновить билд, скопируйте свежий `.apk` из мобильного проекта в `public/`.

## Публикация на GitHub Pages

1. Залейте репозиторий на GitHub.
2. **Settings → Pages → Build and deployment**: Source — **GitHub Actions**.
3. Запушьте в `main` / `master` — сработает [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Редактирование каталога

| Файл | Содержимое |
|------|------------|
| `data/movies.json` | `title`, `year`, `genres[]`, `actors[]`, `rating`, `description` |
| `data/games.json` | + `developer`, `platforms[]` |
| `data/books.json` | + `author` |

После изменения JSON пересоберите проект (`npm run build`).

### Импорт из внешних источников

| Команда | Источник |
|---------|----------|
| `npm run import:games:mdx` | IT Universe `docs/tools/games/4.mdx` — полный алфавитный список |
| `npm run import:games:steam` | [Steam Charts — сейчас играют](https://store.steampowered.com/charts/mostplayed?l=russian) (топ‑100, ~1 мин) |
| `npm run import:games:wiki` | [Wikipedia — best-selling video games](https://en.wikipedia.org/wiki/List_of_best-selling_video_games) (~50 позиций) |

Скрипты дополняют `data/games.json`, не затирая уже существующие записи (сопоставление по названию). Для Steam подтягиваются жанры, год, разработчик и ссылка на страницу магазина.

### Локальная админка

Папка `admin/` в `.gitignore` — не попадает на GitHub Pages. Удобный CRUD-интерфейс с записью прямо в `data/*.json` (нужен dev-сервер с API):

```bash
cd admin && npm install && npm run dev
# или из корня:
npm run admin
```

Откройте http://localhost:5174 — создание, правка, удаление, теги для жанров/актёров/платформ. Для публикации сайта после правок: `npm run build` в корне.

## Стек

- [Vite](https://vitejs.dev/) + React + TypeScript
- [Framer Motion](https://www.framer.com/motion/) — анимации
- [@tanstack/react-virtual](https://tanstack.com/virtual) — виртуализация сетки каталога

## Architecture / Архитектура

Модель [C4](https://c4model.com/): **Context → Containers → Components**, плюс sequence для ключевых сценариев.  
Production — только статика на GitHub Pages; **dev-контур** (`scripts/`, `admin/`) в репозиторий не коммитится (см. `.gitignore`), но участвует в жизненном цикле каталога.

> Диаграммы — [Mermaid C4](https://mermaid.js.org/syntax/c4.html). Рендер: GitHub, VS Code (Mermaid), [mermaid.live](https://mermaid.live).

### Level 1 — System Context

```mermaid
C4Context
  title RandomManager — System Context

  Person(user, "User", "Просмотр каталога, фильтры, random pick, плейлист")
  Person(dev, "Developer", "Импорт данных, админка, сборка и деплой")

  System(rm, "RandomManager", "SPA: movies / games / books + filters + roulette + user library")

  System_Ext(ghp, "GitHub Pages", "Static hosting для production")
  System_Ext(gha, "GitHub Actions", "CI: npm ci → build → deploy-pages")
  System_Ext(fonts, "Google Fonts", "Outfit, JetBrains Mono (index.html)")
  System_Ext(browser, "Browser APIs", "localStorage, Clipboard, Web Share")

  System_Ext(steam, "Steam Charts", "import:games:steam")
  System_Ext(wiki, "Wikipedia", "import:games:wiki, import:movies:imdb-wiki")
  System_Ext(kp, "Kinopoisk / TSV / lists", "import:movies:*")
  System_Ext(mdx, "IT Universe MDX", "import:games:mdx")

  System(admin, "Local Admin", "Dev CRUD UI :5174 → data/*.json (gitignored)")
  System(scripts, "Import scripts", "Node .mjs → merge/dedupe data/*.json (gitignored)")

  Rel(user, rm, "Uses", "HTTPS")
  Rel(dev, scripts, "Runs imports", "npm run import:*")
  Rel(dev, admin, "Edits catalog", "localhost:5174")
  Rel(dev, gha, "Push main → trigger workflow")
  Rel(gha, ghp, "Deploy dist/")
  Rel(ghp, user, "Serves static bundle")
  Rel(rm, browser, "Persists state", "localStorage")
  Rel(rm, fonts, "Loads fonts")
  Rel(rm, browser, "Export playlist", "copy / share")
  Rel(scripts, steam, "Fetch")
  Rel(scripts, wiki, "Fetch")
  Rel(scripts, kp, "Read/merge")
  Rel(scripts, mdx, "Parse")
  Rel(scripts, rm, "Writes", "data/*.json at dev time")
  Rel(admin, rm, "Writes", "data/*.json at dev time")
```

### Level 2 — Containers

```mermaid
C4Container
  title RandomManager — Containers

  Person(user, "User", "")
  Person(dev, "Developer", "")

  System_Boundary(prod, "Production (deployed)") {
    Container(spa, "Web App", "React 18, TypeScript, Vite 6", "Tabs, filters, grid, RandomPicker, PlaylistPanel")
    ContainerDb(json, "Catalog store", "data/*.json", "movies.json, games.json, books.json — bundled as JS chunks")
    ContainerDb(ls, "User library", "localStorage", "random-manager-library, random-manager-theme")
    Container(dist, "Static bundle", "dist/", "SPA + catalog-movies|games|books chunks")
    Container(ci, "Deploy workflow", ".github/workflows/deploy.yml", "Node 22, GITHUB_PAGES_BASE, upload-pages-artifact")
  }

  System_Boundary(devbox, "Development (local, not on Pages)") {
    Container(vite_dev, "Vite dev server", "npm run dev", "HMR, :5173")
    Container(adm, "Admin app + API", "admin/ (gitignored)", "CRUD → data/*.json")
    Container(imp, "Import scripts", "scripts/ (gitignored)", "Steam, Wiki, Kinopoisk, dedupe, fix:genres")
  }

  System_Ext(ghp, "GitHub Pages", "")
  System_Ext(fonts, "Google Fonts", "")

  Rel(user, spa, "Uses")
  Rel(spa, json, "dynamic import()", "per tab, in-memory cache")
  Rel(spa, ls, "read/write", "useUserLibrary, useTheme")
  Rel(spa, fonts, "CSS fonts")
  Rel(dev, vite_dev, "npm run dev")
  Rel(dev, adm, "npm run admin")
  Rel(dev, imp, "npm run import:* / dedupe:* / fix:*")
  Rel(imp, json, "merge/patch files")
  Rel(adm, json, "CRUD writes")
  Rel(dev, ci, "git push")
  Rel(ci, dist, "npm run build")
  Rel(dist, ghp, "deploy-pages@v4")
  Rel(ghp, user, "HTTPS")
  Rel(vite_dev, spa, "serves src/")
```

### Level 3 — Components (Web App)

```mermaid
C4Component
  title Web App — Components (src/)

  Container_Boundary(app, "React SPA") {
    Component(main, "main.tsx", "Bootstrap", "theme init, preloadCatalog(movies), createRoot")
    Component(appc, "App.tsx", "Shell", "tab state, filters, wires hooks → UI")

    Component(h_cat, "useCatalog", "Hook", "load tab bundle via catalog.ts")
    Component(h_filt, "useFilteredIndices", "Hook", "filterIndices + useTransition")
    Component(h_lib, "useUserLibrary", "Hook", "patches UserLibrary in localStorage")
    Component(h_theme, "useTheme", "Hook", "dark/light toggle")
    Component(h_deb, "useDebouncedValue", "Hook", "debounced search")
    Component(h_grid, "useGridColumns / useScrollMargin", "Hooks", "virtualizer layout")

    Component(lib_cat, "lib/catalog.ts", "Domain", "loaders, cache, FilterOptions, filterIndices, pickRandomIndex")
    Component(lib_lib, "lib/userLibrary.ts", "Domain", "favorites, consumed, playlist flags")
    Component(lib_exp, "lib/playlistExport.ts", "Domain", "text/JSON, copy, download, navigator.share")
    Component(lib_gen, "lib/movieGenres.ts", "Domain", "sanitizeMovieGenres on movies load")

    Component(ui_head, "Header / TabNav", "UI", "theme, tabs, preloadCatalog on hover")
    Component(ui_filt, "FilterPanel / SearchBar", "UI", "FiltersState, chips")
    Component(ui_rand, "RandomPicker", "UI", "Framer Motion roulette → pickRandomIndex")
    Component(ui_grid, "CatalogGrid / CatalogCard", "UI", "@tanstack/react-virtual window")
    Component(ui_pl, "PlaylistPanel / ItemActions", "UI", "library toggles, export")
  }

  ContainerDb(json, "data/*.json", "")
  ContainerDb(ls, "localStorage", "")

  Rel(main, appc, "renders")
  Rel(appc, h_cat, "")
  Rel(appc, h_filt, "")
  Rel(appc, h_lib, "")
  Rel(appc, h_theme, "")
  Rel(appc, h_deb, "")
  Rel(h_cat, lib_cat, "")
  Rel(h_filt, lib_cat, "filterIndices")
  Rel(h_filt, lib_lib, "consumed filter")
  Rel(h_lib, lib_lib, "")
  Rel(h_lib, ls, "")
  Rel(h_theme, ls, "")
  Rel(lib_cat, json, "import()")
  Rel(lib_cat, lib_gen, "movies only")
  Rel(appc, ui_head, "")
  Rel(appc, ui_filt, "")
  Rel(appc, ui_rand, "")
  Rel(appc, ui_grid, "")
  Rel(appc, ui_pl, "")
  Rel(ui_rand, lib_cat, "pickRandomIndex")
  Rel(ui_pl, lib_exp, "")
  Rel(ui_pl, lib_lib, "")
```

### Dynamic — загрузка вкладки каталога

```mermaid
sequenceDiagram
  actor U as User
  participant TN as TabNav
  participant App as App.tsx
  participant UC as useCatalog
  participant Cat as catalog.ts
  participant JSON as data/*.json chunk

  U->>TN: switch tab (movies|games|books)
  TN->>Cat: preloadCatalog(kind) optional hover
  TN->>App: onTabChange → reset filters
  App->>UC: tab changed
  alt cache hit
    UC-->>App: bundle from memory
  else cache miss
    UC->>Cat: loadCatalog(kind)
    Cat->>JSON: dynamic import()
    JSON-->>Cat: CatalogItem[]
    Cat->>Cat: build FilterOptions, searchText[]
    Note over Cat: movies → sanitizeMovieGenres
    Cat->>Cat: store in cache[kind]
    Cat-->>UC: CatalogBundle
  end
  UC-->>App: bundle, loading=false
  App->>App: useFilteredIndices → indices
```

### Dynamic — random pick с фильтрами

```mermaid
sequenceDiagram
  actor U as User
  participant RP as RandomPicker
  participant App as App.tsx
  participant FI as useFilteredIndices
  participant Cat as catalog.ts
  participant Lib as userLibrary

  U->>App: set filters / search
  App->>FI: filters + bundle + library
  FI->>Cat: filterIndices(...)
  Cat->>Lib: skip consumed if filter on
  Cat-->>FI: number[] indices
  FI-->>App: indices, isPending
  U->>RP: click Random
  RP->>Cat: pickRandomIndex(indices)
  Cat-->>RP: index
  RP->>RP: Framer Motion spin animation
  RP-->>U: highlight card in CatalogGrid
```

### Dynamic — dev: обновление каталога

```mermaid
sequenceDiagram
  actor D as Developer
  participant NPM as npm scripts
  participant Scr as scripts/*.mjs
  participant Adm as admin/ :5174
  participant Data as data/*.json
  participant Bld as npm run build
  participant CI as GitHub Actions

  alt import pipeline
    D->>NPM: import:games:steam / import:movies:* ...
    NPM->>Scr: node script
    Scr->>Scr: fetch/parse external source
    Scr->>Data: merge by title/id, dedupe
  else local admin
    D->>NPM: npm run admin
    D->>Adm: CRUD in browser
    Adm->>Data: write JSON files
  end
  D->>Bld: vite build + tsc
  Bld->>Bld: manualChunks → catalog-movies|games|books
  D->>CI: git push main
  CI->>CI: GITHUB_PAGES_BASE=/RepoName/
  CI-->>D: GitHub Pages updated
```

### Data — сущности и хранение

| Layer | Location | Contents |
|-------|----------|----------|
| **Catalog** | `data/movies.json`, `games.json`, `books.json` | Immutable at runtime; shipped as separate Vite chunks |
| **User library** | `localStorage` key `random-manager-library` | Per-item: `favorite`, `consumed`, `inPlaylist` by `CatalogKind` + `id` |
| **Theme** | `localStorage` key `random-manager-theme` | `dark` \| `light` |
| **Types** | `src/types.ts` | `Movie`, `Game`, `Book`, `FiltersState`, `CatalogKind` |

```mermaid
flowchart LR
  subgraph build_time [Build time]
    JSON[data/*.json]
    Vite[Vite + manualChunks]
    JSON --> Vite
    Vite --> Chunks[catalog-movies / games / books.js]
  end

  subgraph run_time [Runtime — browser]
    SPA[Web App]
    Cache[catalog.ts in-memory cache]
    LS[(localStorage)]
    Chunks -->|import on tab| Cache
    Cache --> SPA
    SPA <--> LS
  end
```
