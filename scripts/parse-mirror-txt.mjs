/**
 * Parse saved mirror page text (WebFetch output) into movie objects.
 * Usage: node scripts/parse-mirror-txt.mjs path/to/file.txt
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/parse-mirror-txt.mjs <file.txt> [...]');
  process.exit(1);
}

function parseKinofunBlock(block) {
  const titleMatch = block.match(/^##\s+(.+?)\s+\((\d{4})\)/m);
  if (!titleMatch) return null;
  const title = titleMatch[1].trim();
  const year = Number(titleMatch[2]);
  const genreMatch = block.match(/Жанр:\s*([^\n]+)/);
  const genres = genreMatch
    ? genreMatch[1]
        .split(/[,/]/)
        .map((g) => g.trim().toLowerCase())
        .filter((g) => g && !g.includes('топ'))
    : [];
  const actorsMatch = block.match(/Актёры:([^\n]+)/);
  const actors = actorsMatch
    ? actorsMatch[1].split(',').map((a) => a.trim()).filter(Boolean)
    : [];
  const ratingMatch = block.match(/\n([\d.]+)\s*\(\d+[\s\d]*голос/);
  const rating = ratingMatch ? Number(ratingMatch[1]) : 8;
  const descLines = block.split('\n').map((l) => l.trim());
  const descLine = descLines.find(
    (l) =>
      l.length > 50 &&
      !l.startsWith('Режиссер') &&
      !l.startsWith('Актёры') &&
      !l.startsWith('Жанр') &&
      !l.startsWith('в закладки') &&
      !/^\d/.test(l) &&
      !l.startsWith('-'),
  );
  return {
    title,
    year,
    genres,
    actors,
    rating,
    description: descLine ? descLine.slice(0, 280) : '',
  };
}

function parseFile(text) {
  const blocks = text.split(/\n## /).slice(1).map((b) => `## ${b}`);
  const items = [];
  for (const block of blocks) {
    const kinofun = parseKinofunBlock(block);
    if (kinofun) {
      items.push(kinofun);
      continue;
    }
    const titleMatch = block.match(/^##\s+(.+?)\s+\((\d{4})\)/m);
    if (!titleMatch) continue;
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
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const descLine = lines.find(
      (l) =>
        l.length > 60 &&
        !l.startsWith('Год') &&
        !l.startsWith('Режиссер') &&
        !l.startsWith('-') &&
        !/^\d{1,2}-\d{2}-\d{4}/.test(l),
    );
    const description = descLine ? descLine.slice(0, 280) : '';
    items.push({ title, year, genres, actors, rating, description });
  }
  return items;
}

const seen = new Set();
const all = [];
for (const file of files) {
  const items = parseFile(readFileSync(file, 'utf8'));
  console.log(`${file}: ${items.length}`);
  for (const item of items) {
    const key = `${item.title}|${item.year}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(item);
  }
}

const out = join(root, 'scripts', 'kinopoisk-top250-mirror.json');
writeFileSync(out, JSON.stringify(all, null, 2), 'utf8');
console.log(`Wrote ${all.length} to ${out}`);
