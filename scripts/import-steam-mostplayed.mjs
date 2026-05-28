/**
 * Import top games from Steam Charts «Сейчас играют» into data/games.json.
 * API: ISteamChartsService/GetMostPlayedGames + store appdetails per app.
 *
 * Run: node scripts/import-steam-mostplayed.mjs
 *      node scripts/import-steam-mostplayed.mjs --limit=20
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  entryFromSteamDetails,
  fetchSteamAppDetails,
  fetchSteamStoreTitle,
  isPlayableSteamType,
  loadGames,
  mergeGameEntries,
  saveGames,
  sleep,
  steamStoreUrl,
} from './games-import-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gamesPath = join(root, 'data', 'games.json');

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : 100;
const delayMs = 350;

async function fetchMostPlayedRanks() {
  const res = await fetch(
    'https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/?format=json',
  );
  if (!res.ok) throw new Error(`Charts API HTTP ${res.status}`);
  const json = await res.json();
  const ranks = json?.response?.ranks;
  if (!Array.isArray(ranks) || !ranks.length) {
    throw new Error('Charts API: empty ranks');
  }
  return ranks.slice(0, limit);
}

const existing = loadGames(gamesPath);
const ranks = await fetchMostPlayedRanks();
console.log(`Steam Charts: fetching details for ${ranks.length} apps…`);

const entries = [];
let failed = 0;

for (let i = 0; i < ranks.length; i += 1) {
  const { appid, rank } = ranks[i];
  process.stdout.write(`  [${i + 1}/${ranks.length}] #${rank} app ${appid}… `);
  const data = await fetchSteamAppDetails(appid);
  if (data && isPlayableSteamType(data.type)) {
    entries.push(entryFromSteamDetails(data, appid));
    console.log(data.name);
  } else if (data?.type === 'advertising' || data?.type === 'music' || data?.type === 'video') {
    console.log(`skip (${data.type})`);
    failed += 1;
  } else {
    const title = (await fetchSteamStoreTitle(appid)) ?? `Steam app ${appid}`;
    entries.push({
      title,
      storeUrl: steamStoreUrl(appid),
      description:
        'В чарте Steam «Сейчас играют» (данные магазина получены без полного API).',
    });
    console.log(`${title} (fallback)`);
    failed += 1;
  }
  if (i < ranks.length - 1) await sleep(delayMs);
}

const { games, added, skipped, updated } = mergeGameEntries(existing, entries, {
  year: 0,
  genres: [],
  developer: '',
  rating: 8,
  description: 'В чарте Steam «Сейчас играют».',
});

const saved = saveGames(gamesPath, games);
console.log(
  `\nDone. Parsed: ${entries.length}, failed: ${failed}, was: ${existing.length}, now: ${saved.length}, added: ${added}, duplicates: ${skipped}, storeUrl patched: ${updated}`,
);
