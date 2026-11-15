export type Genre = {
  id: number;
  name: string;
};

/** discover / similar の一覧で返る映画 */
export type Movie = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
};

export type MovieDetail = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: Genre[];
  vote_average: number;
  vote_count: number;
  budget: number;
  revenue: number;
  production_countries: { iso_3166_1: string; name: string }[];
  production_companies: { id: number; name: string; logo_path: string | null }[];
};

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
};

export type CrewMember = {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
};

export type MovieCredits = {
  cast: CastMember[];
  crew: CrewMember[];
};

export type MovieImage = {
  file_path: string;
  /** 文字入り画像の言語。null は文字なし（純粋な場面写真） */
  iso_639_1?: string | null;
  width: number;
  height: number;
  aspect_ratio: number;
};

export type MovieImages = {
  backdrops: MovieImage[];
  posters: MovieImage[];
};

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

/** 日本リージョンの配信情報 */
export type WatchProviders = {
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
};

export type MovieFull = {
  detail: MovieDetail;
  credits: MovieCredits;
  images: MovieImages;
  watchProviders: WatchProviders | null;
};

export type MovieListResponse = {
  results: Movie[];
  total_pages: number;
  /** TMDB_API_KEY 未設定時はダミーデータを返す */
  mock?: boolean;
};

/** TMDB ジャンルID準拠（日本語ラベル） */
export const GENRES: Genre[] = [
  { id: 28, name: "アクション" },
  { id: 12, name: "アドベンチャー" },
  { id: 16, name: "アニメーション" },
  { id: 35, name: "コメディ" },
  { id: 80, name: "犯罪" },
  { id: 99, name: "ドキュメンタリー" },
  { id: 18, name: "ドラマ" },
  { id: 10751, name: "ファミリー" },
  { id: 14, name: "ファンタジー" },
  { id: 36, name: "歴史" },
  { id: 27, name: "ホラー" },
  { id: 10402, name: "音楽" },
  { id: 9648, name: "ミステリー" },
  { id: 10749, name: "ロマンス" },
  { id: 878, name: "SF" },
  { id: 53, name: "スリラー" },
  { id: 10752, name: "戦争" },
  { id: 37, name: "西部劇" },
];

export const GENRE_NAME = new Map(GENRES.map((g) => [g.id, g.name]));

export const DECADES = [
  { id: "older", label: "1970年以前", from: "1900-01-01", to: "1979-12-31" },
  { id: "1980s", label: "1980s", from: "1980-01-01", to: "1989-12-31" },
  { id: "1990s", label: "1990s", from: "1990-01-01", to: "1999-12-31" },
  { id: "2000s", label: "2000s", from: "2000-01-01", to: "2009-12-31" },
  { id: "2010s", label: "2010s", from: "2010-01-01", to: "2019-12-31" },
  { id: "2020s", label: "2020s", from: "2020-01-01", to: "2029-12-31" },
] as const;

export type DecadeId = (typeof DECADES)[number]["id"];

export function findDecade(id: string | null | undefined) {
  return DECADES.find((d) => d.id === id);
}

export type Filters = {
  genres: number[];
  decade: DecadeId | null;
  /** true ならジャンルをすべて含む映画（AND）。既定はいずれかを含む（OR） */
  matchAll?: boolean;
};
