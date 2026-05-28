/**
 * Import games from Wikipedia «List of best-selling video games» into data/games.json.
 * https://en.wikipedia.org/wiki/List_of_best-selling_video_games
 *
 * Run: node scripts/import-wikipedia-bestsellers.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGames, mergeGameEntries, saveGames } from './games-import-lib.mjs';

const WIKI_PAGE = 'List_of_best-selling_video_games';
const WIKI_API =
  'https://en.wikipedia.org/w/api.php?action=parse&page=' +
  encodeURIComponent(WIKI_PAGE) +
  '&prop=text&format=json&formatversion=2';

const UA = 'RandomManager/1.0 (https://github.com/; local catalog import)';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gamesPath = join(root, 'data', 'games.json');

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim();
}

function parseYear(cell) {
  const text = decodeHtml(cell);
  const m = text.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : 0;
}

/** Sales column is already in millions (e.g. "520", "82.9"). */
function parseSalesMillions(cell) {
  const text = decodeHtml(cell).replace(/,/g, '');
  const plain = text.match(/^([\d.]+)\s*$/);
  if (plain) {
    const n = Number.parseFloat(plain[1]);
    return Number.isNaN(n) ? null : n;
  }
  const m = text.match(/([\d.]+)\s*(million|billion)/i);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  return /billion/i.test(m[2]) ? n * 1000 : n;
}

function formatSales(sales) {
  if (sales == null) return 'один из бестселлеров по данным Wikipedia';
  if (sales >= 1000) return `~${(sales / 1000).toFixed(1)} млрд копий`;
  return `~${sales % 1 === 0 ? Math.round(sales) : sales} млн копий`;
}

function parsePlatforms(cell) {
  const text = decodeHtml(cell);
  if (!text || /^none$/i.test(text)) return ['мультиплатформа'];
  if (/multi-?platform/i.test(text)) return ['мультиплатформа'];
  const parts = text
    .split(/[,;/]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : ['мультиплатформа'];
}

function parseTitleFromCell(cellHtml) {
  const titleAttr = cellHtml.match(/<a[^>]+title="([^"]+)"[^>]*>/i);
  if (titleAttr) return decodeHtml(titleAttr[1]).replace(/_/g, ' ');
  const linkText = cellHtml.match(/<a[^>]+href="\/wiki\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i);
  if (linkText) return decodeHtml(linkText[1]);
  const italic = decodeHtml(cellHtml).replace(/^[/\s]+|[/\s]+$/g, '');
  return italic;
}

function wikiUrlFromTitle(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function parseMainTable(html) {
  const tableMatch = html.match(
    /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/i,
  );
  if (!tableMatch) throw new Error('Main wikitable not found');

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const entries = [];
  let lastRank = 0;

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1]);
    if (cells.length < 5) continue;

    let offset = 0;
    const first = decodeHtml(cells[0]);
    const rankMatch = first.match(/^(\d+)/);
    if (rankMatch) {
      lastRank = Number(rankMatch[1]);
      offset = 1;
    } else if (!/<th[^>]*scope="row"/i.test(cells[0]) && cells.length < 7) {
      continue;
    }

    const rank = lastRank || entries.length + 1;
    const titleCell = cells[offset];
    const title = parseTitleFromCell(titleCell);
    if (!title || /^title$/i.test(title)) continue;

    const sales = parseSalesMillions(cells[offset + 1]);
    const platforms = parsePlatforms(cells[offset + 3]);
    const year = parseYear(cells[offset + 4]);
    const developer = decodeHtml(cells[offset + 5]) || decodeHtml(cells[offset + 4]);

    entries.push({
      title,
      year,
      developer: developer === 'Various' ? '' : developer,
      platforms,
      genres: ['бестселлер'],
      rating: 8.5,
      wikiUrl: wikiUrlFromTitle(title),
      description: `Список самых продаваемых игр (Wikipedia, #${rank}): ${formatSales(sales)}.`,
    });
  }

  return entries;
}

async function fetchPageHtml() {
  const res = await fetch(WIKI_API, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Wikipedia API HTTP ${res.status}`);
  const json = await res.json();
  const html = json?.parse?.text;
  if (!html) throw new Error('Wikipedia API: empty parse.text');
  return html;
}

const existing = loadGames(gamesPath);
console.log('Fetching Wikipedia best-sellers list…');
const html = await fetchPageHtml();
const parsed = parseMainTable(html);
console.log(`Parsed ${parsed.length} games from main table`);

const { games, added, skipped, updated } = mergeGameEntries(
  existing,
  parsed,
  {
    year: 0,
    genres: ['бестселлер'],
    developer: '',
    rating: 8.5,
    description: 'В списке самых продаваемых игр Wikipedia.',
  },
);

for (const src of parsed) {
  const norm = src.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .trim();
  const game = games.find(
    (g) =>
      g.title === src.title ||
      g.title.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim() === norm,
  );
  if (!game) continue;
  if (src.wikiUrl) game.wikiUrl = src.wikiUrl;
  if (src.description?.includes('млн') || src.description?.includes('млрд')) {
    game.description = src.description;
  }
  if (src.year && !game.year) game.year = src.year;
  if (/multi-?platform/i.test(game.developer ?? '')) {
    game.developer = src.developer || '';
  } else if (
    src.developer &&
    (!game.developer || /various|^none$/i.test(game.developer))
  ) {
    game.developer = src.developer;
  }
  if (
    src.platforms?.length &&
    (!game.platforms?.length ||
      game.platforms.join() === 'PC,консоль' ||
      /multi-?platform/i.test(game.platforms[0] ?? ''))
  ) {
    game.platforms = src.platforms;
  }
  if (!game.genres?.includes('бестселлер')) {
    game.genres = [...(game.genres ?? []), 'бестселлер'];
  }
}

const saved = saveGames(gamesPath, games);
console.log(
  `Done. was: ${existing.length}, now: ${saved.length}, added: ${added}, duplicates: ${skipped}, updated: ${updated}`,
);
