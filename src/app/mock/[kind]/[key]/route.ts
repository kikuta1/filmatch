import type { NextRequest } from "next/server";
import { mockImageSvg } from "@/lib/mock";

// ダミーデータ用のポスター・スチル画像（SVG）
export async function GET(_req: NextRequest, ctx: RouteContext<"/mock/[kind]/[key]">) {
  const { kind, key } = await ctx.params;
  const svg = mockImageSvg(kind, key);
  if (!svg) return new Response("Not Found", { status: 404 });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
