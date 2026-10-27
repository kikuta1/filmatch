"use client";

/** ブラウザから自前の API Routes を叩くためのヘルパー */
import type { MovieFull, MovieListResponse } from "@/types/movie";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `通信に失敗しました (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function fetchDiscover(params: URLSearchParams) {
  return getJson<MovieListResponse>(`/api/movies/discover?${params}`);
}

export function fetchSimilar(id: number, page = 1) {
  return getJson<MovieListResponse>(`/api/movies/${id}/similar?page=${page}`);
}

export function fetchRecommended(id: number, page = 1) {
  return getJson<MovieListResponse>(`/api/movies/${id}/recommendations?page=${page}`);
}

export function fetchDirected(personId: number) {
  return getJson<MovieListResponse>(`/api/people/${personId}/directed`);
}

// 詳細はスワイプで行き来するたびに取り直さないよう、セッション中はメモリに保持する
const fullCache = new Map<number, Promise<MovieFull>>();

export function fetchMovieFull(id: number): Promise<MovieFull> {
  let p = fullCache.get(id);
  if (!p) {
    p = getJson<MovieFull>(`/api/movies/${id}`);
    // 失敗したものは次回リトライできるようにキャッシュから外す
    p.catch(() => fullCache.delete(id));
    fullCache.set(id, p);
  }
  return p;
}
