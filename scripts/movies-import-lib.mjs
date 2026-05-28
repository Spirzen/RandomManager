import { readFileSync, writeFileSync } from 'node:fs';

export function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9а-я\s]/gi, '')
    .trim();
}

export function nextMovieId(existing) {
  let n = 1;
  const ids = new Set(existing.map((m) => m.id));
  while (ids.has(`m${n}`)) n += 1;
  return `m${n}`;
}

export function loadMovies(moviesPath) {
  return JSON.parse(readFileSync(moviesPath, 'utf8'));
}

export function saveMovies(moviesPath, movies) {
  const sorted = [...movies].sort((a, b) =>
    a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }),
  );
  writeFileSync(moviesPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  return sorted;
}

const GENERIC_DESCRIPTION =
  /^(Фильм из списка|Топ |Из подборки|В чарте Steam|BBC |Подборка )/i;

export function isGenericDescription(text) {
  return !text || GENERIC_DESCRIPTION.test(text);
}

/**
 * @param {Array<{ title: string, year?: number, genres?: string[], actors?: string[], rating?: number, description?: string }>} entries
 */
export function mergeMovieEntries(existing, entries, defaults) {
  const byNorm = new Map();
  for (const movie of existing) {
    byNorm.set(normalizeTitle(movie.title), movie);
  }

  let added = 0;
  let skipped = 0;
  let updated = 0;

  for (const entry of entries) {
    const title = entry.title?.trim();
    if (!title) continue;
    const norm = normalizeTitle(title);
    if (!norm) continue;

    const prev = byNorm.get(norm);
    if (prev) {
      skipped += 1;
      if (entry.year && !prev.year) {
        prev.year = entry.year;
        updated += 1;
      }
      if (entry.genres?.length) {
        const merged = new Set([...(prev.genres ?? []), ...entry.genres]);
        if (merged.size > (prev.genres?.length ?? 0)) {
          prev.genres = [...merged];
          updated += 1;
        }
      }
      if (
        entry.description &&
        !isGenericDescription(entry.description) &&
        (isGenericDescription(prev.description) ||
          entry.description.length > (prev.description?.length ?? 0))
      ) {
        prev.description = entry.description;
        updated += 1;
      }
      if (entry.rating && (!prev.rating || entry.rating > prev.rating)) {
        prev.rating = entry.rating;
        updated += 1;
      }
      continue;
    }

    const id = nextMovieId([...byNorm.values()]);
    const movie = {
      id,
      title,
      year: entry.year ?? defaults.year ?? 0,
      genres: entry.genres ?? defaults.genres ?? [],
      actors: entry.actors ?? defaults.actors ?? [],
      rating: entry.rating ?? defaults.rating ?? 8,
      description: entry.description ?? defaults.description ?? '',
    };
    byNorm.set(norm, movie);
    added += 1;
  }

  return {
    movies: [...byNorm.values()],
    added,
    skipped,
    updated,
  };
}
