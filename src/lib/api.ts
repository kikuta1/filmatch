/** API Routes 共通のパラメータ検証・エラーレスポンス */
import { TmdbError } from "@/lib/tmdb";
import { DECADES, type DecadeId, type Filters } from "@/types/movie";

export function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export function parseId(raw: string): number | null {
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

/** 未指定は null、不正値は undefined */
export function parsePage(raw: string | null): number | null | undefined {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : undefined;
}

export function parseFilters(params: URLSearchParams): Filters | null {
  const genresRaw = params.get("genres");
  const genres = genresRaw ? genresRaw.split(",").map(Number) : [];
  if (genres.some((g) => !Number.isInteger(g) || g <= 0) || genres.length > 20) return null;

  const decadeRaw = params.get("decade");
  if (decadeRaw && !DECADES.some((d) => d.id === decadeRaw)) return null;

  return {
    genres,
    decade: (decadeRaw as DecadeId | null) || null,
    matchAll: params.get("match") === "all",
  };
}

export function handleError(e: unknown) {
  if (e instanceof TmdbError) {
    console.error(e.message);
    if (e.status === 401) return jsonError(502, "TMDB API キーが無効です");
    if (e.status === 429) return jsonError(503, "TMDB のリクエスト上限に達しました");
    return jsonError(502, "TMDB からの取得に失敗しました");
  }
  console.error(e);
  return jsonError(500, "サーバーエラーが発生しました");
}
