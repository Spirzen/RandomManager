/**
 * Remove duplicate movies (by normalized title) and broken Wikipedia stubs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moviesPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'movies.json');

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9а-я\s]/gi, '')
    .trim();
}

function score(m) {
  let s = 0;
  if (m.actors?.length) s += m.actors.length * 2;
  if (m.description && !m.description.includes('IMDb Top 250')) s += 5;
  if (!/отсутствует/i.test(m.title)) s += 10;
  if (m.genres?.length > 1) s += 1;
  return s;
}

const movies = JSON.parse(readFileSync(moviesPath, 'utf8'));
const before = movies.length;

const filtered = movies.filter((m) => !/отсутствует/i.test(m.title));

const byNorm = new Map();
for (const m of filtered) {
  const norm = normalizeTitle(m.title);
  if (!norm) continue;
  const prev = byNorm.get(norm);
  if (!prev || score(m) > score(prev)) {
    byNorm.set(norm, m);
  }
}

const deduped = [...byNorm.values()];
writeFileSync(moviesPath, `${JSON.stringify(deduped, null, 2)}\n`, 'utf8');
console.log(`Removed ${before - deduped.length} duplicates/stubs. ${before} → ${deduped.length}`);
