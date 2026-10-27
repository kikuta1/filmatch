/**
 * Filmarks 連携。
 * MVP は検索ページへのリンクのみ。実 API が公開されたら FilmarksClient の実装を差し替える。
 */
export type FilmarksMovie = {
  url: string;
  score: number | null;
  reviewCount: number | null;
};

export interface FilmarksClient {
  findMovie(title: string, year?: string): Promise<FilmarksMovie | null>;
}

export function filmarksSearchUrl(title: string) {
  return `https://filmarks.com/search/movies?q=${encodeURIComponent(title)}`;
}

/** ダミー実装: スコアは持たず、検索URLだけ返す */
export const dummyFilmarksClient: FilmarksClient = {
  async findMovie(title) {
    return { url: filmarksSearchUrl(title), score: null, reviewCount: null };
  },
};
