import { useEffect, useState, useCallback } from 'react';
import { WatchHistoryItem, WatchlistItem } from '../types/api';

const WATCHLIST_KEY = 'voidflix_watchlist';
const FALLBACK_WATCHLIST_KEY = 'flowflix_watchlist';
const HISTORY_KEY = 'voidflix_continue_watching';
const FALLBACK_HISTORY_KEY = 'flowflix_continue_watching';

function getStoredItems<T>(key: string, fallbackKey: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key) || localStorage.getItem(fallbackKey);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredItems<T>(key: string, items: T[], notify = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
    if (notify) {
      window.dispatchEvent(new Event('voidflix_storage_change'));
    }
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() =>
    getStoredItems<WatchlistItem>(WATCHLIST_KEY, FALLBACK_WATCHLIST_KEY)
  );

  useEffect(() => {
    const handler = () => {
      setWatchlist(getStoredItems<WatchlistItem>(WATCHLIST_KEY, FALLBACK_WATCHLIST_KEY));
    };
    window.addEventListener('voidflix_storage_change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('voidflix_storage_change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const isSaved = (seriesId: string | number) => {
    return watchlist.some(item => String(item.seriesId) === String(seriesId));
  };

  const toggleWatchlist = (item: Omit<WatchlistItem, 'addedAt'>) => {
    const exists = isSaved(item.seriesId);
    let updated: WatchlistItem[];
    if (exists) {
      updated = watchlist.filter(w => String(w.seriesId) !== String(item.seriesId));
    } else {
      updated = [{ ...item, addedAt: Date.now() }, ...watchlist];
    }
    setWatchlist(updated);
    saveStoredItems(WATCHLIST_KEY, updated);
  };

  const removeFromWatchlist = (seriesId: string | number) => {
    const updated = watchlist.filter(w => String(w.seriesId) !== String(seriesId));
    setWatchlist(updated);
    saveStoredItems(WATCHLIST_KEY, updated);
  };

  const clearWatchlist = () => {
    setWatchlist([]);
    saveStoredItems(WATCHLIST_KEY, []);
  };

  return {
    watchlist,
    isSaved,
    toggleWatchlist,
    removeFromWatchlist,
    clearWatchlist
  };
}

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>(() =>
    getStoredItems<WatchHistoryItem>(HISTORY_KEY, FALLBACK_HISTORY_KEY)
  );

  useEffect(() => {
    const handler = () => {
      setHistory(getStoredItems<WatchHistoryItem>(HISTORY_KEY, FALLBACK_HISTORY_KEY));
    };
    window.addEventListener('voidflix_storage_change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('voidflix_storage_change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const saveProgress = useCallback((entry: WatchHistoryItem) => {
    const current = getStoredItems<WatchHistoryItem>(HISTORY_KEY, FALLBACK_HISTORY_KEY);
    const filtered = current.filter(
      h => !(String(h.seriesId) === String(entry.seriesId) && String(h.chapterId) === String(entry.chapterId))
    );
    const updated = [entry, ...filtered].slice(0, 50); // limit to last 50 items
    setHistory(updated);
    // notify = false so frequent playback updates don't cause infinite re-render loops in players
    saveStoredItems(HISTORY_KEY, updated, false);
  }, []);

  const getProgress = useCallback((seriesId: string | number, chapterId?: string | number): WatchHistoryItem | undefined => {
    const list = getStoredItems<WatchHistoryItem>(HISTORY_KEY, FALLBACK_HISTORY_KEY);
    if (chapterId) {
      return list.find(
        h => String(h.seriesId) === String(seriesId) && String(h.chapterId) === String(chapterId)
      );
    }
    return list.find(h => String(h.seriesId) === String(seriesId));
  }, []);

  const removeHistoryItem = useCallback((seriesId: string | number, chapterId: string | number) => {
    const current = getStoredItems<WatchHistoryItem>(HISTORY_KEY, FALLBACK_HISTORY_KEY);
    const updated = current.filter(
      h => !(String(h.seriesId) === String(seriesId) && String(h.chapterId) === String(chapterId))
    );
    setHistory(updated);
    saveStoredItems(HISTORY_KEY, updated, true);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveStoredItems(HISTORY_KEY, [], true);
  }, []);

  return {
    history,
    saveProgress,
    getProgress,
    removeHistoryItem,
    clearHistory
  };
}
