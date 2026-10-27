/**
 * TMDB_API_KEY 未設定時に使うダミーデータ。
 * 架空の映画を決定的に生成するので、キーなしでも UI の動作確認ができる。
 */
import {
  DECADES,
  GENRES,
  GENRE_NAME,
  type Filters,
  type Movie,
  type MovieFull,
  type MovieListResponse,
} from "@/types/movie";

const PAGE_SIZE = 20;
const MOVIE_COUNT = 240;
const STILLS_PER_MOVIE = 6;

const TITLE_HEADS = [
  "真夜中の", "最後の", "静かな", "青い", "遠い", "眠らない", "名もなき", "東京の",
  "砂漠の", "雨の", "硝子の", "さよなら、", "はじまりの", "沈黙の", "黄金の", "嘘つきの",
];
const TITLE_TAILS = [
  "航路", "約束", "灯台", "逃亡者", "楽園", "記憶", "銀河", "交差点",
  "怪物", "夏", "探偵", "ワルツ", "迷宮", "共犯者", "パレード",
];
const NAMES = [
  "佐藤 遥", "Alex Turner", "鈴木 蓮", "Marie Laurent", "高橋 湊", "Chen Wei",
  "田中 結衣", "Lucas Silva", "伊藤 陽翔", "Emma Novak", "渡辺 葵", "Omar Haddad",
];
const COUNTRIES = [
  { iso_3166_1: "JP", name: "日本" },
  { iso_3166_1: "US", name: "アメリカ" },
  { iso_3166_1: "FR", name: "フランス" },
  { iso_3166_1: "KR", name: "韓国" },
  { iso_3166_1: "GB", name: "イギリス" },
];
const COMPANIES = ["Moonlight Pictures", "Kumo Films", "Northwind Studio", "Blue Harbor"];
const PROVIDERS = ["Netflix", "Amazon Prime Video", "U-NEXT", "Disney+", "Hulu"];
const TAGLINES = [
  "その夜、すべてが動き出した。",
  "忘れられない一日が、ここにある。",
  "真実は、いつも静かに嘘をつく。",
  "世界の果てで、もう一度出会う。",
];

/** 文字列 seed から決定的な乱数列を作る（mulberry32） */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

const MOVIES: Movie[] = Array.from({ length: MOVIE_COUNT }, (_, i) => {
  const id = i + 1;
  const r = rng(id * 7919);
  const decade = pick(r, DECADES);
  const fromYear = Number(decade.from.slice(0, 4));
  const year = decade.id === "older" ? 1950 + Math.floor(r() * 30) : fromYear + Math.floor(r() * 10);
  const genreIds = new Set<number>();
  const genreCount = 1 + Math.floor(r() * 3);
  while (genreIds.size < genreCount) genreIds.add(pick(r, GENRES).id);
  const title = `${pick(r, TITLE_HEADS)}${pick(r, TITLE_TAILS)}`;
  const month = String(1 + Math.floor(r() * 12)).padStart(2, "0");
  return {
    id,
    title,
    original_title: title,
    overview: `${title}をめぐる物語。これは TMDB API キー未設定時に表示されるダミーデータです。`,
    poster_path: `/mock/poster/${id}`,
    backdrop_path: `/mock/still/${id}-0`,
    release_date: `${Math.min(year, 2026)}-${month}-15`,
    genre_ids: [...genreIds],
    vote_average: Math.round((5 + r() * 4) * 10) / 10,
    vote_count: Math.floor(20 + r() ** 3 * 30000),
    popularity: r() * 100,
  };
});

export function getMockMovie(id: number) {
  return MOVIES.find((m) => m.id === id);
}

function paginate(list: Movie[], page: number | null): MovieListResponse {
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const p = page ?? 1 + Math.floor(Math.random() * totalPages);
  const start = (Math.min(p, totalPages) - 1) * PAGE_SIZE;
  return { results: list.slice(start, start + PAGE_SIZE), total_pages: totalPages, mock: true };
}

export function mockDiscover(filters: Filters, page: number | null): MovieListResponse {
  const decade = DECADES.find((d) => d.id === filters.decade);
  const list = MOVIES.filter(
    (m) =>
      (filters.genres.length === 0 ||
        (filters.matchAll
          ? filters.genres.every((g) => m.genre_ids.includes(g))
          : m.genre_ids.some((g) => filters.genres.includes(g)))) &&
      (!decade || (m.release_date >= decade.from && m.release_date <= decade.to)),
  );
  return paginate(list, page);
}

export function mockSimilar(id: number, page: number | null): MovieListResponse {
  const base = getMockMovie(id);
  if (!base) return { results: [], total_pages: 0, mock: true };
  const list = MOVIES.filter(
    (m) => m.id !== id && m.genre_ids.some((g) => base.genre_ids.includes(g)),
  );
  return paginate(list, page ?? 1);
}

export function mockFull(id: number): MovieFull | null {
  const m = getMockMovie(id);
  if (!m) return null;
  const r = rng(id * 104729);
  const person = (pid: number) => ({ id: pid, name: pick(r, NAMES), profile_path: null });
  const providers = PROVIDERS.filter(() => r() < 0.35).map((name, i) => ({
    provider_id: i + 1,
    provider_name: name,
    logo_path: null,
  }));
  return {
    detail: {
      id: m.id,
      title: m.title,
      original_title: m.original_title,
      overview: m.overview,
      tagline: pick(r, TAGLINES),
      poster_path: m.poster_path,
      backdrop_path: m.backdrop_path,
      release_date: m.release_date,
      runtime: 80 + Math.floor(r() * 80),
      genres: m.genre_ids.map((g) => ({ id: g, name: GENRE_NAME.get(g) ?? "" })),
      vote_average: m.vote_average,
      vote_count: m.vote_count,
      budget: Math.floor(r() * 150) * 1_000_000,
      revenue: Math.floor(r() * 600) * 1_000_000,
      production_countries: [pick(r, COUNTRIES)],
      production_companies: [{ id: 1, name: pick(r, COMPANIES), logo_path: null }],
    },
    credits: {
      crew: [{ ...person(1000 + id), job: "Director" }],
      cast: Array.from({ length: 6 }, (_, i) => ({
        ...person(2000 + id * 10 + i),
        character: `役名 ${i + 1}`,
        order: i,
      })),
    },
    images: {
      backdrops: Array.from({ length: STILLS_PER_MOVIE }, (_, i) => ({
        file_path: `/mock/still/${id}-${i}`,
        width: 1280,
        height: 720,
        aspect_ratio: 16 / 9,
      })),
      posters: [],
    },
    watchProviders: providers.length
      ? { link: null, flatrate: providers, rent: [], buy: [] }
      : null,
  };
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** /mock/poster/{id} と /mock/still/{id}-{n} の SVG 画像 */
export function mockImageSvg(kind: string, key: string): string | null {
  const [idStr, nStr = "0"] = key.split("-");
  const movie = getMockMovie(Number(idStr));
  if (!movie) return null;
  const r = rng(movie.id * 31 + Number(nStr) * 977);
  const hue = Math.floor(r() * 360);
  const hue2 = (hue + 40 + Math.floor(r() * 80)) % 360;
  const year = movie.release_date.slice(0, 4);

  if (kind === "poster") {
    const circles = Array.from({ length: 5 }, () => {
      const cx = Math.floor(r() * 500);
      const cy = Math.floor(r() * 750);
      const rad = 40 + Math.floor(r() * 160);
      return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="hsla(${hue2},80%,65%,0.18)"/>`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 750" width="500" height="750">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue},60%,30%)"/><stop offset="1" stop-color="hsl(${hue2},70%,12%)"/>
</linearGradient></defs>
<rect width="500" height="750" fill="url(#g)"/>${circles}
<text x="40" y="560" fill="#fff" font-size="48" font-weight="700" font-family="sans-serif">${escapeXml(movie.title)}</text>
<text x="40" y="610" fill="rgba(255,255,255,0.7)" font-size="26" font-family="sans-serif">${year} · SAMPLE</text>
</svg>`;
  }

  if (kind === "still") {
    const bands = Array.from({ length: 4 }, (_, i) => {
      const y = 200 + i * 120 + Math.floor(r() * 60);
      return `<rect x="0" y="${y}" width="1280" height="${40 + Math.floor(r() * 120)}" fill="hsla(${(hue2 + i * 20) % 360},60%,50%,0.15)"/>`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
<defs><radialGradient id="g" cx="${r()}" cy="${r()}" r="1">
<stop offset="0" stop-color="hsl(${hue2},55%,45%)"/><stop offset="1" stop-color="hsl(${hue},50%,8%)"/>
</radialGradient></defs>
<rect width="1280" height="720" fill="url(#g)"/>${bands}
<text x="48" y="672" fill="rgba(255,255,255,0.55)" font-size="36" font-family="sans-serif">${escapeXml(movie.title)} — scene ${Number(nStr) + 1}</text>
</svg>`;
  }

  return null;
}
