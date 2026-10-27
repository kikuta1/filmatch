export type ImageSize = "w185" | "w342" | "w500" | "w780" | "w1280" | "original";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

/** API はパスのみ返すので、画像URLの組み立てはフロント側で行う */
export function imageUrl(path: string, size: ImageSize) {
  // ダミーデータの画像はローカルの SVG ルートで配信
  if (isMockImage(path)) return path;
  return `${TMDB_IMAGE_BASE}${size}${path}`;
}

function isMockImage(path: string) {
  return path.startsWith("/mock/");
}
