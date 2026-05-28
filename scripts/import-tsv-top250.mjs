/**
 * Parse kinopoisk-top250-p2-5.tsv and merge into data/movies.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsvPath = join(root, 'scripts', 'kinopoisk-top250-p2-5.tsv');
const moviesPath = join(root, 'data', 'movies.json');

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9а-я\s]/gi, '')
    .trim();
}

function parseTsv(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, year, genre, actors, rating, description] = line.split('\t');
      return {
        title: title.trim(),
        year: Number(year),
        genres: [genre.trim().toLowerCase()],
        actors: actors.split(',').map((a) => a.trim()).filter(Boolean),
        rating: Number(rating),
        description: description?.trim() ?? '',
      };
    });
}

function nextId(existing) {
  let n = 1;
  const ids = new Set(existing.map((m) => m.id));
  while (ids.has(`m${n}`)) n += 1;
  return `m${n}`;
}

const items = parseTsv(readFileSync(tsvPath, 'utf8'));
const existing = JSON.parse(readFileSync(moviesPath, 'utf8'));

const titleFixes = {
  '1+1intouchables': '1+1',
  'я ругаюсьi': 'Я ругаюсь',
};
for (const m of existing) {
  const norm = normalizeTitle(m.title);
  if (titleFixes[norm]) m.title = titleFixes[norm];
}

const byNorm = new Map();
for (const m of existing) {
  byNorm.set(normalizeTitle(m.title), m);
}

let added = 0;
let skipped = 0;

for (const item of items) {
  const norm = normalizeTitle(item.title);
  if (!norm) continue;
  if (byNorm.has(norm)) {
    skipped += 1;
    continue;
  }
  const movie = {
    id: nextId([...existing, ...byNorm.values()]),
    ...item,
    description:
      item.description ||
      `Фильм из списка «250 лучших» на Кинопоиске (${item.year}).`,
  };
  existing.push(movie);
  byNorm.set(norm, movie);
  added += 1;
}

writeFileSync(moviesPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
console.log(`TSV: added ${added}, skipped ${skipped}. Total: ${existing.length}`);
