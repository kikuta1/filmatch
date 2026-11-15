/**
 * TMDB API クライアント（サーバーサイド専用。API Routes からのみ呼ぶ）
 * TMDB_API_KEY が未設定の場合は lib/mock.ts のダミーデータを返す。
 */
import { cacheLife } from "next/cache";
import { mockDiscover, mockFull, mockSimilar } from "@/lib/mock";
import {
  GENRES,
  findDecade,
  type Filters,
  type Genre,
  type Movie,
  type MovieFull,
  type MovieImage,
  type MovieListResponse,
  type WatchProvider,
} from "@/types/movie";

const BASE_URL = "https://api.themoviedb.org/3";
/** TMDB discover は 500 ページまでしか取得できない */
const MAX_PAGE = 500;

export class TmdbError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function isMockMode() {
  return !process.env.TMDB_API_KEY;
}

type Params = Record<string, string>;

async function tmdbFetch<T>(path: string, params: Params = {}): Promise<T> {
  try {
    return (await cachedTmdbFetch(path, params)) as T;
  } catch (e) {
    // キャッシュ境界を越えるとエラーのクラスが失われるので、メッセージから復元する
    const status = Number(/^tmdb:(\d+)$/.exec(e instanceof Error ? e.message : "")?.[1]);
    if (status) throw new TmdbError(status, `TMDB ${path} responded ${status}`);
    throw e;
  }
}

async function cachedTmdbFetch(path: string, params: Params): Promise<unknown> {
  "use cache";
  cacheLife("hours");

  const key = process.env.TMDB_API_KEY ?? "";
  const url = new URL(BASE_URL + path);
  url.searchParams.set("language", "ja-JP");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const headers: HeadersInit = { accept: "application/json" };
  // v4 の Read Access Token (JWT) と v3 の API Key のどちらでも動くようにする
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`tmdb:${res.status}`);
  return res.json();
}

type TmdbList = { results: Movie[]; total_pages: number };

function discoverParams(filters: Filters): Params {
  const params: Params = {
    include_adult: "false",
    include_video: "false",
    sort_by: "popularity.desc",
    // レビュアーがほぼいない映画はポスターや情報が欠けがちなので除外
    "vote_count.gte": "20",
  };
  // TMDB の with_genres は "|" で OR、"," で AND
  if (filters.genres.length) params.with_genres = filters.genres.join(filters.matchAll ? "," : "|");
  const decade = findDecade(filters.decade);
  if (decade) {
    params["primary_release_date.gte"] = decade.from;
    params["primary_release_date.lte"] = decade.to;
  }
  return params;
}

/**
 * page 未指定時はランダムなページを返す。
 * 人気順の全ページから等確率で選ぶので、人気作に偏らない。
 */
export async function discoverMovies(
  filters: Filters,
  page: number | null,
): Promise<MovieListResponse> {
  if (isMockMode()) return mockDiscover(filters, page);

  const params = discoverParams(filters);
  if (page) {
    const data = await tmdbFetch<TmdbList>("/discover/movie", { ...params, page: String(page) });
    return { results: data.results, total_pages: Math.min(data.total_pages, MAX_PAGE) };
  }

  // 1ページ目で総ページ数を知る（キャッシュされるので2回目以降は実質1リクエスト）
  const first = await tmdbFetch<TmdbList>("/discover/movie", { ...params, page: "1" });
  const totalPages = Math.min(first.total_pages, MAX_PAGE);
  const randomPage = 1 + Math.floor(Math.random() * totalPages);
  if (randomPage <= 1) return { results: first.results, total_pages: totalPages };
  const data = await tmdbFetch<TmdbList>("/discover/movie", {
    ...params,
    page: String(randomPage),
  });
  return { results: data.results, total_pages: totalPages };
}

export async function getSimilarMovies(id: number, page: number | null): Promise<MovieListResponse> {
  if (isMockMode()) return mockSimilar(id, page);
  const data = await tmdbFetch<TmdbList>(`/movie/${id}/similar`, { page: String(page ?? 1) });
  return { results: data.results, total_pages: Math.min(data.total_pages, MAX_PAGE) };
}

/** TMDB の「おすすめ」。キーワード・ジャンルベースの similar より「これを好きな人はこれも好き」に近い */
export async function getRecommendedMovies(
  id: number,
  page: number | null,
): Promise<MovieListResponse> {
  if (isMockMode()) return mockSimilar(id, page);
  const data = await tmdbFetch<TmdbList>(`/movie/${id}/recommendations`, {
    page: String(page ?? 1),
  });
  return { results: data.results, total_pages: Math.min(data.total_pages, MAX_PAGE) };
}

type CreditMovie = Movie & { job: string };

/** その人が監督した映画（レビュアー数の多い順） */
export async function getDirectedMovies(personId: number): Promise<MovieListResponse | null> {
  if (isMockMode()) return { results: [], total_pages: 0, mock: true };
  let data: { crew: CreditMovie[] };
  try {
    data = await tmdbFetch<{ crew: CreditMovie[] }>(`/person/${personId}/movie_credits`);
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) return null;
    throw e;
  }
  const seen = new Set<number>();
  const results: Movie[] = [];
  for (const c of data.crew) {
    if (c.job !== "Director" || seen.has(c.id)) continue;
    seen.add(c.id);
    results.push({
      id: c.id,
      title: c.title,
      original_title: c.original_title,
      overview: c.overview,
      poster_path: c.poster_path,
      backdrop_path: c.backdrop_path,
      release_date: c.release_date,
      genre_ids: c.genre_ids,
      vote_average: c.vote_average,
      vote_count: c.vote_count,
      popularity: c.popularity,
    });
  }
  results.sort((a, b) => b.vote_count - a.vote_count);
  return { results, total_pages: 1 };
}

type RawProviders = {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
};

type RawFull = MovieFull["detail"] & {
  credits: MovieFull["credits"];
  images: MovieFull["images"];
  "watch/providers": { results: Record<string, RawProviders> };
};

/** detail + credits + images + watch providers を1回の TMDB 呼び出しで取得して結合する */
export async function getMovieFull(id: number): Promise<MovieFull | null> {
  if (isMockMode()) return mockFull(id);

  let raw: RawFull;
  try {
    raw = await tmdbFetch<RawFull>(`/movie/${id}`, {
      append_to_response: "credits,images,watch/providers",
      // スチル画像は言語なし(null)が本来のシーン写真
      include_image_language: "null,ja,en",
    });
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) return null;
    throw e;
  }

  let { overview, tagline } = raw;
  if (!overview) {
    // 日本語あらすじが無い作品は英語で補完
    const en = await tmdbFetch<{ overview: string; tagline: string }>(`/movie/${id}`, {
      language: "en-US",
    });
    overview = en.overview;
    tagline ||= en.tagline;
  }

  const jp = raw["watch/providers"]?.results?.JP;
  return {
    detail: {
      id: raw.id,
      title: raw.title,
      original_title: raw.original_title,
      overview,
      tagline,
      poster_path: raw.poster_path,
      backdrop_path: raw.backdrop_path,
      release_date: raw.release_date,
      runtime: raw.runtime,
      genres: raw.genres,
      vote_average: raw.vote_average,
      vote_count: raw.vote_count,
      budget: raw.budget,
      revenue: raw.revenue,
      production_countries: raw.production_countries,
      production_companies: raw.production_companies,
    },
    credits: {
      cast: raw.credits.cast.slice(0, 12),
      crew: raw.credits.crew.filter((c) => c.job === "Director"),
    },
    images: {
      backdrops: pickStills(raw.images.backdrops),
      posters: raw.images.posters.slice(0, 4),
    },
    watchProviders: jp
      ? {
          link: jp.link ?? null,
          flatrate: jp.flatrate ?? [],
          rent: jp.rent ?? [],
          buy: jp.buy ?? [],
        }
      : null,
  };
}

/** スチル画像として見せる最低枚数。これに満たないときだけ文字入り画像も使う */
const MIN_STILLS = 4;
const MAX_STILLS = 12;

/**
 * 言語なし（文字の入っていない場面写真）を優先する。
 * 言語付きの画像は同じ場面の各国版やタイトルロゴ入りが多く、並べると重複して見えるため。
 */
function pickStills(backdrops: MovieImage[]) {
  const plain = backdrops.filter((b) => !b.iso_639_1);
  const list = plain.length >= MIN_STILLS ? plain : backdrops;
  return list.slice(0, MAX_STILLS);
}

export async function getGenres(): Promise<Genre[]> {
  if (isMockMode()) return GENRES;
  const data = await tmdbFetch<{ genres: Genre[] }>("/genre/movie/list");
  return data.genres;
}
