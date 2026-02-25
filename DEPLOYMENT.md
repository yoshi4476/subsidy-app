# 【完全保存版】世界一やさしい！補助金システム デプロイ（公開）完全ガイド

「自分のパソコンで作ったシステムを、世界中の人が使えるようにしたい！」  
そんなあなたのための、**挫折させないデプロイ手順書**です。難しい用語は抜きにして、絵を見るように進めていきましょう！🚀

---

## 🗺️ 公開までのロードマップ

1. **GitHub** に預ける（コードの倉庫）
2. **Render** で動かす（システムの脳：バックエンド）
3. **Vercel** で表示する（システムの顔：フロントエンド）
4. **Google** と連携する（ログインの鍵）

---

## 📦 Step 1: GitHub にコードをアップロード

まずは、あなたのコードをインターネット上の安全な倉庫（GitHub）に預けます。

1. [GitHub](https://github.com/) で「New」ボタンを押し、リポジトリ名に `subsidy-navi` と入力して作成します。
2. 自分のPCの黒い画面（ターミナル）で、1行ずつ魔法の呪文を唱えてください：
   ```bash
   git init
   git add .
   git commit -m "公開準備完了！"
   git remote add origin https://github.com/[GitHubのユーザー名]/subsidy-navi.git
   git push -u origin main
   ```
   _※「Username」や「Password (Token)」を聞かれたら入力してください。_

---

## 🐍 Step 2: バックエンドを Render で動かす

「脳」となるバックエンドを、[Render](https://render.com/) というサービスで動かします。

### 設定のやり方

1. Renderにログインして **[New] → [Web Service]** をクリック。
2. さっきの GitHub リポジトリを選んで、以下のように入力します：

| 設定項目           | 入れるべき文字                                 |
| :----------------- | :--------------------------------------------- |
| **Name**           | `subsidy-backend`                              |
| **Root Directory** | `backend`                                      |
| **Runtime**        | `Python`                                       |
| **Build Command**  | `pip install -r requirements.txt`              |
| **Start Command**  | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

3. **[Environment Variables] (環境変数)** を追加します：
   - `GOOGLE_API_KEY`: 自分の Gemini API キー
   - `CORS_ORIGINS`: `*` (一旦星マークでOK)

> [!IMPORTANT]
> **データベースについて**:
> 無料枠の SQLite は、サーバーが休むとデータが消えてしまいます。  
> データを消したくない場合は、Render の **[New] → [PostgreSQL]** でデータベースを作成し、発行された URL を `DATABASE_URL` という名前で環境変数に追加してください。

---

## ⚛️ Step 3: フロントエンドを Vercel で表示する

「顔」となるフロントエンドを、[Vercel](https://vercel.com/) で表示します。

### 設定のやり方

1. Vercelにログインして **[Add New] → [Project]** をクリック。
2. GitHub リポジトリを選んで、以下の設定をします：

| 設定項目             | 入れるべき文字 |
| :------------------- | :------------- |
| **Root Directory**   | `frontend`     |
| **Framework Preset** | `Next.js`      |

3. **[Environment Variables]** を開き、大切な 4 つの設定を入力します：
   - `NEXT_PUBLIC_API_URL`: Render の URL に `/api` を付けたもの
     - 例: `https://subsidy-backend.onrender.com/api`
   - `NEXTAUTH_URL`: 自分の Vercel サイトの URL
   - `NEXTAUTH_SECRET`: `abcde12345` のような適当な英数字
   - `GOOGLE_CLIENT_ID`: Googleで取得した ID
   - `GOOGLE_CLIENT_SECRET`: Googleで取得した シークレット

---

## 🔑 Step 4: Google ログインを有効にする

最後に、Google Cloud Console で「この新しいサイトからのログインを許可します」という設定をします。

1. **[承認済みの JavaScript オリジン]** に Vercel の URL を追加。
   - `https://[あなたのサイト名].vercel.app`
2. **[承認済みのリダイレクト URI]** に以下を追加。
   - `https://[あなたのサイト名].vercel.app/api/auth/callback/google`

---

## 🏆 Step 5: 自分を「管理者」にする

サイトにログインができたら、最後に自分を「管理者」に認定して終了です！

Render の **[Shell]** タブを開き、以下のコマンドを打ち込んでください：

```bash
python fix_admin_role_v2.py --email [あなたのGoogleメールアドレス]
```

---

## 📝 困ったときのチェックリスト

- [ ] Render の URL は間違っていない？（最後に `/api` を付けるのを忘れずに！）
- [ ] Google Cloud のリダイレクト URI は一文字も間違えずに登録した？
- [ ] 環境変数を保存した後、サービスを再起動（Deploy）した？

**おめでとうございます！これで世界中のどこからでも、あなたの補助金システムにアクセスできるようになりました！🌈**
