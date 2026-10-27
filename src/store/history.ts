"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Movie } from "@/types/movie";

/** 表示済みIDが無限に増えないように古いものから捨てる */
const MAX_SEEN = 5000;

type HistoryState = {
  /** 再表示防止用 */
  seenMovieIds: Set<number>;
  /** レコメンド入力 + UI表示用 */
  likedMovieIds: Set<number>;
  /** 保存機能用 */
  bookmarkedMovieIds: Set<number>;
  /** いいね・保存した映画の一覧表示用スナップショット */
  savedMovies: Record<number, Movie>;
  markSeen: (id: number) => void;
  toggleLike: (movie: Movie) => void;
  toggleBookmark: (movie: Movie) => void;
  /** スナップショットが無い映画（旧バージョンで保存したもの）を後から補完する */
  rememberMovie: (movie: Movie) => void;
  clearSeen: () => void;
};

function toggled(set: Set<number>, id: number) {
  const next = new Set(set);
  if (!next.delete(id)) next.add(id);
  return next;
}

function snapshots(
  saved: Record<number, Movie>,
  movie: Movie,
  liked: Set<number>,
  bookmarked: Set<number>,
) {
  const next = { ...saved };
  if (liked.has(movie.id) || bookmarked.has(movie.id)) next[movie.id] = movie;
  else delete next[movie.id];
  return next;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      seenMovieIds: new Set(),
      likedMovieIds: new Set(),
      bookmarkedMovieIds: new Set(),
      savedMovies: {},
      markSeen: (id) =>
        set((s) => {
          if (s.seenMovieIds.has(id)) return s;
          const ids = [...s.seenMovieIds, id];
          return { seenMovieIds: new Set(ids.slice(-MAX_SEEN)) };
        }),
      toggleLike: (movie) =>
        set((s) => {
          const likedMovieIds = toggled(s.likedMovieIds, movie.id);
          return {
            likedMovieIds,
            savedMovies: snapshots(s.savedMovies, movie, likedMovieIds, s.bookmarkedMovieIds),
          };
        }),
      toggleBookmark: (movie) =>
        set((s) => {
          const bookmarkedMovieIds = toggled(s.bookmarkedMovieIds, movie.id);
          return {
            bookmarkedMovieIds,
            savedMovies: snapshots(s.savedMovies, movie, s.likedMovieIds, bookmarkedMovieIds),
          };
        }),
      rememberMovie: (movie) =>
        set((s) => ({ savedMovies: { ...s.savedMovies, [movie.id]: movie } })),
      clearSeen: () => set({ seenMovieIds: new Set() }),
    }),
    {
      name: "filmatch-history",
      // Set は JSON にできないので Array 化して保存し、読込時に Set へ戻す
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) => (value instanceof Set ? { __set: [...value] } : value),
        reviver: (_key, value) =>
          value && typeof value === "object" && "__set" in value
            ? new Set((value as { __set: number[] }).__set)
            : value,
      }),
      partialize: (s) => ({
        seenMovieIds: s.seenMovieIds,
        likedMovieIds: s.likedMovieIds,
        bookmarkedMovieIds: s.bookmarkedMovieIds,
        savedMovies: s.savedMovies,
      }),
    },
  ),
);
