# FilMatch - 要件定義書

## 概要

映画を短時間で気軽に探索できるWebアプリ。TikTok/Shortsのような縦スワイプUIで映画を次々と閲覧し、「いいね」で好みを学習してレコメンドに反映する。
視覚的インパクト（ポスター・スチル画像）を重視し、ドーパミンを刺激するUXを目指す。

| 項目 | 内容 |
|------|------|
| プロダクト名 | FilMatch |
| コンセプト | 映画を短い時間で気軽に探索できるツール |
| キーワード | 速く、気軽に、おしゃれに |
| 想定デバイス | スマホ（ブラウザ）メイン、PCも利用可 |
| 参考プロダクト | https://filmdip.com/ |

---

## 画面構成

### 1. フィルタリング画面（トップ）
- ジャンル選択（複数選択可）
- 年代選択（1970年以前 / 1980s / 1990s / 2000s / 2010s / 2020s）
- 「探索開始」ボタン
- 未選択の場合は全ジャンル・全年代から探索

### 2. メイン探索画面（スワイプ画面）
1画面に1映画を表示。縦スワイプで映画切替、横スワイプでビュー切替。

#### ポスタービュー（デフォルト）
- 映画ポスター画像を大きく表示
- 映画タイトル（公開年）
- 右サイドにアクションバー:
  - いいねボタン（Good）
  - レビュアー数（目アイコン + 数値）
  - 評価平均（星アイコン + 数値）
  - ブックマークボタン（保存）

#### 詳細ビュー（横スワイプで遷移）
- 映画スチル画像を複数表示（グリッドレイアウト）
- 右サイドに同じアクションバー
- 映画情報:
  - 上映時間、ジャンル、公開日
  - 監督・キャスト（プロフィール画像付き）
  - 制作国、配給会社
  - 予算・興行収入
  - キャッチコピー / あらすじ
  - 視聴可能な配信サービス
  - Filmarksページへのリンク

### 3. ライブラリ画面（`/library`）
トップ画面・探索画面右上のボタンから開く。タブで3つを切り替える。
- **いいね**: いいねした映画のポスター一覧（新しい順）。タップで詳細を表示（右スワイプか×で閉じる）
- **保存**: ブックマークした映画のポスター一覧
- **傾向**: いいねした映画から好みを可視化
  - 「◯◯ × ◯◯年代の△△型」という一言まとめ（3本以上いいねで表示）
  - いいね数・平均評価・レビュアー数の中央値
  - 好きなジャンル（横棒グラフ、上位8件）
  - 好きな年代（縦棒グラフ、古い順）
  - レビュアー数の中央値から「隠れた名作ハンター（300未満）/ バランス型 / 話題作派（3000以上）」を判定

---

## 機能要件

### コアインタラクション
- **縦スワイプ**: 次/前の映画を表示（TikTok風アニメーション）
- **横スワイプ**: ポスタービュー <-> 詳細ビュー切替
- **いいね**: 映画にGoodを付ける → レコメンドに反映
- **ブックマーク**: 映画を保存

### レコメンドロジック
- いいねした映画の類似映画が出やすくなる
- 1度表示した映画は再表示しない（セッション内管理、将来はユーザー単位）
- 高いランダム性を維持し、人気映画に偏らないようにする

### Filmarks連携
- MVP: Filmarksページへの検索リンクのみ
- 将来: ダミーAPIインターフェースを用意し、実API公開時に差し替え可能にする

### ログイン機能（将来実装）
- MVP: ログイン不要。ローカルストレージで状態管理
- 将来: 認証追加で過去のいいね・ブックマークをサーバー保存

---

## アーキテクチャ

Next.js 1サーバー構成。API Routes（Route Handlers）をバックエンドとして使用し、フロントとバックを同一プロジェクト内で管理する。

```
ブラウザ (React) → Next.js API Routes → TMDB API
                   ├ APIキーはここだけ（サーバーサイド）
                   ├ Rate Limiting
                   └ CORS制御
```

- クライアントは `/api/movies/...` のみを叩く
- TMDB APIキーはサーバーサイド環境変数（`TMDB_API_KEY`）で管理し、ブラウザに露出しない
- 将来バックエンドを分離したくなった場合、API Routes部分をそのまま別サーバーに切り出せる

---

## フロントエンド

### 技術スタック
| 技術 | 用途 |
|------|------|
| Next.js (App Router) | フレームワーク |
| TypeScript | 言語 |
| Tailwind CSS | スタイリング |
| framer-motion | スワイプアニメーション |
| zustand | 状態管理（いいね・ブックマーク・表示履歴） |
| Noto Sans JP | フォント |

### ディレクトリ構成
```
src/
  app/
    page.tsx              # フィルタリング画面
    explore/
      page.tsx            # メイン探索画面
    layout.tsx            # 共通レイアウト（日本語、スマホ最適化viewport）
    globals.css           # ダークテーマベースのグローバルスタイル
  components/
    FilterForm.tsx        # ジャンル・年代選択UI
    SwipeContainer.tsx    # 縦スワイプ（映画切替）+ 横スワイプ（ビュー切替）制御
    MovieCard.tsx         # ポスタービュー（ポスター大表示 + 背景ブラー）
    MovieDetail.tsx       # 詳細ビュー（スチル画像グリッド + 全映画情報）
    ActionBar.tsx         # いいね・レビュー数・評価・ブックマーク
  lib/
    tmdb.ts               # TMDB APIクライアント（API Routes から呼び出し）
    recommend.ts          # レコメンドロジック（discover + similar映画ミックス）
    filmarks.ts           # Filmarksダミー API + 検索URL生成
  store/
    history.ts            # Zustand永続化ストア（seen / liked / bookmarked）
  types/
    movie.ts              # 型定義 + ジャンル・年代定数
```

### 画面詳細

#### フィルタリング画面 (`/`)
- ジャンルはTMDBジャンルID準拠（日本語ラベル）のチップ型ボタン（複数選択可）
- 年代はチップ型ボタン（単一選択）
- 「探索開始」押下でクエリパラメータ付きで `/explore` へ遷移

#### 探索画面 (`/explore`)
- `SwipeContainer` がクエリパラメータからフィルター条件を受け取り映画キューを管理
- 縦スワイプ: framer-motionの`drag="y"`でジェスチャー検知、閾値超えで次/前の映画へ
- 横スワイプ: `drag="x"`で詳細ビューとポスタービューを切替
- 画面上部にカウンター表示 (`1 / 20`) + スワイプヒント

### 状態管理
- **表示済みID** (`seenMovieIds`): 再表示防止用。Set型
- **いいね済みID** (`likedMovieIds`): レコメンド入力 + UI表示用。Set型
- **ブックマーク済みID** (`bookmarkedMovieIds`): 保存機能用。Set型
- すべてローカルストレージに永続化（zustand persist middleware）
- Set型はJSON変換時にArray化して保存、読込時にSet復元

### パフォーマンス
- 映画キューの残りが3件以下になったら自動プリフェッチ
- ポスター画像: `w500` サイズ（スマホに最適）
- 背景ブラー用画像: `w342`（低解像度で軽量）
- スチル画像: `w780`〜`w1280`
- `<Image unoptimized>` + lazy loading。TMDB の CDN がサイズ別に配信しているので Next.js の画像最適化は通さない（最適化サーバーのタイムアウトと Vercel の最適化回数上限を避けるため）

### デザイン
- ダークテーマベース（背景: `#1a1a2e`、カード: `#16213e`）
- アクセントカラー: `#e94560`（赤系）
- スクロールバー非表示
- `overflow: hidden` でページ全体のスクロール防止
- アクションボタンは丸型、アクティブ時にシャドウ付き

---

## バックエンド

### 構成
Next.js API Routes（Route Handlers）でTMDB APIへのプロキシを提供する。

| 項目 | 内容 |
|------|------|
| ランタイム | Next.js Route Handlers (Node.js) |
| データソース | TMDB API v3 |
| APIキー管理 | サーバーサイド環境変数 `TMDB_API_KEY`（ブラウザ非公開） |
| データ永続化 | ローカルストレージ（zustand persist）※将来DB化 |

### API Routes ディレクトリ構成
```
src/app/api/
  movies/
    discover/
      route.ts            # GET /api/movies/discover?genres=28,12&decade=2020s&page=3
    [id]/
      route.ts            # GET /api/movies/{id} → detail + credits + images + providers を結合
      similar/
        route.ts          # GET /api/movies/{id}/similar
    genres/
      route.ts            # GET /api/movies/genres
    [id]/recommendations/
      route.ts            # GET /api/movies/{id}/recommendations
  people/
    [id]/directed/
      route.ts            # GET /api/people/{id}/directed → その人の監督作（レビュアー数順）
```

### APIエンドポイント仕様

#### `GET /api/movies/discover`
フィルター条件に基づく映画一覧を返す。

| パラメータ | 型 | 必須 | 説明 |
|------|------|------|------|
| `genres` | string | No | カンマ区切りのジャンルID（例: `28,12`） |
| `decade` | string | No | 年代（`2020s`, `2010s`, `2000s`, `1990s`, `1980s`, `older`） |
| `page` | number | No | ページ番号（デフォルト: ランダム） |

レスポンス: `{ results: Movie[], total_pages: number }`

#### `GET /api/movies/{id}`
映画の全情報を結合して返す（detail + credits + images + watch providers）。

レスポンス: `{ detail: MovieDetail, credits: MovieCredits, images: MovieImages, watchProviders: WatchProviders | null }`

#### `GET /api/movies/{id}/similar`
類似映画の一覧を返す。

レスポンス: `{ results: Movie[], total_pages: number }`

#### `GET /api/movies/genres`
ジャンル一覧を返す。

レスポンス: `{ genres: Genre[] }`

### TMDB API 呼び出し先
各 API Route から以下の TMDB エンドポイントを呼び出す。共通パラメータ: `language=ja-JP`

| TMDB エンドポイント | 対応する API Route |
|------|------|
| `GET /discover/movie` | `/api/movies/discover` |
| `GET /movie/{id}` | `/api/movies/{id}` |
| `GET /movie/{id}/credits` | `/api/movies/{id}` |
| `GET /movie/{id}/images` | `/api/movies/{id}` |
| `GET /movie/{id}/watch/providers` | `/api/movies/{id}` |
| `GET /movie/{id}/similar` | `/api/movies/{id}/similar` |
| `GET /genre/movie/list` | `/api/movies/genres` |

### 画像配信
TMDB画像CDN (`https://image.tmdb.org/t/p/`) から直接読み込む（Next.js の画像最適化は通さない）。
画像URLの組み立てはフロントエンド側で行う（APIはパスのみ返す）。

| 用途 | サイズ |
|------|------|
| ポスター（メイン） | `w500` |
| ポスター（背景ブラー） | `w342` |
| スチル・バックドロップ | `w780`, `w1280` |
| プロフィール画像 | `w185` |
| 配信サービスロゴ | `w342` |

### セキュリティ

#### APIキー保護
- `TMDB_API_KEY` はサーバーサイド専用環境変数（`NEXT_PUBLIC_` プレフィックスなし）
- ブラウザのDevTools、ソースコード、ネットワークタブのいずれからも取得不可
- API Routes がプロキシとしてTMDBにリクエストを中継

#### Rate Limiting
API Routesにリクエスト制限を設ける。外部からの踏み台利用を防止。

| 設定 | 値 |
|------|------|
| 方式 | IPアドレスベースのスライディングウィンドウ |
| 制限 | 120リクエスト / 分 / IP |
| 超過時レスポンス | `429 Too Many Requests` |
| 実装 | インメモリMap（MVP）。将来はRedis等に置換可 |

```
src/lib/
  rate-limit.ts           # Rate Limiter 実装
```

#### CORS設定
API Routesに許可オリジンを制限するヘッダーを設定。

| ヘッダー | 値 |
|------|------|
| `Access-Control-Allow-Origin` | 自ドメインのみ（本番: デプロイURL、開発: `localhost:3000`） |
| `Access-Control-Allow-Methods` | `GET` |
| `Access-Control-Allow-Headers` | `Content-Type` |

※ ブラウザ以外からの直接アクセス（curl等）はCORSでは防げないため、Rate Limitingと併用

#### セキュリティまとめ
```
外部ブラウザ → CORS拒否（自ドメイン以外のOriginヘッダー）
curl/bot    → Rate Limitingで制限（120回/分/IP超過で429）
正規ユーザー → 正常レスポンス
```

### レコメンドアルゴリズム
フロントエンドからAPI Routesを経由してTMDBデータを取得し、フロントエンド側でミックスする。

1. `/api/movies/discover` でフィルター条件に合う映画をランダムページから取得
2. いいね済み映画がある場合、ランダムに1つ選び似た映画を取得（`/api/movies/{id}/recommendations` と `/api/movies/{id}/similar` を交互に混ぜる）
3. discover結果（60%）と similar結果（40%）をランダムに混合
4. 表示済みIDに含まれる映画を除外
5. ポスター画像がない映画を除外
6. 結果をキューに追加

#### 「似た映画」の候補
| 取得元 | 内容 |
|------|------|
| TMDB `/movie/{id}/recommendations` | 「これを好きな人はこれも好き」寄り。品質が高めなので優先 |
| TMDB `/movie/{id}/similar` | キーワード・ジャンルが近い作品 |
| TMDB `/person/{id}/movie_credits`（監督のみ） | いいねした映画の**監督**の他作品。キャストは使わない |

監督は `/api/movies/{id}` の credits（スワイプ時に先読み済み）から取るので、通常は追加の通信なしで分かる。

#### いいね直後の差し込み
いいねした瞬間に似た映画を2本選び、**2つ先**（次の映画は先読み済みなので、その後ろ）に差し込む。
- 同じ監督の作品があれば1本はそれにし、「◯◯ 監督の別作品」と表示する
- 残りは recommendations + similar の上位10本からランダムに選び、「『◯◯』が好きなあなたに」と表示する
- TMDB の類似映画が空の作品（新作・マイナー作品に多い）は、その映画のジャンル上位2つを両方含む映画（`/api/movies/discover?genres=..&match=all`）で代替する
- 類似映画にも discover と同じ「レビュー20件以上」の足切りを適用する
- 差し込まなかった残り（1回の取得で最大18本程度）は**候補プール**に貯める（上限100本、古い順に破棄）
  - 次のバッチの「似た映画」枠（20本中8本）はプールから優先して埋め、足りない分だけ類似映画APIを呼ぶ。プールで埋まれば類似映画APIは呼ばない
  - プール由来の映画にも「『◯◯』が好きなあなたに」を表示する
  - いいねを取り消すと、その映画由来の候補はプールから外す
  - プールはその探索セッション中だけ保持（ページを離れる・条件を変えると空になる）

※ アルゴリズム自体は軽量（TMDBの類似映画APIをそのまま活用、自前での重い計算なし）

### 将来のバックエンド拡張

| 機能 | 技術候補 |
|------|------|
| 認証 | NextAuth.js / Supabase Auth |
| ユーザーデータ保存 | Supabase / PlanetScale |
| Filmarks連携 | API Routes経由でダミー→実APIに差替 |
| Rate Limiting強化 | Redis（Upstash等） |

将来追加するエンドポイント:
```
POST /api/user/like/{movieId}
POST /api/user/bookmark/{movieId}
GET  /api/user/history
```

---

## MVPスコープ

### 含む
- フィルタリング画面（ジャンル + 年代）
- メイン探索画面（縦スワイプ + 横スワイプ）
- ポスター・スチル画像表示
- いいねボタン + 類似映画レコメンド
- ブックマーク（ローカルストレージ）
- ライブラリ画面（いいね一覧・保存一覧・好みの傾向）
- 表示済み映画の非再表示
- Filmarksページへのリンク
- API Routes によるTMDB APIプロキシ（APIキー隠蔽）
- Rate Limiting（IP単位 120回/分）
- CORS制御

### 含まない（将来実装）
- ログイン / ユーザー認証
- サーバーサイドDB
- Filmarks実API連携
- SNSシェア機能

---

## 環境変数

```
TMDB_API_KEY=your_tmdb_api_key_here
```

`.env.local` に設定（`.env.example` をコピー）。TMDB ( https://www.themoviedb.org/ ) でアカウント作成後、API v3キーを取得。v4 の Read Access Token を入れても動く。
※ `NEXT_PUBLIC_` プレフィックスは付けない（サーバーサイド専用）

**APIキー未設定でも動作する。** その場合は架空映画のダミーデータ（`src/lib/mock.ts`）が返り、探索画面の右上に `DEMO` と表示される。キーを設定してサーバーを再起動すると本番データに切り替わる。

---

## 起動方法

```bash
# Node.js 20 以上
npm install
cp .env.example .env.local   # TMDB_API_KEY を記入（空ならダミーデータ）
npm run dev
```

http://localhost:3000 にアクセス。スマホ実機で確認する場合は同じWi-Fiで `http://<PCのIP>:3000`。

- PC操作: `↑/↓`・ホイールで映画切替、`←/→` でポスター/詳細切替。ポスターのダブルタップでもいいね
- 本番ビルド: `npm run build && npm start`

### 実装メモ
- Next.js 16 を使用。`middleware` は `proxy` に改名されたため、CORS と Rate Limiting は `src/proxy.ts`（`/api/*` に適用）で行う
- `/api/movies/{id}` は TMDB の `append_to_response` で detail・credits・images・watch/providers を1リクエストで取得している
- TMDB へのリクエストは `"use cache"`（Cache Components）で1時間キャッシュ
- `npm run dev` / `build` は `--webpack` 指定。Windows の Smart App Control 環境で Turbopack のネイティブバイナリがブロックされるため。Mac 等なら `--webpack` を外して Turbopack でも動く
