import type { Metadata } from "next";
import "./globals.css";
import SidebarLayout from "./components/SidebarLayout";
import NextAuthProvider from "./components/NextAuthProvider";

export const metadata: Metadata = {
  title: "SubsidyNavi - 補助金検索・申請プラットフォーム",
  description: "中小企業のための補助金マッチング・申請支援システム。最適な補助金を即座に発見し、簡単な入力で申請を完了できます。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextAuthProvider>
          <SidebarLayout>{children}</SidebarLayout>
        </NextAuthProvider>
      </body>
    </html>
  );
}
