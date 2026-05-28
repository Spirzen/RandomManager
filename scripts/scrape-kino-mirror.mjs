/**
 * Scrape top-250 mirror pages into scripts/kinopoisk-top250-raw.json
 * Fallback when kinopoisk.ru blocks automated access.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'scripts', 'kinopoisk-top250-raw.json');

const MIRRORS = [
  'https://wissahickon.kino-tor.net/top250/',
  'https://wissahickon.kino-tor.net/top250/page/2/',
  'https://wissahickon.kino-tor.net/top250/page/3/',
  'https://wissahickon.kino-tor.net/top250/page/4/',
  'https://wissahickon.kino-tor.net/top250/page/5/',
];

function parseBlock(block) {
  const titleMatch = block.match(/^##\s+(.+?)\s+\((\d{4})\)/m);
  if (!titleMatch) return null;
  const title = titleMatch[1].trim();
  const year = Number(titleMatch[2]);
  const genreMatch = block.match(/Жанр:([^Р\n]+?)(?:Продолжительность|Режиссер|$)/);
  const genres = genreMatch
    ? genreMatch[1]
        .split('/')
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const actorsMatch = block.match(/В ролях:([^Р\n]+?)(?:Рейтинг|$)/);
  const actors = actorsMatch
    ? actorsMatch[1].split(',').map((a) => a.trim()).filter(Boolean)
    : [];
  const ratingMatch = block.match(/Рейтинг КП:\s*([\d.]+)/);
  const rating = ratingMatch ? Number(ratingMatch[1]) : 8;
  const descMatch = block.match(/\n\n([^#\n].{40,}?)\n\n.*?Год выпуска/s);
  const description = descMatch ? descMatch[1].replace(/\s+/g, ' ').trim().slice(0, 280) : '';
  return { title, year, genres, actors, rating, description };
}

function parseHtml(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n');
  const blocks = text.split(/\n## /).slice(1).map((b) => `## ${b}`);
  return blocks.map(parseBlock).filter(Boolean);
}

const seen = new Set();
const all = [];

for (const url of MIRRORS) {
  console.log('GET', url);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(45000),
    });
    const html = await res.text();
    const items = parseHtml(html);
    console.log(`  parsed ${items.length}`);
    for (const item of items) {
      const key = `${item.title}|${item.year}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(item);
    }
  } catch (e) {
    console.warn(`  failed: ${e.message}`);
  }
}

writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf8');
console.log(`Wrote ${all.length} unique films to ${outPath}`);
