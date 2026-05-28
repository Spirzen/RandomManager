/**
 * Fetch Kinopoisk top-250 list pages (1–5) and write scripts/kinopoisk-top250-raw.json
 * Run: node scripts/fetch-top250.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'scripts', 'kinopoisk-top250-raw.json');

const PAGES = [1, 2, 3, 4, 5];

function parseItems(html) {
  const items = [];
  const re =
    /href="https:\/\/www\.kinopoisk\.ru\/film\/(\d+)\/"[^>]*aria-label="([^"]*В ролях:[^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    items.push({ filmId: m[1], name: m[2].replace(/&quot;/g, '"') });
  }
  if (items.length) return items;
  const re2 = /aria-label="([^"]*В ролях:[^"]*)"[^>]*href="https:\/\/www\.kinopoisk\.ru\/film\/(\d+)\/"/g;
  while ((m = re2.exec(html)) !== null) {
    items.push({ filmId: m[2], name: m[1] });
  }
  return items;
}

async function fetchPage(page) {
  const url =
    page === 1
      ? 'https://www.kinopoisk.ru/lists/movies/top250/'
      : `https://www.kinopoisk.ru/lists/movies/top250/?page=${page}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    },
  });
  const html = await res.text();
  if (html.includes('showcaptcha') || html.includes('Вы не робот')) {
    throw new Error(`Captcha on page ${page}`);
  }
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]);
      const str = JSON.stringify(data);
      const names = [...str.matchAll(/"nameRu":"([^"]+)"/g)].map((x) => x[1]);
      const years = [...str.matchAll(/"productionYear":(\d{4})/g)].map((x) => Number(x[1]));
      const genres = [...str.matchAll(/"name":"([^"]+)","slug":"[^"]+"/g)].map((x) => x[1]);
      if (names.length >= 40) {
        return names.slice(0, 50).map((name, i) => ({
          name: `${name}, ${years[i] ?? ''}`,
          filmId: String(i),
        }));
      }
    } catch {
      /* fall through */
    }
  }
  return parseItems(html);
}

const all = [];
for (const page of PAGES) {
  console.log(`Fetching page ${page}...`);
  const items = await fetchPage(page);
  console.log(`  ${items.length} films`);
  all.push(...items.map((item) => ({ ...item, page })));
  await new Promise((r) => setTimeout(r, 1500));
}

writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf8');
console.log(`Wrote ${all.length} items to ${outPath}`);
