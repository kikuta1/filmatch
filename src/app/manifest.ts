import type { MetadataRoute } from "next";

// ホーム画面に追加すると、ブラウザの枠なしの全画面アプリとして起動する（PWA）
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FilMatch",
    short_name: "FilMatch",
    description: "縦スワイプで映画を探し、「いいね」から好みを学習する Web アプリ",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a1a2e",
    theme_color: "#1a1a2e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // 主要な図形は中央80%に収めてあるので、丸や角丸で切り抜かれても欠けない
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
