import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // パブリックパスの定義
  const isPublicPath = 
    path === '/auth/login' || 
    path === '/terms' || 
    path === '/guide' ||
    path.startsWith('/api/auth'); // NextAuthのAPIパス

  if (isPublicPath) {
    return NextResponse.next();
  }

  // セッション（JWTトークン）の取得
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // 1. 未ログインの場合 -> ログイン画面へ
  if (!token) {
    const url = new URL('/auth/login', req.url);
    // 元々行こうとしていたパスを保存（任意）
    // url.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(url);
  }

  // 2. ログイン済みだが承認待ちの場合 -> 承認待ち画面へ
  const isApproved = token.is_approved || token.role === 'admin';
  if (!isApproved && path !== '/waiting-approval') {
    return NextResponse.redirect(new URL('/waiting-approval', req.url));
  }

  return NextResponse.next();
}

// ミドルウェアを適用するパスの指定
export const config = {
  matcher: [
    /*
     * 次のパスを除くすべてのリクエストパスにマッチ:
     * - api (API routes) ※NextAuth用は例外処理済み
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
