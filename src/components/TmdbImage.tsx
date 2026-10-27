import Image, { type ImageProps } from "next/image";
import { imageUrl, type ImageSize } from "@/lib/image";

type Props = Omit<ImageProps, "src"> & { path: string; size: ImageSize };

/**
 * TMDB 画像パスから next/image を描画する。
 * TMDB の CDN はサイズ別の画像を配信しているので、Next.js の画像最適化は通さず直接読み込む
 * （最適化サーバーの負荷・タイムアウトと、Vercel の最適化回数の上限を避けるため）。
 */
export function TmdbImage({ path, size, alt, ...rest }: Props) {
  return <Image src={imageUrl(path, size)} alt={alt} unoptimized {...rest} />;
}
