/**
 * Import games from it-knowledge-base docs/tools/games/4.mdx into data/games.json.
 * Preserves existing entries (matched by normalized title); adds new ones with defaults.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGames, mergeGameEntries, saveGames } from './games-import-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdxPath =
  process.argv[2] ??
  'F:\\ITUniverse\\it-knowledge-base\\docs\\tools\\games\\4.mdx';
const gamesPath = join(root, 'data', 'games.json');

function parseCatalogLines(mdx) {
  const start = mdx.indexOf('## Полный каталог');
  if (start < 0) throw new Error('Section "## Полный каталог" not found');
  const section = mdx.slice(start);
  const end = section.search(/\n---\n/);
  const block = end > 0 ? section.slice(0, end) : section;
  const entries = [];
  const linkRe = /^- \[(.+?)\]\((https?:\/\/[^)]+)\)\s*$/;
  const plainRe = /^- ([^\[\n][^\n]*)\s*$/;

  for (const line of block.split('\n')) {
    const link = line.match(linkRe);
    if (link) {
      entries.push({ title: link[1].trim(), storeUrl: link[2].trim() });
      continue;
    }
    const plain = line.match(plainRe);
    if (plain) {
      entries.push({ title: plain[1].trim(), storeUrl: null });
    }
  }
  return entries;
}

const mdx = readFileSync(mdxPath, 'utf8');
const parsed = parseCatalogLines(mdx);
const existing = loadGames(gamesPath);

const { games, added, skipped } = mergeGameEntries(
  existing,
  parsed.map(({ title, storeUrl }) => ({
    title,
    storeUrl,
    description: storeUrl
      ? 'Из подборки IT Universe — ссылка на магазин в каталоге знаний.'
      : 'Из подборки IT Universe — консольный или иной релиз без Steam-страницы.',
  })),
  { year: 0, genres: [], developer: '', rating: 8 },
);

const saved = saveGames(gamesPath, games);
console.log(
  `Parsed: ${parsed.length}, was: ${existing.length}, now: ${saved.length}, added: ${added}, kept duplicates: ${skipped}`,
);
