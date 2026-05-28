import { readFileSync, writeFileSync } from 'node:fs';

export function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[™®©]/g, '')
    .replace(/\s*\(\d{4}\s+video game\)\s*$/i, '')
    .replace(/\s*\(video game\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9а-яё\s]/gi, '')
    .trim();
}

const EDITION_WORDS =
  /\b(enhanced|remastered|remaster|definitive|legacy|goty|deluxe|ultimate|complete edition|directors cut|redux|hd edition|anniversary edition|game of the year)\b/gi;

/** Ключ для сопоставления изданий одной игры. */
export function catalogMatchKey(title) {
  return normalizeTitle(title).replace(EDITION_WORDS, '').replace(/\s+/g, ' ').trim();
}

export function platformsFromUrl(href) {
  if (!href) return ['PC', 'консоль'];
  if (/nintendo\.com/i.test(href)) return ['Switch'];
  if (/steampowered\.com/i.test(href)) return ['PC'];
  return ['PC', 'консоль'];
}

export function steamStoreUrl(appid) {
  return `https://store.steampowered.com/app/${appid}/`;
}

export function nextGameId(existing) {
  let n = 1;
  const ids = new Set(existing.map((g) => g.id));
  while (ids.has(`g${n}`)) n += 1;
  return `g${n}`;
}

export function loadGames(gamesPath) {
  return JSON.parse(readFileSync(gamesPath, 'utf8'));
}

export function saveGames(gamesPath, games) {
  const sorted = [...games].sort((a, b) =>
    a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }),
  );
  writeFileSync(gamesPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  return sorted;
}

/**
 * @param {Array<{ title: string, storeUrl?: string | null, wikiUrl?: string, description?: string, genres?: string[], year?: number, developer?: string, rating?: number }>} entries
 */
export function steamAppIdFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(/\/app\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function mergeGameEntries(existing, entries, defaults) {
  const byNorm = new Map();
  const byMatchKey = new Map();
  const byAppId = new Map();
  for (const game of existing) {
    byNorm.set(normalizeTitle(game.title), game);
    const mk = catalogMatchKey(game.title);
    if (mk) byMatchKey.set(mk, game);
    const appid = steamAppIdFromUrl(game.storeUrl);
    if (appid) byAppId.set(appid, game);
  }

  let added = 0;
  let skipped = 0;
  let updated = 0;

  for (const entry of entries) {
    const title = entry.title?.trim();
    if (!title) continue;
    const norm = normalizeTitle(title);
    if (!norm) continue;

    const storeUrl = entry.storeUrl ?? null;
    const appid = steamAppIdFromUrl(storeUrl);
    const matchKey = catalogMatchKey(title);
    const prevByApp = appid ? byAppId.get(appid) : null;
    const prevByKey = matchKey ? byMatchKey.get(matchKey) : null;
    const prev = prevByApp ?? prevByKey ?? byNorm.get(norm);

    if (prev) {
      skipped += 1;
      if (storeUrl && !prev.storeUrl) {
        prev.storeUrl = storeUrl;
        updated += 1;
      }
      if (entry.wikiUrl && !prev.wikiUrl) {
        prev.wikiUrl = entry.wikiUrl;
        updated += 1;
      }
      if (
        prev.title !== title &&
        !/ошибка|steam store|steam app \d+/i.test(prev.title) &&
        title.length > 2
      ) {
        byNorm.delete(normalizeTitle(prev.title));
        prev.title = title;
        byNorm.set(norm, prev);
        updated += 1;
      }
      continue;
    }

    const id = nextGameId([...byNorm.values()]);
    const game = {
      id,
      title,
      year: entry.year ?? defaults.year ?? 0,
      genres: entry.genres ?? defaults.genres ?? [],
      developer: entry.developer ?? defaults.developer ?? '',
      platforms: platformsFromUrl(storeUrl),
      rating: entry.rating ?? defaults.rating ?? 8,
      description: entry.description ?? defaults.description ?? '',
    };
    if (storeUrl) game.storeUrl = storeUrl;
    if (entry.wikiUrl) game.wikiUrl = entry.wikiUrl;
    byNorm.set(norm, game);
    if (matchKey) byMatchKey.set(matchKey, game);
    if (appid) byAppId.set(appid, game);
    added += 1;
  }

  return {
    games: [...byNorm.values()],
    added,
    skipped,
    updated,
  };
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const PLAYABLE_TYPES = new Set(['game', 'demo', 'beta']);

export async function fetchSteamAppDetails(appid, lang = 'russian') {
  for (const locale of [lang, 'english']) {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=${locale}&cc=ru`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) continue;
    const json = await res.json();
    const row = json[String(appid)];
    if (row?.success && row.data) return row.data;
  }
  return null;
}

function cleanStorePageTitle(raw) {
  if (!raw) return null;
  const t = raw
    .replace(/\s+в Steam.*$/i, '')
    .replace(/\s+on Steam.*$/i, '')
    .trim();
  if (/ошибка|error|not found|404/i.test(t)) return null;
  return t || null;
}

/** Fallback when appdetails is blocked or type is not «game». */
export async function fetchSteamStoreTitle(appid, lang = 'russian') {
  for (const locale of [lang, 'english']) {
    const res = await fetch(`https://store.steampowered.com/app/${appid}/?l=${locale}`, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) continue;
    const html = await res.text();
    const og = html.match(/property="og:title"\s+content="([^"]+)"/i);
    const fromOg = cleanStorePageTitle(og?.[1]);
    if (fromOg) return fromOg;
    const title = html.match(/<title>([^<]+)<\/title>/i);
    const fromTitle = cleanStorePageTitle(title?.[1]);
    if (fromTitle) return fromTitle;
  }
  return null;
}

export function isPlayableSteamType(type) {
  return PLAYABLE_TYPES.has(type);
}

export function entryFromSteamDetails(data, appid) {
  const release = data.release_date?.date;
  let year = 0;
  if (release) {
    const y = Number.parseInt(release.slice(-4), 10);
    if (y >= 1970 && y <= 2100) year = y;
  }
  const genres = (data.genres ?? []).map((g) => g.description).filter(Boolean);
  const developer = (data.developers ?? [])[0] ?? '';
  const short = (data.short_description ?? '').replace(/\s+/g, ' ').trim();
  const description = short
    ? `Топ Steam по онлайну. ${short.slice(0, 220)}${short.length > 220 ? '…' : ''}`
    : 'В чарте Steam «Сейчас играют» — один из самых популярных тайтлов по числу игроков.';

  return {
    title: data.name,
    storeUrl: steamStoreUrl(appid),
    year,
    genres,
    developer,
    rating: 8,
    description,
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
