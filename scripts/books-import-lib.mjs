import { readFileSync, writeFileSync } from 'node:fs';

export function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s*\(страница отсутствует\)\s*/gi, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/[«»""„"]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9а-яё\s]/gi, '')
    .trim();
}

export function normalizeAuthor(author) {
  if (!author) return '';
  return author
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9а-яё\s.]/gi, '')
    .trim();
}

export function bookMatchKey(title, author) {
  const t = normalizeTitle(title);
  const a = normalizeAuthor(author);
  return a ? `${t}|${a}` : t;
}

export function nextBookId(existing) {
  let n = 1;
  const ids = new Set(existing.map((b) => b.id));
  while (ids.has(`b${n}`)) n += 1;
  return `b${n}`;
}

export function loadBooks(booksPath) {
  return JSON.parse(readFileSync(booksPath, 'utf8'));
}

export function saveBooks(booksPath, books) {
  const sorted = [...books].sort((a, b) =>
    a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }),
  );
  writeFileSync(booksPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  return sorted;
}

/**
 * @param {Array<{ title: string, author?: string, year?: number, genres?: string[], rating?: number, description?: string, wikiUrl?: string }>} entries
 */
export function mergeBookEntries(existing, entries, defaults) {
  const byKey = new Map();
  const byTitle = new Map();

  for (const book of existing) {
    byKey.set(bookMatchKey(book.title, book.author), book);
    byTitle.set(normalizeTitle(book.title), book);
  }

  let added = 0;
  let skipped = 0;
  let updated = 0;

  for (const entry of entries) {
    const title = entry.title?.trim();
    if (!title) continue;
    const author = (entry.author ?? '').trim();
    const key = bookMatchKey(title, author);
    const titleNorm = normalizeTitle(title);
    const prev = byKey.get(key) ?? (author ? null : byTitle.get(titleNorm));

    if (prev) {
      skipped += 1;
      if (entry.wikiUrl && !prev.wikiUrl) {
        prev.wikiUrl = entry.wikiUrl;
        updated += 1;
      }
      if (entry.year && !prev.year) {
        prev.year = entry.year;
        updated += 1;
      }
      if (author && !prev.author) {
        prev.author = author;
        updated += 1;
      }
      const genres = entry.genres ?? [];
      if (genres.length) {
        const merged = new Set([...(prev.genres ?? []), ...genres]);
        if (merged.size > (prev.genres?.length ?? 0)) {
          prev.genres = [...merged];
          updated += 1;
        }
      }
      if (
        entry.description &&
        !isListDescription(entry.description) &&
        (!prev.description || isListDescription(prev.description))
      ) {
        prev.description = entry.description;
      }
      continue;
    }

    const id = nextBookId([...byKey.values()]);
    const book = {
      id,
      title,
      author: author || defaults.author || 'Неизвестный автор',
      year: entry.year ?? defaults.year ?? 0,
      genres: entry.genres ?? defaults.genres ?? [],
      rating: entry.rating ?? defaults.rating ?? 8.2,
      description: entry.description ?? defaults.description ?? '',
    };
    if (entry.wikiUrl) book.wikiUrl = entry.wikiUrl;
    byKey.set(bookMatchKey(title, author), book);
    byTitle.set(titleNorm, book);
    added += 1;
  }

  return {
    books: [...byKey.values()],
    added,
    skipped,
    updated,
  };
}

export const UA = 'RandomManager/1.0 (local catalog import; books)';

export function decodeHtml(text) {
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

export function stripMissingPageNote(text) {
  return (text ?? '').replace(/\s*\(страница отсутствует\)\s*/gi, '').trim();
}

export function cleanBookTitle(raw) {
  return stripMissingPageNote(decodeHtml(raw))
    .replace(/^[«"„]+|[»""]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanAuthor(raw) {
  const text = stripMissingPageNote(decodeHtml(raw)).replace(/\s+/g, ' ').trim();
  return text || 'Неизвестный автор';
}

const LIST_DESCRIPTION =
  /^(BBC The Big Read|Всемирная библиотека|100 книг века|Подборка Литрес)/;

export function isListDescription(text) {
  return LIST_DESCRIPTION.test(text ?? '');
}

export function preferTitle(a, b) {
  const score = (t) => {
    let s = 0;
    if (/\(страница отсутствует\)/i.test(t)) s -= 10;
    if (/\([^)]+\)/.test(t)) s -= 2;
    if (t.length < (b?.length ?? 999)) s += 1;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

export function parseYearCell(cell) {
  const text = decodeHtml(cell);
  const m = text.match(/\b(1[0-9]{3}|20[0-2]\d)\b/);
  return m ? Number(m[0]) : 0;
}

export async function fetchRuWikiHtml(pageTitle) {
  const url =
    'https://ru.wikipedia.org/w/api.php?action=parse&page=' +
    encodeURIComponent(pageTitle) +
    '&prop=text&format=json&formatversion=2';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Wikipedia API HTTP ${res.status} for ${pageTitle}`);
  const json = await res.json();
  const html = json?.parse?.text;
  if (!html) throw new Error(`Wikipedia API: empty text for ${pageTitle}`);
  return html;
}

export function parseWikiLinkTitle(cellHtml) {
  const titleAttr = cellHtml.match(/<a[^>]+title="([^"]+)"[^>]*>/i);
  if (titleAttr) return cleanBookTitle(titleAttr[1].replace(/_/g, ' '));
  const linkText = cellHtml.match(/<a[^>]+href="\/wiki\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i);
  if (linkText) return cleanBookTitle(linkText[1]);
  return cleanBookTitle(cellHtml);
}

export function ruWikiUrlFromHref(href) {
  if (!href?.startsWith('/wiki/')) return null;
  return `https://ru.wikipedia.org${href.split('#')[0]}`;
}

export function wikiUrlFromTitleCell(cellHtml) {
  const href = cellHtml.match(/<a[^>]+href="(\/wiki\/[^"#]+)"/i)?.[1];
  return ruWikiUrlFromHref(href);
}

export function extractSortableTables(html) {
  const tables = [];
  const re =
    /<table[^>]*class="[^"]*(?:wikitable|standard sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = re.exec(html))) tables.push(m[1]);
  if (!tables.length) {
    const fallback = html.match(/<table[^>]*class="standard sortable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (fallback) tables.push(fallback[1]);
  }
  return tables;
}
