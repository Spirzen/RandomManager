/**
 * Import movies from scripts/kinopoisk-top250-raw.json into data/movies.json
 * Run: node scripts/import-top250-kinopoisk.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseKinopoiskName } from './parse-kinopoisk.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawPath = join(root, 'scripts', 'kinopoisk-top250-raw.json');
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

function genreRu(slug) {
  const map = {
    фантастика: 'фантастика',
    драма: 'драма',
    триллер: 'триллер',
    криминал: 'криминал',
    комедия: 'комедия',
    боевик: 'боевик',
    приключения: 'приключения',
    фэнтези: 'фэнтези',
    биография: 'биография',
    история: 'история',
    мелодрама: 'мелодрама',
    ужасы: 'ужасы',
    детектив: 'детектив',
    военный: 'военный',
    мультфильм: 'мультфильм',
    аниме: 'аниме',
    семейный: 'семейный',
    музыка: 'музыка',
    спорт: 'спорт',
    вестерн: 'вестерн',
  };
  return map[slug] ?? slug;
}

function parseRawItem(item) {
  if (item.title && item.year) {
    return {
      title: item.title,
      year: item.year,
      genres: (item.genres ?? []).map(genreRu),
      actors: item.actors ?? [],
      rating: item.rating ?? 8,
      description: item.description ?? '',
    };
  }
  const p = parseKinopoiskName(item.name);
  const title =
    p.title === '1+1' || p.title.startsWith('1+1')
      ? '1+1'
      : p.title.replace(/I$/, '').trim() || p.title;
  return {
    title,
    year: p.year,
    genres: p.genres.map(genreRu),
    actors: p.actors,
    rating: item.rating ?? 8,
    description: item.description ?? '',
  };
}

function nextId(existing) {
  let n = 1;
  const ids = new Set(existing.map((m) => m.id));
  while (ids.has(`m${n}`)) n += 1;
  return `m${n}`;
}

const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const existing = JSON.parse(readFileSync(moviesPath, 'utf8'));
const byNorm = new Map();
for (const m of existing) {
  byNorm.set(normalizeTitle(m.title), m);
}

let added = 0;
let skipped = 0;

for (const item of raw) {
  const parsed = parseRawItem(item);
  const norm = normalizeTitle(parsed.title);
  if (!norm) continue;
  if (byNorm.has(norm)) {
    skipped += 1;
    continue;
  }
  const movie = {
    id: nextId([...existing, ...byNorm.values()]),
    ...parsed,
    description:
      parsed.description ||
      `Фильм из списка «250 лучших» на Кинопоиске (${parsed.year}).`,
  };
  existing.push(movie);
  byNorm.set(norm, movie);
  added += 1;
}

writeFileSync(moviesPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
console.log(`Added ${added}, skipped ${skipped} (already in catalog). Total: ${existing.length}`);
