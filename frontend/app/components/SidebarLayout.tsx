"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

import { API_BASE as API } from "../../lib/config";

// 企業コンテキスト（全画面から選択中企業にアクセス可能に）
interface Company {
  id: string;
  legal_name: string;
  trade_name: string | null;
  capital_stock: number;
  industry_code: string;
  head_office_prefecture: string;
}

interface CompanyContextType {
  companies: Company[];
  selected: Company | null;
  setSelected: (c: Company) => void;
}

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  selected: null,
  setSelected: () => {},
});

export function useCompany() {
  return useContext(CompanyContext);
}

// SVGアイコン
const icons: Record<string, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  archive: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  building: "M3 21h18M3 7v14M9 3v18M15 3v18M21 7v14M6 7h.01M6 11h.01M6 15h.01M12 7h.01M12 11h.01M12 15h.01M18 11h.01M18 15h.01",
  plus: "M12 5v14M5 12h14",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  clock: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  help: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  sparkles: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1m-1.636 6.364l-.707-.707M12 21v-1m-6.364-1.636l.707-.707M3 12h1m1.636-6.364l.707.707M12 8a4 4 0 110 8 4 4 0 010-8z",
  cash: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  trending: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
};

// ナビゲーション
const mainNav = [
  { href: "/", label: "ダッシュボード", icon: "grid" },
  { href: "/company", label: "統合企業カルテ (DNA)", icon: "building" },
  { href: "/subsidies", label: "補助金を探す", icon: "search" },
  { href: "/subsidies/favorites", label: "お気に入り補助金", icon: "sparkles" },
  { href: "/ai-planner", label: "AI事業計画書生成", icon: "edit" },
  { href: "/documents/cabinet", label: "e-Cabinet (書類管理)", icon: "archive" },
  { href: "/simulation/cashflow", label: "資金繰りシミュレーター", icon: "cash" },
  { href: "/roadmap", label: "戦略的加点ロードマップ", icon: "trending" },
  { href: "/applications", label: "マイ申請案件", icon: "archive" },
  { href: "/timeline", label: "採択トレンド分析", icon: "clock" },
];

const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "管理者ダッシュボード", icon: "settings" },
  { href: "/admin/invitations", label: "ユーザー招待管理", icon: "plus" },
  { href: "/admin/users", label: "ユーザー承認管理", icon: "shield" },
  { href: "/settings", label: "設定", icon: "settings" },
];

const toolsNav = [
  { href: "/guide", label: "使い方ガイド (マニュアル)", icon: "help" },
  { href: "/terms", label: "用語辞書", icon: "book" },
  { href: "/admin/knowledge", label: "AIナレッジ管理 (RAG)", icon: "book" },
  { href: "/admin", label: "管理者レビュー", icon: "shield" },
];

const legalNav = [
  { href: "/legal/terms", label: "利用規約", icon: "book" },
  { href: "/legal/privacy", label: "プライバシーポリシー", icon: "shield" },
  { href: "/legal/commercial", label: "特定商取引法に基づく表記", icon: "building" },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (status === "unauthenticated") {
      setCompanies([]);
      setSelected(null);
      return;
    }

    // 承認制ガードロジック
    if (status === "authenticated" && session?.user) {
      const isApproved = (session.user as any)?.is_approved;
      const role = (session.user as any)?.role;
      
      // 未承認ユーザーが制限対象ページにいる場合、リダイレクト
      // /waiting-approval 自体や、ログインページ(もしあれば)は除外
      const isPublicPath = 
        pathname === "/waiting-approval" || 
        pathname === "/guide" || 
        pathname === "/terms" || 
        pathname.startsWith("/legal");
      
      const isAdminPath = pathname.startsWith("/admin");

      if (!isApproved && role !== "admin" && !isPublicPath) {
        router.push("/auth/login");
      }
      
      // 管理者以外が管理者用ページにアクセスした場合のガード
      if (isAdminPath && role !== "admin") {
        router.push("/");
      }
    }
    
    async function loadCompanies() {
      try {
        const userId = (session?.user as any)?.id;
        if (userId) {
          const res = await fetch(`${API}/companies/?user_id=${userId}`);
          if (res.ok) {
            const data = await res.json();
            setCompanies(data);
            if (data.length > 0) setSelected(data[0]);
          }
        }
      } catch (e) {
        console.error("SidebarLayout Error:", e);
      }
    }

    if (status === "authenticated" && session?.user) {
      loadCompanies();
    }
  }, [session, status, pathname, router]);

  const isAdmin = (session?.user as any)?.role === "admin";

  // ログイン画面と承認待ち画面ではサイドバーを出さない
  const isAuthPage = pathname === "/auth/login";
  const isWaitingPage = pathname === "/waiting-approval";
  const isNoLayoutPage = isAuthPage || isWaitingPage;

  if (!mounted) return null;

  if (isNoLayoutPage) {
    return (
      <CompanyContext.Provider value={{ companies, selected, setSelected }}>
        <main className="main-content-no-sidebar" style={{ width: '100vw', padding: 0 }}>
          {children}
        </main>
      </CompanyContext.Provider>
    );
  }

  return (
    <CompanyContext.Provider value={{ companies, selected, setSelected }}>
      <div className="app-layout">
        {/* モバイルヘッダー */}
        <header className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="メニューを開く">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="mobile-header-title">SubsidyNavi</span>
          {session?.user?.image ? (
            <img src={session.user.image} alt="" className="mobile-header-avatar" />
          ) : (
            <div className="mobile-header-avatar" style={{ background: "var(--color-primary-light)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
              {session?.user?.name?.charAt(0) || "?"}
            </div>
          )}
        </header>

        {/* モバイルオーバーレイ */}
        {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />}

        <aside className={`sidebar ${isMobileMenuOpen ? "sidebar-open" : ""}`}>
          {/* モバイル閉じるボタン */}
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="メニューを閉じる">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* ロゴ */}
          <div className="sidebar-logo">
            <h1>SubsidyNavi</h1>
            <p>補助金検索・申請プラットフォーム</p>
          </div>

          {/* 企業セレクタ */}
          <div className="company-selector">
            <div
              className="company-selector-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {selected ? (
                <>
                  <div className="company-avatar">
                    {(selected.trade_name || selected.legal_name).charAt(0)}
                  </div>
                  <div className="company-info">
                    <div className="company-name">{selected.trade_name || selected.legal_name}</div>
                    <div className="company-meta">
                      {(selected.capital_stock / 10000).toLocaleString()}万円
                    </div>
                  </div>
                  <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </>
              ) : (
                <div className="company-info">
                  <div className="company-name" style={{ opacity: 0.5 }}>企業未選択</div>
                </div>
              )}
            </div>

            {/* 企業ドロップダウン */}
            {isDropdownOpen && (
              <div className="company-dropdown">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    className={`company-dropdown-item ${selected?.id === c.id ? "active" : ""}`}
                    onClick={() => {
                      setSelected(c);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="company-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                      {(c.trade_name || c.legal_name).charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.trade_name || c.legal_name}</div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{c.legal_name}</div>
                    </div>
                  </div>
                ))}
                <a href="/company/new" className="company-dropdown-add">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={icons.plus} />
                  </svg>
                  企業を追加
                </a>
              </div>
            )}
          </div>

          {/* ナビゲーション */}
          <ul className="sidebar-nav">
            <li className="sidebar-section-title">MAIN</li>
            {mainNav.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icons[item.icon]} />
                  </svg>
                  {item.label}
                </a>
              </li>
            ))}
            <li className="sidebar-section-title">TOOLS</li>
            {toolsNav
              .filter(item => !item.href.includes("admin") || isAdmin)
              .map((item) => (
              <li key={item.href}>
                <a href={item.href}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icons[item.icon]} />
                  </svg>
                  {item.label}
                </a>
              </li>
            ))}
            
            <li className="sidebar-section-title">SUPPORT / LEGAL</li>
            {legalNav.map((item) => (
              <li key={item.href}>
                <a href={item.href}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icons[item.icon]} />
                  </svg>
                  {item.label}
                </a>
              </li>
            ))}

            {isAdmin && (
              <>
                <li className="sidebar-section-title">ADMINISTRATION</li>
                {ADMIN_NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={icons[item.icon]} />
                      </svg>
                      {item.label}
                    </a>
                  </li>
                ))}
              </>
            )}
          </ul>

          {/* サイドバーフッター: ユーザー情報 & 企業数 */}
          <div className="sidebar-footer">
            {session?.user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                {session.user.image ? (
                  <img src={session.user.image} alt="Profile" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-primary-light)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.email}</div>
                </div>
                <button 
                  onClick={() => signOut()} 
                  style={{ background: "transparent", border: "none", cursor: "pointer", opacity: 0.6, padding: 4 }}
                  title="ログアウト"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button 
                  className="btn btn-primary btn-google-login" 
                  style={{ width: "100%", justifyContent: "center", background: "linear-gradient(135deg, #6366f1, #a855f7)", border: "none" }}
                  onClick={() => router.push("/auth/login")}
                >
                  プレミアムログイン
                </button>
              </div>
            )}
            
            <div style={{ fontSize: 11, opacity: 0.4, textAlign: "center", marginTop: 8 }}>登録企業: {companies.length}社</div>
          </div>
        </aside>

        <main className="main-content">
          {children}
        </main>
      </div>
    </CompanyContext.Provider>
  );
}
