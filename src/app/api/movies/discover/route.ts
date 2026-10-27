import type { NextRequest } from "next/server";
import { handleError, jsonError, parseFilters, parsePage } from "@/lib/api";
import { discoverMovies } from "@/lib/tmdb";

// GET /api/movies/discover?genres=28,12&decade=2020s&page=3
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const filters = parseFilters(params);
  const page = parsePage(params.get("page"));
  if (!filters || page === undefined) return jsonError(400, "パラメータが不正です");

  try {
    return Response.json(await discoverMovies(filters, page));
  } catch (e) {
    return handleError(e);
  }
}
