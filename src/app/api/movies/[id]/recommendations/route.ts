import type { NextRequest } from "next/server";
import { handleError, jsonError, parseId, parsePage } from "@/lib/api";
import { getRecommendedMovies } from "@/lib/tmdb";

// GET /api/movies/{id}/recommendations?page=1
export async function GET(req: NextRequest, ctx: RouteContext<"/api/movies/[id]/recommendations">) {
  const id = parseId((await ctx.params).id);
  const page = parsePage(req.nextUrl.searchParams.get("page"));
  if (!id || page === undefined) return jsonError(400, "パラメータが不正です");

  try {
    return Response.json(await getRecommendedMovies(id, page));
  } catch (e) {
    return handleError(e);
  }
}
