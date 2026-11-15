import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Filters, Movie, MovieFull, MovieListResponse } from "@/types/movie";

// TMDB への通信（自前の API Routes 呼び出し）を差し替えて、レコメンドのロジックだけを検証する
vi.mock("@/lib/client", () => ({
  fetchDiscover: vi.fn(),
  fetchSimilar: vi.fn(),
  fetchRecommended: vi.fn(),
  fetchDirected: vi.fn(),
  fetchMovieFull: vi.fn(),
}));

const client = await import("@/lib/client");
const { fetchRecommendations, fetchSimilarPicks } = await import("@/lib/recommend");

const discover = vi.mocked(client.fetchDiscover);
const similar = vi.mocked(client.fetchSimilar);
const recommended = vi.mocked(client.fetchRecommended);
const directed = vi.mocked(client.fetchDirected);
const movieFull = vi.mocked(client.fetchMovieFull);

function movie(id: number, overrides: Partial<Movie> = {}): Movie {
  return {
    id,
    title: `映画${id}`,
    original_title: `Movie ${id}`,
    overview: "",
    poster_path: `/p${id}.jpg`,
    backdrop_path: null,
    release_date: "2015-06-01",
    genre_ids: [18],
    vote_average: 7,
    vote_count: 100,
    popularity: 1,
    ...overrides,
  };
}

const list = (results: Movie[], total_pages = 1): MovieListResponse => ({ results, total_pages });
const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => movie(from + i));
const noFilters: Filters = { genres: [], decade: null };

function withDirector(name: string | null) {
  movieFull.mockResolvedValue({
    credits: { cast: [], crew: name ? [{ id: 7, name, job: "Director", profile_path: null }] : [] },
  } as unknown as MovieFull);
}

beforeEach(() => {
  vi.resetAllMocks();
  similar.mockResolvedValue(list([]));
  recommended.mockResolvedValue(list([]));
  directed.mockResolvedValue(list([]));
  discover.mockResolvedValue(list([]));
  withDirector(null);
});

describe("fetchSimilarPicks（いいね直後の差し込み）", () => {
  const seed = movie(1, { genre_ids: [16, 35, 18] });

  it("同じ監督の作品があれば1本はそれを選び、監督名を理由に付ける", async () => {
    recommended.mockResolvedValue(list(range(100, 5)));
    withDirector("監督A");
    directed.mockResolvedValue(list([movie(200), movie(201)]));

    const { picks, rest } = await fetchSimilarPicks({ seed, filters: noFilters, excludeIds: new Set(), count: 2 });

    expect(picks).toHaveLength(2);
    expect(picks[0].director).toBe("監督A");
    expect([200, 201]).toContain(picks[0].movie.id);
    expect(picks[1].director).toBeUndefined();
    // 選ばなかった候補は全部プール行き
    expect(picks.length + rest.length).toBe(7);
  });

  it("recommendations と similar を重複なく混ぜる", async () => {
    recommended.mockResolvedValue(list([movie(10), movie(11)]));
    similar.mockResolvedValue(list([movie(11), movie(12)]));

    const { picks, rest } = await fetchSimilarPicks({ seed, filters: noFilters, excludeIds: new Set(), count: 2 });
    const ids = [...picks, ...rest].map((c) => c.movie.id).sort();

    expect(ids).toEqual([10, 11, 12]);
  });

  it("いいねした映画自身・表示済み・ポスターなし・レビュー20件未満・条件外は除く", async () => {
    recommended.mockResolvedValue(
      list([
        movie(1),
        movie(20),
        movie(21, { poster_path: null }),
        movie(22, { vote_count: 5 }),
        movie(23, { release_date: "1985-01-01" }),
        movie(24),
      ]),
    );

    const { picks, rest } = await fetchSimilarPicks({
      seed,
      filters: { genres: [], decade: "2010s" },
      excludeIds: new Set([20]),
      count: 2,
    });

    expect([...picks, ...rest].map((c) => c.movie.id)).toEqual([24]);
  });

  it("似た映画が取れないときは、ジャンル上位2つを両方含む映画で補う", async () => {
    discover.mockResolvedValue(list([movie(300), movie(301)]));

    const { picks } = await fetchSimilarPicks({ seed, filters: noFilters, excludeIds: new Set(), count: 2 });

    expect(picks.map((c) => c.movie.id).sort()).toEqual([300, 301]);
    const params = discover.mock.calls[0][0];
    expect(params.get("genres")).toBe("16,35");
    expect(params.get("match")).toBe("all");
  });

  it("API が失敗しても例外を投げず、取れた分だけ返す", async () => {
    recommended.mockRejectedValue(new Error("network"));
    similar.mockResolvedValue(list([movie(40)]));
    movieFull.mockRejectedValue(new Error("network"));

    const { picks } = await fetchSimilarPicks({ seed, filters: noFilters, excludeIds: new Set(), count: 2 });

    expect(picks.map((c) => c.movie.id)).toContain(40);
  });
});

describe("fetchRecommendations（20本ずつのバッチ）", () => {
  it("いいねがなければ discover だけで最大20本", async () => {
    discover.mockResolvedValue(list(range(1, 30), 10));

    const batch = await fetchRecommendations({ filters: noFilters, likedIds: [], excludeIds: new Set() });

    expect(batch.movies).toHaveLength(20);
    expect(similar).not.toHaveBeenCalled();
    expect(recommended).not.toHaveBeenCalled();
  });

  it("候補プールで「似た映画」枠（8本）が埋まれば、似た映画 API を呼ばない", async () => {
    discover.mockResolvedValue(list(range(1, 20), 10));
    const pool = range(500, 10);

    const batch = await fetchRecommendations({
      filters: noFilters,
      likedIds: [99],
      excludeIds: new Set(),
      pool,
    });

    const fromPool = batch.movies.filter((m) => m.id >= 500);
    expect(fromPool).toHaveLength(8);
    expect(batch.movies).toHaveLength(20);
    expect(similar).not.toHaveBeenCalled();
    expect(recommended).not.toHaveBeenCalled();
  });

  it("プールが足りなければ似た映画 API で補う", async () => {
    discover.mockResolvedValue(list(range(1, 20), 10));
    recommended.mockResolvedValue(list(range(700, 10)));

    const batch = await fetchRecommendations({
      filters: noFilters,
      likedIds: [99],
      excludeIds: new Set(),
      pool: range(500, 3),
    });

    expect(batch.movies.filter((m) => m.id >= 500 && m.id < 600)).toHaveLength(3);
    expect(batch.movies.filter((m) => m.id >= 700)).toHaveLength(5);
    expect(recommended).toHaveBeenCalled();
  });

  it("表示済みの映画は出さない", async () => {
    discover.mockResolvedValue(list(range(1, 5), 10));

    const batch = await fetchRecommendations({
      filters: noFilters,
      likedIds: [],
      excludeIds: new Set([1, 2]),
    });

    expect(batch.movies.map((m) => m.id).sort()).toEqual([3, 4, 5]);
  });

  it("条件に合う映画が1件もなければ empty を返す", async () => {
    discover.mockResolvedValue(list([], 0));

    const batch = await fetchRecommendations({ filters: noFilters, likedIds: [], excludeIds: new Set() });

    expect(batch).toMatchObject({ movies: [], empty: true });
  });
});
