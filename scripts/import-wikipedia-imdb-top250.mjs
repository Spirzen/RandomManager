/**
 * Import movies from Russian Wikipedia «250 лучших фильмов по версии IMDb»
 * https://ru.wikipedia.org/wiki/250_лучших_фильмов_по_версии_IMDb
 *
 * Run: node scripts/import-wikipedia-imdb-top250.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIKI_PAGE = '250_лучших_фильмов_по_версии_IMDb';
const WIKI_API =
  'https://ru.wikipedia.org/w/api.php?action=parse&page=' +
  encodeURIComponent(WIKI_PAGE) +
  '&prop=text&format=json&formatversion=2';

const UA = 'RandomManager/1.0 (local catalog import)';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const moviesPath = join(root, 'data', 'movies.json');

const GENRE_MAP = {
  'эпический фильм': 'драма',
  'гангстерский фильм': 'криминал',
  'фильм-трагедия': 'драма',
  детектив: 'детектив',
  драма: 'драма',
  триллер: 'триллер',
  'психологический триллер': 'триллер',
  'мистический триллер': 'триллер',
  'юридический триллер': 'триллер',
  'политический триллер': 'триллер',
  'эротический триллер': 'триллер',
  'технотриллер': 'триллер',
  боевик: 'боевик',
  'эпический боевик': 'боевик',
  'автомобильный боевик': 'боевик',
  кинокомедия: 'комедия',
  'чёрная комедия': 'комедия',
  'романтическая комедия': 'комедия',
  'приятельская комедия': 'комедия',
  'остросюжетная комедия': 'комедия',
  'причудливая комедия': 'комедия',
  'комедия о празднике': 'комедия',
  'эксцентрическая комедия': 'комедия',
  'кинокомедия-стоунер': 'комедия',
  'подростковая комедия': 'комедия',
  фарс: 'комедия',
  буффонада: 'комедия',
  приключение: 'приключения',
  'приключенческая киноэпопея': 'приключения',
  'фильм о городском приключении': 'приключения',
  'подростковый приключенческий фильм': 'приключения',
  'фильм о дорожном приключении': 'приключения',
  'фильм о морском приключении': 'приключения',
  'фильм о приключениях в джунглях': 'приключения',
  'фильм о приключениях в пустыне': 'приключения',
  'горное приключение': 'приключения',
  'фильм о путешествиях': 'приключения',
  'историческая драма': 'драма',
  'психологическая драма': 'драма',
  'юридическая драма': 'драма',
  'политическая драма': 'драма',
  'полицейская драма': 'драма',
  'тюремная драма': 'драма',
  'романтическая драма': 'драма',
  'финансовая драма': 'драма',
  'медицинская драма': 'драма',
  'подростковая драма': 'драма',
  'драма на рабочем месте': 'драма',
  'костюмированная драма': 'драма',
  'военный фильм': 'военный',
  'киноэпопея о войне': 'военный',
  'фэнтезийный фильм': 'фэнтези',
  'фэнтезийная киноэпопея': 'фэнтези',
  'тёмное фэнтези': 'фэнтези',
  'подростковый фильм-фэнтези': 'фэнтези',
  '«меч и колдовство»': 'фэнтези',
  'фильм-сказка': 'фэнтези',
  'научная фантастика': 'фантастика',
  'фантастический фильм о космосе': 'фантастика',
  'научно-фантастическая киноэпопея': 'фантастика',
  'фильм о путешествиях во времени': 'фантастика',
  'фильм об искусственном интеллекте': 'фантастика',
  'фильм о вторжении пришельцев': 'фантастика',
  киберпанк: 'фантастика',
  стимпанк: 'фантастика',
  антиутопия: 'фантастика',
  байопик: 'биография',
  докудрама: 'драма',
  мультфильм: 'мультфильм',
  'компьютерная анимация': 'мультфильм',
  'рисованная анимация': 'мультфильм',
  'взрослая анимация': 'мультфильм',
  'покадровая анимация': 'мультфильм',
  'мультфильм о празднике': 'мультфильм',
  аниме: 'аниме',
  сёнэн: 'аниме',
  сёдзё: 'аниме',
  'семейный фильм': 'семейный',
  'семейный фильм о празднике': 'семейный',
  'романтический фильм': 'мелодрама',
  'оптимистичный романтический фильм': 'мелодрама',
  'подростковый романтический фильм': 'мелодрама',
  'романтический фильм о празднике': 'мелодрама',
  'романтическая киноэпопея': 'мелодрама',
  'чёрная мелодрама': 'мелодрама',
  'исторический фильм': 'история',
  'историческая киноэпопея': 'история',
  вестерн: 'вестерн',
  'вестерн-киноэпопея': 'вестерн',
  'спагетти-вестерн': 'вестерн',
  'современный вестерн': 'вестерн',
  хоррор: 'ужасы',
  'психологический хоррор': 'ужасы',
  'боди-хоррор': 'ужасы',
  'фильм ужасов о сверхъестественном': 'ужасы',
  слэшер: 'ужасы',
  'фильм о монстрах': 'ужасы',
  'фильм о динозаврах': 'ужасы',
  'фильм о кайдзю': 'ужасы',
  'супергеройский фильм': 'фантастика',
  'фильм о боевых искусствах': 'боевик',
  'фильм о самураях': 'боевик',
  'ган-фу': 'боевик',
  'фильм о спорте': 'спорт',
  'фильм про бокс': 'спорт',
  'фильм о мотоспорте': 'спорт',
  'фильм-ограбление': 'криминал',
  'фильм о наркопреступлении': 'криминал',
  'тру-крайм': 'криминал',
  'полицейский процедурал': 'криминал',
  'крутой детектив': 'детектив',
  'фильм о частном детективе': 'детектив',
  'фильм о серийном убийце': 'триллер',
  'фильм-тайна': 'детектив',
  'фильм про расследование': 'детектив',
  'фильм про поиск': 'приключения',
  'фильм про взросление': 'драма',
  'фильм про шоу-бизнес': 'драма',
  'фильм о воине-одиночке': 'боевик',
  'фильм-выживание': 'приключения',
  'фильм о теории заговора': 'триллер',
  'шпионский фильм': 'боевик',
  'капер-фильм': 'боевик',
  'фильм плаща и шпаги': 'приключения',
  'пеплум': 'история',
  мюзикл: 'мюзикл',
  'классический мюзикл': 'мюзикл',
  'мюзикл с хитами': 'мюзикл',
  'музыкальный фильм': 'мюзикл',
  нуар: 'нуар',
  'сатирический фильм': 'комедия',
  'кинопародия': 'комедия',
  'скетч-комедия': 'комедия',
  'эротический фильм': 'драма',
};

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

function cleanTitle(title) {
  return title
    .replace(/\s*\((фильм|мультфильм)[^)]*\)\s*$/i, '')
    .replace(/\s*\(\d{4}\)\s*$/g, '')
    .replace(/\s*\(фильм,\s*\d{4}\)\s*$/i, '')
    .trim();
}

function parseTitleFromCell(cellHtml) {
  const titleAttr = cellHtml.match(/<a[^>]+title="([^"]+)"/i);
  if (titleAttr) {
    return cleanTitle(decodeHtml(titleAttr[1]));
  }
  const linkText = cellHtml.match(/<a[^>]+>([\s\S]*?)<\/a>/i);
  if (linkText) return decodeHtml(linkText[1]);
  return decodeHtml(cellHtml);
}

function mapGenres(raw) {
  const parts = raw
    .split(',')
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
  const mapped = [];
  for (const p of parts) {
    const g = GENRE_MAP[p] ?? (p.length < 24 ? p : null);
    if (g && !mapped.includes(g)) mapped.push(g);
    if (mapped.length >= 3) break;
  }
  return mapped.length ? mapped : ['драма'];
}

function imdbRatingFromRank(rank) {
  const r = 9.2 - (rank - 1) * 0.006;
  return Math.round(Math.max(7.2, Math.min(9.3, r)) * 10) / 10;
}

function parseMainTable(html) {
  const start = html.indexOf('<th>Место</th>');
  if (start < 0) throw new Error('Main table header «Место» not found');
  const end = html.indexOf('</table>', start);
  const table = html.slice(start, end);
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const entries = [];

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
      (c) => c[1],
    );
    if (cells.length < 6) continue;

    const rank = Number(decodeHtml(cells[0]));
    if (!rank || rank > 250) continue;

    const title = parseTitleFromCell(cells[1]);
    if (!title || /^название/i.test(title)) continue;

    const yearMatch = decodeHtml(cells[2]).match(/\b(18|19|20)\d{2}\b/);
    const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();

    const directors = decodeHtml(cells[4])
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const genres = mapGenres(decodeHtml(cells[5]));
    const rating = imdbRatingFromRank(rank);
    const directorNote =
      directors.length > 0 ? ` Режиссёр: ${directors.join(', ')}.` : '';

    entries.push({
      rank,
      title,
      year,
      genres,
      actors: [],
      rating,
      description: `Фильм #${rank} в списке IMDb Top 250 (Wikipedia).${directorNote}`,
    });
  }

  return entries;
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9а-я\s]/gi, '')
    .trim();
}

function nextId(existing) {
  let n = 1;
  const ids = new Set(existing.map((m) => m.id));
  while (ids.has(`m${n}`)) n += 1;
  return `m${n}`;
}

async function fetchPageHtml() {
  const res = await fetch(WIKI_API, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Wikipedia API HTTP ${res.status}`);
  const json = await res.json();
  const html = json?.parse?.text;
  if (!html) throw new Error('Wikipedia API: empty parse.text');
  return html;
}

console.log('Fetching Wikipedia IMDb Top 250…');
const html = await fetchPageHtml();
const parsed = parseMainTable(html);
console.log(`Parsed ${parsed.length} films from Wikipedia`);

const existing = JSON.parse(readFileSync(moviesPath, 'utf8'));
const byNorm = new Map();
for (const m of existing) {
  byNorm.set(normalizeTitle(m.title), m);
}

let added = 0;
let skipped = 0;

for (const item of parsed) {
  const norm = normalizeTitle(item.title);
  if (!norm) continue;
  if (byNorm.has(norm)) {
    skipped += 1;
    continue;
  }
  const movie = {
    id: nextId([...existing, ...byNorm.values()]),
    title: item.title,
    year: item.year,
    genres: item.genres,
    actors: item.actors,
    rating: item.rating,
    description: item.description,
  };
  existing.push(movie);
  byNorm.set(norm, movie);
  added += 1;
}

writeFileSync(moviesPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
console.log(`Done. Added ${added}, skipped ${skipped} (already in catalog). Total: ${existing.length}`);
