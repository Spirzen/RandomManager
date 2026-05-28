/**
 * Import books from curated lists into data/books.json:
 * - BBC The Big Read (ru.wikipedia)
 * - Всемирная библиотека / Norwegian book club (ru.wikipedia)
 * - 100 книг века Le Monde (ru.wikipedia)
 * - Литрес «Лучшие из лучших»
 *
 * Run: node scripts/import-books-lists.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanAuthor,
  cleanBookTitle,
  decodeHtml,
  extractSortableTables,
  fetchRuWikiHtml,
  loadBooks,
  mergeBookEntries,
  parseWikiLinkTitle,
  parseYearCell,
  saveBooks,
  UA,
  wikiUrlFromTitleCell,
} from './books-import-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const booksPath = join(root, 'data', 'books.json');

const GENRE = {
  bbc: 'bbc-big-read',
  norwegian: 'norwegian-top100',
  leMonde: 'le-monde-100',
  litres: 'litres-best',
};

function parseRankedTable(tableHtml, { titleCol, authorCol, yearCol, rankInFirstCol }) {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const entries = [];
  let lastRank = 0;

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1]);
    if (cells.length < 3) continue;

    const h0 = decodeHtml(cells[0]);
    if (/^(№|название|заглавие|титул)/i.test(h0)) continue;

    let offset = 0;
    let rank = lastRank;
    if (rankInFirstCol) {
      const rm = h0.match(/^(\d+)/);
      if (rm) {
        rank = Number(rm[1]);
        lastRank = rank;
        offset = 1;
      }
    } else {
      rank = entries.length + 1;
    }

    const title = parseWikiLinkTitle(cells[offset + titleCol]);
    if (!title || /^(название|заглавие)$/i.test(title)) continue;

    const author =
      authorCol >= 0
        ? cleanAuthor(parseWikiLinkTitle(cells[offset + authorCol]))
        : 'Неизвестный автор';
    const year = yearCol >= 0 ? parseYearCell(cells[offset + yearCol]) : 0;
    const wikiUrl = wikiUrlFromTitleCell(cells[offset + titleCol]);

    entries.push({ title, author, year, rank, wikiUrl });
  }

  return entries;
}

function entryFromWiki(row, listLabel, genreTag, rankLabel) {
  const author =
    row.author && !/^неизвестн/i.test(row.author) ? row.author : 'Неизвестный автор';
  return {
    title: row.title,
    author,
    year: row.year ?? 0,
    genres: ['классика', genreTag],
    rating: 8.3,
    wikiUrl: row.wikiUrl ?? undefined,
    description: `${listLabel}${rankLabel ? `, ${rankLabel}` : ''}.`,
  };
}

async function importBbc() {
  const html = await fetchRuWikiHtml('200_лучших_романов_по_версии_Би-би-си');
  const tables = extractSortableTables(html);
  const table = tables.find((t) => /Название/i.test(t)) ?? tables[0];
  if (!table) throw new Error('BBC table not found');
  const rows = parseRankedTable(table, {
    titleCol: 0,
    authorCol: 1,
    yearCol: -1,
    rankInFirstCol: true,
  });
  return rows.map((r) =>
    entryFromWiki(r, 'BBC The Big Read (2003)', GENRE.bbc, `№${r.rank}`),
  );
}

async function importNorwegian() {
  const html = await fetchRuWikiHtml(
    'Всемирная_библиотека_(Норвежский_книжный_клуб)',
  );
  const tables = extractSortableTables(html);
  const table = tables.find((t) => /Название/i.test(t) && /Автор/i.test(t));
  if (!table) throw new Error('Norwegian table not found');
  const rows = parseRankedTable(table, {
    titleCol: 0,
    authorCol: 1,
    yearCol: 2,
    rankInFirstCol: false,
  });
  return rows.map((r) =>
    entryFromWiki(
      r,
      'Всемирная библиотека — 100 книг (Норвежский книжный клуб, 2002)',
      GENRE.norwegian,
      null,
    ),
  );
}

async function importLeMonde() {
  const html = await fetchRuWikiHtml('100_книг_века_по_версии_Le_Monde');
  const tables = extractSortableTables(html);
  const table = tables.find((t) => /Заглавие|Название/i.test(t)) ?? tables[0];
  if (!table) throw new Error('Le Monde table not found');
  const rows = parseRankedTable(table, {
    titleCol: 0,
    authorCol: 1,
    yearCol: 2,
    rankInFirstCol: true,
  });
  return rows.map((r) =>
    entryFromWiki(r, '100 книг века по версии Le Monde (1999)', GENRE.leMonde, `№${r.rank}`),
  );
}

async function importLitres() {
  const slug = 'collections/luchshie-iz-luchshih-knigi-kotorye-dolzhen-prochitat-kazhdyy';
  const base = `https://api.litres.ru/foundation/api/collections/${slug}`;
  const all = [];
  let offset = 0;

  while (true) {
    const url = `${base}/arts/facets?is_for_pda=false&limit=100&o=popular&offset=${offset}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Litres API HTTP ${res.status}`);
    const json = await res.json();
    const data = json.payload?.data ?? [];
    all.push(...data);
    if (!json.payload?.pagination?.next_page || !data.length) break;
    offset += data.length;
  }

  return all.map((art) => {
    const author =
      (art.persons ?? [])
        .filter((p) => p.role === 'author' || p.relation === 0)
        .map((p) => p.full_name)
        .filter(Boolean)
        .join(', ') ||
      art.persons?.[0]?.full_name ||
      'Неизвестный автор';
    const year = art.release_year ?? art.year ?? 0;
    const url = art.url ? `https://www.litres.ru${art.url}` : undefined;
    return {
      title: cleanBookTitle(art.title),
      author,
      year: typeof year === 'number' && year > 0 ? year : 0,
      genres: ['классика', GENRE.litres],
      rating: 8.4,
      description: 'Подборка Литрес «Лучшие из лучших: книги, которые должен прочитать каждый».',
      ...(url ? { litresUrl: url } : {}),
    };
  });
}

const existing = loadBooks(booksPath);
console.log(`Current catalog: ${existing.length} books`);

const sources = [
  { name: 'BBC Big Read', fn: importBbc },
  { name: 'Norwegian top 100', fn: importNorwegian },
  { name: 'Le Monde 100', fn: importLeMonde },
  { name: 'Litres best', fn: importLitres },
];

let books = existing;
const totals = { added: 0, skipped: 0, updated: 0 };

for (const { name, fn } of sources) {
  console.log(`\nFetching ${name}…`);
  const parsed = await fn();
  console.log(`  Parsed ${parsed.length} entries`);
  const result = mergeBookEntries(books, parsed, {
    year: 0,
    author: 'Неизвестный автор',
    genres: ['классика'],
    rating: 8.2,
    description: '',
  });
  books = result.books;
  totals.added += result.added;
  totals.skipped += result.skipped;
  totals.updated += result.updated;
  console.log(`  +${result.added} new, ${result.skipped} matched, ${result.updated} updated`);
}

const saved = saveBooks(booksPath, books);
console.log(
  `\nDone. was: ${existing.length}, now: ${saved.length}, added: ${totals.added}, duplicates: ${totals.skipped}, field updates: ${totals.updated}`,
);
