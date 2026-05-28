/**
 * Remove / merge known duplicate games in data/games.json.
 * Run: node scripts/dedupe-games.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGames, normalizeTitle, saveGames, steamAppIdFromUrl } from './games-import-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gamesPath = join(root, 'data', 'games.json');

/** @type {Array<{ keep: string, remove: string, reason: string }>} */
const MANUAL_MERGES = [
  { keep: 'g105', remove: 'g454', reason: 'Conan Exiles / Enhanced — один appid Steam' },
  { keep: 'g447', remove: 'g503', reason: 'Phasmophobia — Wikipedia + Steam' },
  { keep: 'g366', remove: 'g498', reason: 'The Last of Us — Wikipedia + Steam' },
  { keep: 'g246', remove: 'g500', reason: 'Spider-Man 2018 (wiki) = Remastered на PC' },
];

function uniq(arr) {
  return [...new Set(arr)];
}

function mergeInto(keep, remove) {
  if (remove.wikiUrl && !keep.wikiUrl) keep.wikiUrl = remove.wikiUrl;
  if (remove.storeUrl && !keep.storeUrl) keep.storeUrl = remove.storeUrl;
  if (remove.year && !keep.year) keep.year = remove.year;
  if (remove.developer && (!keep.developer || /multi-?platform/i.test(keep.developer))) {
    keep.developer = remove.developer;
  }
  if (remove.platforms?.length && (!keep.platforms?.length || keep.platforms.join() === 'PC')) {
    keep.platforms = remove.platforms;
  }
  keep.genres = uniq([...(keep.genres ?? []), ...(remove.genres ?? [])]);
  if (
    remove.description?.includes('млн') ||
    remove.description?.includes('млрд')
  ) {
    if (!keep.description?.includes('млн') && !keep.description?.includes('млрд')) {
      keep.description = remove.description;
    }
  }
  if (remove.rating > keep.rating) keep.rating = remove.rating;
}

function findWikiStorePairs(games) {
  const pairs = [];
  for (const g of games) {
    const m = g.title.match(/^(.+?)\s*\((\d{4}\s+)?video game\)$/i);
    if (!m) continue;
    const base = normalizeTitle(m[1]);
    const store = games.find(
      (o) =>
        o.id !== g.id &&
        !/\(video game\)/i.test(o.title) &&
        normalizeTitle(o.title) === base,
    );
    if (store) {
      pairs.push({
        keep: store.id,
        remove: g.id,
        reason: `Wikipedia «${g.title}» ↔ «${store.title}»`,
      });
    }
  }
  return pairs;
}

const games = loadGames(gamesPath);
const byId = new Map(games.map((g) => [g.id, g]));

// Same Steam appid → keep record with more fields
const byApp = new Map();
for (const g of games) {
  const appid = steamAppIdFromUrl(g.storeUrl);
  if (!appid) continue;
  if (!byApp.has(appid)) byApp.set(appid, []);
  byApp.get(appid).push(g);
}

const appMerges = [];
for (const [appid, arr] of byApp) {
  if (arr.length < 2) continue;
  arr.sort((a, b) => score(b) - score(a));
  appMerges.push({
    keep: arr[0].id,
    remove: arr[1].id,
    reason: `Один Steam appid ${appid}`,
  });
}

function score(g) {
  let s = 0;
  if (g.storeUrl) s += 2;
  if (g.wikiUrl) s += 1;
  if (g.developer) s += 1;
  if (g.year) s += 1;
  if (g.genres?.length) s += g.genres.length;
  if (g.description?.length > 60) s += 1;
  return s;
}

const manualRemove = new Set(MANUAL_MERGES.map((m) => m.remove));
const manualKeep = new Set(MANUAL_MERGES.map((m) => m.keep));

const allMerges = [...MANUAL_MERGES];
for (const m of appMerges) {
  if (manualRemove.has(m.keep) || manualKeep.has(m.remove)) continue;
  if (allMerges.some((x) => x.remove === m.remove || x.keep === m.keep)) continue;
  allMerges.push(m);
}
// Wikipedia «(video game)» — только явные пары без спорных (Overwatch 2016 ≠ OW2 на Steam)
for (const m of findWikiStorePairs(games)) {
  if (m.remove === 'g484') continue;
  if (!allMerges.some((x) => x.remove === m.remove)) allMerges.push(m);
}

const removeIds = new Set();
const log = [];

for (const { keep: keepId, remove: removeId, reason } of allMerges) {
  if (removeIds.has(removeId)) continue;
  const keep = byId.get(keepId);
  const remove = byId.get(removeId);
  if (!keep || !remove) continue;
  mergeInto(keep, remove);
  removeIds.add(removeId);
  log.push({ keep: keepId, remove: removeId, reason, title: remove.title });
}

const cleaned = games.filter((g) => !removeIds.has(g.id));
const saved = saveGames(gamesPath, cleaned);

console.log(`Removed ${removeIds.size} duplicates. ${games.length} → ${saved.length}\n`);
for (const row of log) {
  console.log(`− ${row.remove} «${row.title}» → ${row.keep} (${row.reason})`);
}
