/**
 * Merge duplicate books (same author + normalized title) and clean Wikipedia titles.
 * Run: node scripts/dedupe-books.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bookMatchKey,
  cleanAuthor,
  cleanBookTitle,
  isListDescription,
  loadBooks,
  preferTitle,
  saveBooks,
} from './books-import-lib.mjs';

const booksPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'books.json');
const books = loadBooks(booksPath);
const groups = new Map();

for (const book of books) {
  book.title = cleanBookTitle(book.title);
  book.author = cleanAuthor(book.author);
  const key = bookMatchKey(book.title, book.author);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(book);
}

const merged = [];
let removed = 0;

for (const group of groups.values()) {
  if (group.length === 1) {
    merged.push(group[0]);
    continue;
  }
  removed += group.length - 1;
  const keep = group.reduce((best, cur) => {
    const pick = { ...best };
    pick.title = preferTitle(best.title, cur.title);
    if ((cur.year ?? 0) > (pick.year ?? 0)) pick.year = cur.year;
    if (cur.wikiUrl && !pick.wikiUrl) pick.wikiUrl = cur.wikiUrl;
    if (cur.litresUrl && !pick.litresUrl) pick.litresUrl = cur.litresUrl;
    pick.genres = [...new Set([...(pick.genres ?? []), ...(cur.genres ?? [])])];
    if (!pick.description || isListDescription(pick.description)) {
      if (cur.description && !isListDescription(cur.description)) pick.description = cur.description;
    }
    if (!pick.description && cur.description) pick.description = cur.description;
    pick.rating = Math.max(pick.rating ?? 0, cur.rating ?? 0);
    return pick;
  });
  merged.push(keep);
}

const saved = saveBooks(booksPath, merged);
console.log(`Merged ${removed} duplicates. ${books.length} → ${saved.length} books.`);
