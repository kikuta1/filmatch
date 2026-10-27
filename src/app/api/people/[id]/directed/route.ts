import type { NextRequest } from "next/server";
import { handleError, jsonError, parseId } from "@/lib/api";
import { getDirectedMovies } from "@/lib/tmdb";

// GET /api/people/{id}/directed → その人が監督した映画
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/people/[id]/directed">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(400, "パラメータが不正です");

  try {
    const res = await getDirectedMovies(id);
    if (!res) return jsonError(404, "人物が見つかりません");
    return Response.json(res);
  } catch (e) {
    return handleError(e);
  }
}
