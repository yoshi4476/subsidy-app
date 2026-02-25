import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    }),
    CredentialsProvider({
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "test@example.com" },
      },
      async authorize(credentials) {
        if (credentials?.email === "test@example.com") {
          return { id: "183b5492-9b65-4e22-8360-330b7911c3d8", name: "テスト部長", email: "test@example.com" };
        }
        return null;
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
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
        return true;
      } catch (e) {
        console.error("ユーザー登録エラー:", e);
        return true; // ログイン自体は許可（デバッグ・運用方針次第）
      }
    },
    async session({ session, token }) {
      if (session.user) {
        // トークンからセッションに値を移譲
        (session.user as any).id = token.sub; 
        (session.user as any).role = token.role;
        (session.user as any).is_approved = token.is_approved;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role;
        token.is_approved = (user as any).is_approved;
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only",
});

export { handler as GET, handler as POST };
