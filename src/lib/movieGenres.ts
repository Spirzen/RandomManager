/** Нормализация жанров фильмов — отсекает мусор из импорта и дубликаты регистра. */

const META_TAGS = new Set([
  'random-media-bot',
  'фильм',
  'сериал',
  'аниме',
  'дорама',
  'болливуд',
]);

const GENRE_ALIASES = new Map<string, string>([
  ['мультфильмы', 'мультфильм'],
  ['музыкальный фильм', 'музыка'],
  ['исторический фильм', 'история'],
  ['мистический фильм', 'мистика'],
]);

const CANONICAL_GENRES = new Set([
  'драма',
  'комедия',
  'боевик',
  'триллер',
  'фантастика',
  'фэнтези',
  'мелодрама',
  'ужасы',
  'детектив',
  'криминал',
  'приключения',
  'биография',
  'история',
  'военный',
  'мультфильм',
  'семейный',
  'вестерн',
  'спорт',
  'мюзикл',
  'нуар',
  'аниме',
  'музыка',
  'мистика',
]);

const GENRES_BY_LENGTH = [...CANONICAL_GENRES].sort((a, b) => b.length - a.length);

const METADATA_RE =
  /продолжительность|рейтинг\s*(кп|imdb)|режисс[ёe]р|в\s*ролях|перевод\s*:|премьера|качество\s*:|full\s*hd|\d{4}-\d{2}-\d{2}/i;

function normalizeToken(raw: string): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalGenre(token: string): string | null {
  const t = normalizeToken(token);
  if (!t || META_TAGS.has(t)) return null;
  if (GENRE_ALIASES.has(t)) return GENRE_ALIASES.get(t)!;
  if (CANONICAL_GENRES.has(t)) return t;
  return null;
}

function extractFromCorrupted(raw: string): string | null {
  const lower = normalizeToken(raw);
  if (!lower || META_TAGS.has(lower)) return null;

  const prefix = lower.match(
    /^([а-яa-z-]+?)(?=продолжительность|рейтинг|режисс|перевод|премьера|качество|в\s*ролях)/,
  );
  if (prefix) {
    const g = canonicalGenre(prefix[1]!);
    if (g) return g;
  }

  for (const genre of GENRES_BY_LENGTH) {
    if (lower.startsWith(genre)) return genre;
  }

  return null;
}

function looksLikePersonName(raw: string): boolean {
  const t = normalizeToken(raw);
  if (!t || t.length > 48 || METADATA_RE.test(t)) return false;
  if (canonicalGenre(t)) return false;
  if (/^\d/.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 4 && t.length <= 40;
}

export function sanitizeMovieGenre(raw: string): string | null {
  const direct = canonicalGenre(raw);
  if (direct) return direct;

  const lower = normalizeToken(raw);
  if (!lower || META_TAGS.has(lower)) return null;
  if (METADATA_RE.test(lower)) return extractFromCorrupted(raw);
  if (looksLikePersonName(raw)) return null;
  if (lower.length > 32) return extractFromCorrupted(raw);

  return null;
}

export function sanitizeMovieGenres(genres: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of genres ?? []) {
    const g = sanitizeMovieGenre(raw);
    if (g && !seen.has(g)) {
      seen.add(g);
      out.push(g);
    }
  }
  return out;
}
