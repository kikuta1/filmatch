import { connection } from "next/server";
import { handleError } from "@/lib/api";
import { getGenres } from "@/lib/tmdb";

// GET /api/movies/genres
export async function GET() {
  // APIキーの有無は実行時に判定したいので、ビルド時のプリレンダーを避ける
  await connection();
  try {
    return Response.json({ genres: await getGenres() });
  } catch (e) {
    return handleError(e);
  }
}
