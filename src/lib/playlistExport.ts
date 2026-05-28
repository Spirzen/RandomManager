import type { CatalogItem, CatalogKind } from '../types';

const KIND_LABELS: Record<CatalogKind, string> = {
  movies: 'фильмов',
  games: 'игр',
  books: 'книг',
};

export function formatPlaylistText(kind: CatalogKind, items: CatalogItem[]): string {
  const header = `Плейлист ${KIND_LABELS[kind]}:`;
  if (!items.length) return `${header}\n(пусто)`;
  const lines = items.map((item, i) => {
    const year = item.year > 0 ? ` (${item.year})` : '';
    const rating = item.rating > 0 ? ` ★${item.rating.toFixed(1)}` : '';
    return `${i + 1}. ${item.title}${year}${rating}`;
  });
  return [header, ...lines].join('\n');
}

export function formatPlaylistJson(kind: CatalogKind, items: CatalogItem[]): string {
  return JSON.stringify(
    {
      kind,
      exportedAt: new Date().toISOString(),
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        year: item.year,
        rating: item.rating,
      })),
    },
    null,
    2,
  );
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/plain;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function sharePlaylist(
  kind: CatalogKind,
  items: CatalogItem[],
): Promise<'shared' | 'copied' | 'failed'> {
  const text = formatPlaylistText(kind, items);
  const title = `Плейлист ${KIND_LABELS[kind]}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed';
    }
  }

  const copied = await copyToClipboard(text);
  return copied ? 'copied' : 'failed';
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}
