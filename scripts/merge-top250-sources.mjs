import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'scripts', 'kinopoisk-top250-raw.json');

function load(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return [];
  }
}

const sources = [
  join(root, 'scripts', 'kinopoisk-top250-p1.json'),
  join(root, 'scripts', 'kinopoisk-top250-p2.json'),
  join(root, 'scripts', 'kinopoisk-top250-p3.json'),
  join(root, 'scripts', 'kinopoisk-top250-p4.json'),
  join(root, 'scripts', 'kinopoisk-top250-p5.json'),
  join(root, 'scripts', 'kinopoisk-top250-mirror.json'),
];

const seen = new Set();
const all = [];

for (const path of sources) {
  const items = load(path);
  for (const item of items) {
    const key = item.href ?? `${item.title ?? ''}|${item.year ?? ''}|${item.name ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(item);
  }
}

writeFileSync(out, JSON.stringify(all, null, 2), 'utf8');
console.log(`Merged ${all.length} unique entries -> ${out}`);
