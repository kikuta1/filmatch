"use client";

/**
 * レコメンドロジック（discover + similar映画ミックス）
 * 1. discover でフィルター条件に合う映画をランダムページから取得
 * 2. いいね済み映画があれば、ランダムに1つ選んで似た映画（similar + recommendations）を取得
 * 3. discover 60% / similar 40% でランダムに混合
 * 4. 表示済み・キュー済みの映画とポスター無しの映画を除外
 */
import {
  fetchDirected,
  fetchDiscover,
  fetchMovieFull,
  fetchRecommended,
  fetchSimilar,
} from "@/lib/client";
import { findDecade, type Filters, type Movie } from "@/types/movie";

const BATCH_SIZE = 20;
const SIMILAR_RATIO = 0.4;
const MAX_ATTEMPTS = 3;
/** discover 側の vote_count.gte と揃える（類似映画APIはこの条件を指定できない） */
const MIN_VOTES = 20;

/** 似た映画の候補。同じ監督の作品なら監督名を持つ */
export type Candidate = {
  movie: Movie;
  director?: string;
};

/** いいね直後の差し込みで使わなかった候補。次のバッチの「似た映画」枠で優先して使う */
export type PoolEntry = Candidate & {
  /** きっかけになったいいね映画 */
  seedId: number;
  seedTitle: string;
};

export type Batch = {
  movies: Movie[];
  /** 条件に合う映画が1件も存在しない */
  empty: boolean;
  mock: boolean;
};

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function matchesFilters(m: Movie, filters: Filters) {
  if (m.vote_count < MIN_VOTES) return false;
  const decade = findDecade(filters.decade);
  if (decade && !(m.release_date >= decade.from && m.release_date <= decade.to)) return false;
  if (filters.genres.length && !m.genre_ids.some((g) => filters.genres.includes(g))) return false;
  return true;
}

export function filtersToParams(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.genres.length) params.set("genres", filters.genres.join(","));
  if (filters.decade) params.set("decade", filters.decade);
  if (filters.matchAll) params.set("match", "all");
  return params;
}

/**
 * 似た映画を2つの TMDB API から取って交互に混ぜる。
 * - recommendations: 「これを好きな人はこれも好き」寄り（品質が高めなので先頭に置く）
 * - similar: キーワード・ジャンルが近い作品
 * どちらかが失敗・空でも、もう片方だけで続行する。
 */
async function fetchLikeAlikes(seedId: number, page: number): Promise<Movie[]> {
  const [rec, sim] = await Promise.all([
    fetchRecommended(seedId, page).catch(() => null),
    fetchSimilar(seedId, page).catch(() => null),
  ]);
  const a = rec?.results ?? [];
  const b = sim?.results ?? [];
  const seen = new Set<number>();
  const merged: Movie[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    for (const m of [a[i], b[i]]) {
      if (m && !seen.has(m.id)) {
        seen.add(m.id);
        merged.push(m);
      }
    }
  }
  return merged;
}

/** いいねした映画の監督と、その監督の他の作品（キャストは使わない） */
async function fetchDirectorWorks(seedId: number): Promise<{ name: string; movies: Movie[] } | null> {
  try {
    // 詳細はスワイプ時に先読み済みなので、通常は追加の通信なしで取れる
    const full = await fetchMovieFull(seedId);
    const director = full.credits.crew.find((c) => c.job === "Director");
    if (!director) return null;
    const res = await fetchDirected(director.id);
    return { name: director.name, movies: res.results };
  } catch {
    return null;
  }
}

async function fetchSimilarFor(likedIds: number[], filters: Filters): Promise<Movie[]> {
  if (!likedIds.length) return [];
  const seed = likedIds[Math.floor(Math.random() * likedIds.length)];
  // 上位ばかりにならないよう、先頭数ページからランダムに選ぶ
  const page = 1 + Math.floor(Math.random() * 3);
  let movies = await fetchLikeAlikes(seed, page);
  if (!movies.length && page > 1) movies = await fetchLikeAlikes(seed, 1);
  // フィルター条件は似た映画にも適用する（取れなくても discover だけで続行できる）
  return movies.filter((m) => matchesFilters(m, filters));
}

/** 同じジャンルの組み合わせを持つ映画（類似映画APIにデータが無い作品の代替） */
const GENRE_MATCH_LIMIT = 2;

/**
 * いいね直後に差し込む似た映画。
 * - 同じ監督の作品があれば1本はそれにする（理由がはっきりしていて刺さりやすい）
 * - 残りは似ている順の上位10本からランダムに選ぶので、すぐに「好みが効いた」と感じられる
 * - 新作やマイナー作品は似た映画が空のことが多いので、その場合は同ジャンル検索で補う
 * 選ばなかった候補は rest として返し、呼び出し側で候補プールに貯める。
 */
export async function fetchSimilarPicks(opts: {
  seed: Movie;
  filters: Filters;
  excludeIds: Set<number>;
  count: number;
}): Promise<{ picks: Candidate[]; rest: Candidate[] }> {
  const { seed, filters, excludeIds, count } = opts;
  const usable = (m: Movie) =>
    !!m.poster_path && m.id !== seed.id && !excludeIds.has(m.id) && matchesFilters(m, filters);

  const [alikes, director] = await Promise.all([
    fetchLikeAlikes(seed.id, 1),
    fetchDirectorWorks(seed.id),
  ]);
  let candidates = alikes.filter(usable);
  const directed: Candidate[] = (director?.movies ?? [])
    .filter(usable)
    .map((movie) => ({ movie, director: director!.name }));

  if (candidates.length + directed.length < count && seed.genre_ids.length) {
    try {
      const res = await fetchDiscover(
        filtersToParams({
          genres: seed.genre_ids.slice(0, GENRE_MATCH_LIMIT),
          decade: filters.decade,
          matchAll: true,
        }),
      );
      const known = new Set(candidates.map((m) => m.id));
      candidates = [...candidates, ...res.results.filter((m) => usable(m) && !known.has(m.id))];
    } catch {
      // 差し込みは諦めて通常のキューで続行
    }
  }

  const directedIds = new Set(directed.map((c) => c.movie.id));
  const alike: Candidate[] = candidates
    .filter((m) => !directedIds.has(m.id))
    .map((movie) => ({ movie }));

  // 監督作から1本 + 似ている順の上位10本から残りを選び、足りなければ監督作で埋める
  const shuffledDirected = shuffle(directed);
  const picks = [
    ...shuffledDirected.slice(0, 1),
    ...shuffle(alike.slice(0, 10)),
    ...shuffledDirected.slice(1),
  ].slice(0, count);
  const picked = new Set(picks.map((c) => c.movie.id));
  return {
    picks,
    rest: [...alike, ...directed].filter((c) => !picked.has(c.movie.id)),
  };
}

export async function fetchRecommendations(opts: {
  filters: Filters;
  likedIds: number[];
  excludeIds: Set<number>;
  /** 候補プール。「似た映画」枠はここから優先して埋める */
  pool?: Movie[];
}): Promise<Batch> {
  const { filters, likedIds, excludeIds, pool = [] } = opts;
  const usable = (m: Movie) => !!m.poster_path && !excludeIds.has(m.id);
  const similarTarget = Math.round(BATCH_SIZE * SIMILAR_RATIO);
  const fromPool = shuffle(pool.filter(usable)).slice(0, similarTarget);
  // プールだけで枠が埋まるなら類似映画APIは呼ばない
  const needSimilar = fromPool.length < similarTarget;

  let mock = false;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const [discover, similar] = await Promise.all([
      fetchDiscover(filtersToParams(filters)),
      needSimilar ? fetchSimilarFor(likedIds, filters) : Promise.resolve([]),
    ]);
    mock = !!discover.mock;
    if (discover.total_pages === 0) return { movies: [], empty: true, mock };

    const inPool = new Set(fromPool.map((m) => m.id));
    const similarPicked = [
      ...fromPool,
      ...shuffle(similar.filter((m) => usable(m) && !inPool.has(m.id))),
    ].slice(0, similarTarget);
    const seen = new Set(similarPicked.map((m) => m.id));
    const discoverPicked = shuffle(discover.results.filter((m) => usable(m) && !seen.has(m.id)))
      .slice(0, BATCH_SIZE - similarPicked.length);

    const movies = shuffle([...discoverPicked, ...similarPicked]);
    // 全部表示済みのページを引いた場合は別のランダムページで再試行
    if (movies.length) return { movies, empty: false, mock };
  }
  return { movies: [], empty: false, mock };
}
