import { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogItem, CatalogKind } from '../types';
import { playlistIds } from '../lib/userLibrary';
import {
  canUseNativeShare,
  copyToClipboard,
  downloadTextFile,
  formatPlaylistJson,
  formatPlaylistText,
  sharePlaylist,
} from '../lib/playlistExport';
import type { UserLibrary } from '../lib/userLibrary';
import styles from './PlaylistPanel.module.css';

const KIND_LABELS: Record<CatalogKind, string> = {
  movies: 'фильмов',
  games: 'игр',
  books: 'книг',
};

interface PlaylistPanelProps {
  kind: CatalogKind;
  items: CatalogItem[];
  library: UserLibrary;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function PlaylistPanel({
  kind,
  items,
  library,
  onRemove,
  onClear,
}: PlaylistPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  const ids = useMemo(() => playlistIds(library, kind), [library, kind]);
  const playlistItems = useMemo(
    () => ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as CatalogItem[],
    [ids, items],
  );

  useEffect(
    () => () => {
      if (feedbackTimer.current != null) window.clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    if (feedbackTimer.current != null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 2400);
  };

  const handleCopy = async () => {
    if (!playlistItems.length) return;
    const ok = await copyToClipboard(formatPlaylistText(kind, playlistItems));
    showFeedback(ok ? 'Скопировано в буфер' : 'Не удалось скопировать');
  };

  const handleExportJson = () => {
    if (!playlistItems.length) return;
    downloadTextFile(`playlist-${kind}.json`, formatPlaylistJson(kind, playlistItems), 'application/json');
    showFeedback('JSON скачан');
  };

  const handleExportTxt = () => {
    if (!playlistItems.length) return;
    downloadTextFile(`playlist-${kind}.txt`, formatPlaylistText(kind, playlistItems), 'text/plain');
    showFeedback('TXT скачан');
  };

  const handleShare = async () => {
    if (!playlistItems.length) return;
    const result = await sharePlaylist(kind, playlistItems);
    if (result === 'shared') showFeedback('Отправлено');
    else if (result === 'copied') showFeedback('Скопировано в буфер');
    else showFeedback('Не удалось поделиться');
  };

  const handleClear = () => {
    if (!playlistItems.length) return;
    if (window.confirm(`Очистить плейлист (${playlistItems.length})?`)) {
      onClear();
      showFeedback('Плейлист очищен');
    }
  };

  const hasItems = playlistItems.length > 0;
  const nativeShare = canUseNativeShare();

  return (
    <section className={styles.panel} aria-label="Плейлист">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={styles.toggleTitle}>
          Плейлист
          <span className={styles.count}>({playlistItems.length})</span>
        </span>
        <span className={styles.chevron} aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded && (
        <div className={styles.body}>
          {!hasItems ? (
            <p className={styles.empty}>
              Пока пусто. Нажмите ▢ на карточке, чтобы добавить позицию.
            </p>
          ) : (
            <ul className={styles.list}>
              {playlistItems.map((item, index) => (
                <li key={item.id} className={styles.item}>
                  <span className={styles.itemIndex}>{index + 1}</span>
                  <span className={styles.itemTitle}>{item.title}</span>
                  {item.year > 0 && (
                    <span className={styles.itemYear}>{item.year}</span>
                  )}
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Убрать «${item.title}» из плейлиста`}
                    onClick={() => onRemove(item.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              disabled={!hasItems}
              onClick={handleCopy}
            >
              Копировать
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              disabled={!hasItems}
              onClick={handleShare}
              title={nativeShare ? 'Системное «Поделиться»' : 'Скопирует текст в буфер'}
            >
              {nativeShare ? 'Поделиться' : 'Поделиться…'}
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              disabled={!hasItems}
              onClick={handleExportTxt}
            >
              TXT
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              disabled={!hasItems}
              onClick={handleExportJson}
            >
              JSON
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionDanger}`}
              disabled={!hasItems}
              onClick={handleClear}
            >
              Очистить
            </button>
          </div>

          {feedback && (
            <p className={styles.feedback} role="status">
              {feedback}
            </p>
          )}

          <p className={styles.hint}>
            Плейлист {KIND_LABELS[kind]} хранится локально в браузере.
            {!nativeShare && hasItems && ' «Поделиться» копирует список в буфер.'}
          </p>
        </div>
      )}
    </section>
  );
}
