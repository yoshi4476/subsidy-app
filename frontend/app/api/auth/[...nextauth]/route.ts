import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
      checks: ["pkce", "state"],
    }),
    CredentialsProvider({
      name: "Password Login",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (res.ok) {
            const user = await res.json();
            return user;
          }
          return null;
        } catch (e) {
          console.error("Login authorization error:", e);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email?.toLowerCase().trim();
      const SUPER_ADMIN_EMAIL = "y.wakata.linkdesign@gmail.com".toLowerCase();

      // 超強力な先行プロモーション (フロントエンド側でも即座に判定)
      if (email === SUPER_ADMIN_EMAIL) {
        (user as any).role = "admin";
        (user as any).is_approved = true;
      }

      try {
        // バックエンドにユーザー情報を送信してDBに記録/取得
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"}/api/users/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            picture: (user as any).image || (user as any).picture,
          }),
        });
        
        if (res.ok) {
          const dbUser = await res.json();
          // userオブジェクトにDBの情報を付与
          (user as any).id = dbUser.id;
          (user as any).role = dbUser.role;
          (user as any).is_approved = dbUser.is_approved;
        }

        // バックエンドが失敗しても、最高管理者は通す
        if (email === SUPER_ADMIN_EMAIL) {
          (user as any).role = "admin";
          (user as any).is_approved = true;
        }
        return true;
      } catch (e) {
        console.error("ユーザー登録エラー:", e);
        // エラー時も最高管理者は通す
        if (email === SUPER_ADMIN_EMAIL) {
          (user as any).role = "admin";
          (user as any).is_approved = true;
        }
        return true; 
      }
    },
    async session({ session, token }) {
      if (session.user) {
        const email = session.user.email?.toLowerCase().trim();
        const SUPER_ADMIN_EMAIL = "y.wakata.linkdesign@gmail.com".toLowerCase();

        // トークンからセッションに値を移譲
        (session.user as any).id = token.sub; 
        (session.user as any).role = token.role;
        (session.user as any).is_approved = token.is_approved;

        // God Mode 再適用
        if (email === SUPER_ADMIN_EMAIL) {
          (session.user as any).role = "admin";
          (session.user as any).is_approved = true;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role;
        token.is_approved = (user as any).is_approved;
      }

      // God Mode トークンレベル適用
      if (token.email?.toLowerCase().trim() === "y.wakata.linkdesign@gmail.com".toLowerCase()) {
        token.role = "admin";
        token.is_approved = true;
        if (!token.sub) {
          token.sub = "super-admin-fixed-id"; // 固定ID
        }
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only",
});

export { handler as GET, handler as POST };
