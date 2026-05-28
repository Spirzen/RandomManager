/**
 * Fix titles/actors for movies imported from Wikipedia IMDb Top 250.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moviesPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'movies.json');
const movies = JSON.parse(readFileSync(moviesPath, 'utf8'));

let fixed = 0;
for (const m of movies) {
  if (!m.description?.includes('IMDb Top 250')) continue;
  const oldTitle = m.title;
  m.title = m.title
    .replace(/\s*\((фильм|мультфильм)[^)]*\)\s*$/i, '')
    .replace(/\s*\(фильм,\s*\d{4}\)\s*$/i, '')
    .replace(/\s*\(\d{4}\)\s*$/g, '')
    .trim();
  if (m.title !== oldTitle) fixed += 1;

  const director = m.actors?.length === 1 && !m.description.includes('Режиссёр:');
  if (director && m.actors[0]) {
    m.description = m.description.replace(
      /\.\s*$/,
      `. Режиссёр: ${m.actors[0]}.`,
    );
    m.actors = [];
    fixed += 1;
  }
}

writeFileSync(moviesPath, `${JSON.stringify(movies, null, 2)}\n`, 'utf8');
console.log(`Fixed ${fixed} field(s) on Wikipedia IMDb entries.`);
