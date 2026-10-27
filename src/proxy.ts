import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * /api/* の前段で CORS 制御と Rate Limiting を行う。
 *   外部ブラウザ → CORS拒否（自ドメイン以外の Origin ヘッダー）
 *   curl/bot    → Rate Limiting（120回/分/IP 超過で 429）
 */
export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, req)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const result = rateLimit(clientIp(req));
  if (!result.ok) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。少し待ってから再度お試しください" },
      {
        status: 429,
        headers: { ...corsHeaders(origin), "Retry-After": String(result.retryAfterSec) },
      },
    );
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(corsHeaders(origin))) res.headers.set(k, v);
  res.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return res;
}

export const config = {
  matcher: "/api/:path*",
};

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function isAllowedOrigin(origin: string, req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const allowed = new Set([
    req.nextUrl.origin,
    ...(host ? [`${proto}://${host}`] : []),
    ...(process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ]);
  if (process.env.NODE_ENV !== "production") allowed.add("http://localhost:3000");
  return allowed.has(origin);
}

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
