/**
 * Import curated catalog from Random Media Bot Main.db into data/*.json
 *
 * Run: node scripts/import-from-maindb.mjs [path-to-Main.db]
 */
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBooks, mergeBookEntries, saveBooks } from './books-import-lib.mjs';
import { loadGames, mergeGameEntries, saveGames } from './games-import-lib.mjs';
import {
  loadMovies,
  mergeMovieEntries,
  saveMovies,
} from './movies-import-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultDb =
  'F:\\Projects\\C#\\Random Media Bot\\Random Bot\\Main.db';
const dbPath = process.argv[2] ?? defaultDb;

const SOURCE_TAG = 'random-media-bot';

const MOVIE_TABLES = [
  { table: 'Cinema', kind: 'фильм' },
  { table: 'TVShows', kind: 'сериал' },
  { table: 'Anime', kind: 'аниме' },
  { table: 'Doramas', kind: 'дорама' },
  { table: 'IndianFilm', kind: 'болливуд' },
];

function genresFromField(genre, extra = []) {
  const parts = String(genre ?? '')
    .split(/[,;/|]/)
    .map((g) => g.trim())
    .filter(Boolean);
  return [...new Set([...parts, ...extra, SOURCE_TAG])];
}

function ratingFromScores(myScore, score, fallback = 8) {
  if (myScore > 0) return Math.min(10, Math.round((myScore / 10) * 10) / 10);
  const s = Number.parseFloat(String(score ?? '').replace(',', '.'));
  if (!Number.isFinite(s) || s <= 0) return fallback;
  return s > 10 ? Math.min(10, Math.round((s / 10) * 10) / 10) : s;
}

function platformsFromFlags(row) {
  const platforms = [];
  if (row.PC || row.Steam) platforms.push('PC');
  if (row.XBOX) platforms.push('Xbox');
  if (row.PS) platforms.push('PlayStation');
  if (row.Nintendo) platforms.push('Switch');
  if (row.BattleNet) platforms.push('Battle.net');
  return platforms.length ? [...new Set(platforms)] : ['PC'];
}

function trimDescription(text) {
  const d = String(text ?? '').replace(/\s+/g, ' ').trim();
  return d.length > 600 ? `${d.slice(0, 597)}…` : d;
}

function rowText(row, key) {
  const v = row[key];
  return v == null ? '' : String(v).trim();
}

const db = new DatabaseSync(dbPath);

function fetchAll(sql) {
  return db.prepare(sql).all();
}

// ——— Books ———
const bookRows = fetchAll(
  "SELECT Name, Author, Year, Genre, MyScore, Description, Wiki, Recommend FROM Books WHERE trim(Name) != ''",
);
const bookEntries = bookRows.map((row) => ({
  title: rowText(row, 'Name'),
  author: rowText(row, 'Author') || 'Неизвестный автор',
  year: Number(row.Year) || 0,
  genres: genresFromField(row.Genre),
  rating: ratingFromScores(row.MyScore, null, 8.2),
  description:
    trimDescription(row.Description) ||
    (row.Recommend
      ? 'Из личной подборки Random Media Bot.'
      : 'Книга из каталога Random Media Bot.'),
  wikiUrl: rowText(row, 'Wiki') || undefined,
}));

const booksPath = join(root, 'data', 'books.json');
const existingBooks = loadBooks(booksPath);
const booksResult = mergeBookEntries(existingBooks, bookEntries, {
  author: 'Неизвестный автор',
  year: 0,
  genres: [SOURCE_TAG],
  rating: 8.2,
  description: 'Из каталога Random Media Bot.',
});
const savedBooks = saveBooks(booksPath, booksResult.books);

// ——— Games ———
const gameRows = fetchAll(`
  SELECT Name, Year, Genre, MyScore, Description, Wiki, Main,
         XBOX, PS, Nintendo, Steam, BattleNet, PC
  FROM Games WHERE trim(Name) != ''
`);
const gameEntries = gameRows.map((row) => {
  const storeUrl = rowText(row, 'Main') || null;
  return {
    title: rowText(row, 'Name'),
    year: Number(row.Year) || 0,
    genres: genresFromField(row.Genre),
    developer: '',
    platforms: platformsFromFlags(row),
    rating: ratingFromScores(row.MyScore, null, 8),
    description:
      trimDescription(row.Description) ||
      'Игра из личной подборки Random Media Bot.',
    storeUrl: /steampowered\.com/i.test(storeUrl ?? '') ? storeUrl : storeUrl,
    wikiUrl: rowText(row, 'Wiki') || undefined,
  };
});

const gamesPath = join(root, 'data', 'games.json');
const existingGames = loadGames(gamesPath);
const gamesResult = mergeGameEntries(existingGames, gameEntries, {
  year: 0,
  genres: [SOURCE_TAG],
  developer: '',
  rating: 8,
  description: 'Из каталога Random Media Bot.',
});
const savedGames = saveGames(gamesPath, gamesResult.games);

// ——— Movies (Cinema + series tables) ———
const movieEntries = [];
for (const { table, kind } of MOVIE_TABLES) {
  const rows = fetchAll(
    `SELECT Name, Year, Genre, MyScore, Description, Score, Recommend FROM [${table}] WHERE trim(Name) != ''`,
  );
  for (const row of rows) {
    movieEntries.push({
      title: rowText(row, 'Name'),
      year: Number(row.Year) || 0,
      genres: genresFromField(row.Genre, [kind]),
      actors: [],
      rating: ratingFromScores(row.MyScore, row.Score, 8),
      description:
        trimDescription(row.Description) ||
        `${kind[0].toUpperCase()}${kind.slice(1)} из подборки Random Media Bot.`,
    });
  }
}

const moviesPath = join(root, 'data', 'movies.json');
const existingMovies = loadMovies(moviesPath);
const moviesResult = mergeMovieEntries(existingMovies, movieEntries, {
  year: 0,
  genres: [SOURCE_TAG],
  actors: [],
  rating: 8,
  description: 'Из каталога Random Media Bot.',
});
const savedMovies = saveMovies(moviesPath, moviesResult.movies);

console.log(`Database: ${dbPath}`);
console.log(
  `Books: parsed ${bookEntries.length}, +${booksResult.added}, updated ${booksResult.updated}, dup ${booksResult.skipped}, total ${savedBooks.length}`,
);
console.log(
  `Games: parsed ${gameEntries.length}, +${gamesResult.added}, updated ${gamesResult.updated}, dup ${gamesResult.skipped}, total ${savedGames.length}`,
);
console.log(
  `Movies: parsed ${movieEntries.length}, +${moviesResult.added}, updated ${moviesResult.updated}, dup ${moviesResult.skipped}, total ${savedMovies.length}`,
);
