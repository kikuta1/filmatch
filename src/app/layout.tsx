import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const DESCRIPTION =
  "縦スワイプで映画を探し、「いいね」から好みを学習して似た作品を届ける Web アプリ。速く、気軽に、おしゃれに。";

// OGP 画像などの絶対 URL の基準。Vercel では本番ドメインが環境変数で渡される
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "FilMatch",
  description: DESCRIPTION,
  applicationName: "FilMatch",
  openGraph: {
    type: "website",
    siteName: "FilMatch",
    title: "FilMatch | 映画を、速く、気軽に、おしゃれに探そう。",
    description: DESCRIPTION,
    locale: "ja_JP",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "FilMatch | 映画を、速く、気軽に、おしゃれに探そう。",
    description: DESCRIPTION,
  },
  // iOS でホーム画面に追加したときに全画面のアプリとして起動する
  appleWebApp: {
    capable: true,
    title: "FilMatch",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1a2e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="h-dvh">{children}</body>
    </html>
  );
}
