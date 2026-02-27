# API設定ガイド

本システムを本番環境（Vercel / Railway）で完全に動作させるために必要なAPIと、その設定方法をまとめました。

## 1. 必須API・サービス一覧

| サービス名                | 用途                                 | 取得先                                                                             |
| :------------------------ | :----------------------------------- | :--------------------------------------------------------------------------------- |
| **OpenAI API**            | AIによるマッチング・申請書生成・分析 | [OpenAI Platform](https://platform.openai.com/)                                    |
| **Google Cloud (OAuth)**  | ユーザーログイン（Google連携）       | [Google Cloud Console](https://console.cloud.google.com/)                          |
| **J-Grants API (Public)** | 最新の補助金データの自動同期         | [デジタル庁 開発者サイト](https://developers.digital.go.jp/documents/jgrants/api/) |
| **PostgreSQL (DB)**       | ユーザー情報・企業データ・履歴の保存 | [Railway](https://railway.app/) 等                                                 |

---

## 2. 具体的な設定項目（環境変数）

各プラットフォームの管理画面で、以下の項目を設定してください。

### A. フロントエンド側 (Vercelなど)

| 変数名                 | 内容                               | 設定例                                      |
| :--------------------- | :--------------------------------- | :------------------------------------------ |
| `NEXTAUTH_URL`         | アプリのトップURL                  | `https://your-app.vercel.app`               |
| `NEXTAUTH_SECRET`      | セッション暗号化用のランダム文字列 | (任意の長い文字列)                          |
| `GOOGLE_CLIENT_ID`     | Googleログイン用ID                 | `xxxx.apps.googleusercontent.com`           |
| `GOOGLE_CLIENT_SECRET` | Googleログイン用秘密キー           | `GOCSPX-xxxx`                               |
| `NEXT_PUBLIC_API_URL`  | バックエンドのURL                  | `https://backend-production.up.railway.app` |

### B. バックエンド側 (Railwayなど)

| 変数名            | 内容                      | 設定例                                  |
| :---------------- | :------------------------ | :-------------------------------------- |
| `OPENAI_API_KEY`  | OpenAIのAPIキー           | `sk-xxxx`                               |
| `DATABASE_URL`    | データベース接続文字列    | `postgresql://user:pass@host:port/db`   |
| `JGRANTS_API_KEY` | JグランツAPIキー (※任意)  | `xxxx` (無しでも動作しますが取得を推奨) |
| `CORS_ORIGINS`    | 許可するフロントエンドURL | `https://your-app.vercel.app`           |

---

## 3. 設定のステップ（分かりやすい手順）

### ステップ1：AIの設定 (OpenAI)

1. [OpenAI Platform](https://platform.openai.com/api-keys) でキーを発行します。
2. Railwayの `Variables` 欄に `OPENAI_API_KEY` を貼り付けます。

### ステップ2：ログインの設定 (Google)

1. [Google Cloud Console](https://console.cloud.google.com/) で「有効なAPI：Google People API」を追加します。
2. 「認証情報」から「OAuth 2.0 クライアント ID」を作成します。
3. **承認済みのリダイレクト URI** に `https://(あなたのVercelドメイン)/api/auth/callback/google` を登録してください。
4. 発行された `ID` と `Secret` をVercelに設定します。

### ステップ3：補助金データの接続 (J-Grants)

1. [デジタル庁のサイト](https://developers.digital.go.jp/documents/jgrants/api/) の案内に従い、API利用の手続き（メール送付等が必要な場合があります）を行います。
2. キーを入手したら、Railwayの `JGRANTS_API_KEY` に設定します。

---

> [!TIP]
> **APIキーの取り扱い注意**
> これらのキーは絶対に公開（GitHubのパブリックリポジトリに保存など）しないでください。必ず各プラットフォームの「環境変数（Environment Variables/Secrets）」機能を使って管理してください。
