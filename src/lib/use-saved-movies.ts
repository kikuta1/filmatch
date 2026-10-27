"use client";

import { useEffect, useMemo } from "react";
import { fetchMovieFull } from "@/lib/client";
import { useHistory } from "@/store/history";
import type { Movie, MovieFull } from "@/types/movie";

function toMovie({ detail }: MovieFull): Movie {
  return {
    id: detail.id,
    title: detail.title,
    original_title: detail.original_title,
    overview: detail.overview,
    poster_path: detail.poster_path,
    backdrop_path: detail.backdrop_path,
    release_date: detail.release_date,
    genre_ids: detail.genres.map((g) => g.id),
    vote_average: detail.vote_average,
    vote_count: detail.vote_count,
    popularity: 0,
  };
}

/**
 * ID の集合から映画一覧を返す（新しく追加した順）。
 * スナップショットが無いもの（一覧機能より前にいいねしたもの）は API から補完する。
 */
export function useSavedMovies(ids: Set<number>) {
  const savedMovies = useHistory((s) => s.savedMovies);
  const rememberMovie = useHistory((s) => s.rememberMovie);

  const ordered = useMemo(() => [...ids].reverse(), [ids]);
  const missing = useMemo(
    () => ordered.filter((id) => !savedMovies[id]),
    [ordered, savedMovies],
  );

  useEffect(() => {
    for (const id of missing) {
      fetchMovieFull(id)
        .then((full) => rememberMovie(toMovie(full)))
        .catch(() => {});
    }
  }, [missing, rememberMovie]);

  const movies = ordered.map((id) => savedMovies[id]).filter((m): m is Movie => !!m);
  return { movies, loading: missing.length > 0 };
}
