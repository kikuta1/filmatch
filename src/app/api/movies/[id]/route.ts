import type { NextRequest } from "next/server";
import { handleError, jsonError, parseId } from "@/lib/api";
import { getMovieFull } from "@/lib/tmdb";

// GET /api/movies/{id} → detail + credits + images + providers を結合
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/movies/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(400, "パラメータが不正です");

  try {
    const full = await getMovieFull(id);
    if (!full) return jsonError(404, "映画が見つかりません");
    return Response.json(full);
  } catch (e) {
    return handleError(e);
  }
}
