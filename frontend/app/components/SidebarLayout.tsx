"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

import { API_BASE as API } from "../../lib/config";

// 企業コンテキスト
interface Company {
  id: string;
  legal_name: string;
  trade_name: string | null;
  capital_stock: number;
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
};

// ナビゲーション構成
const mainNav = [
  { href: "/", label: "ダッシュボード", icon: "grid" },
  { href: "/company", label: "企業カルテ (DNA)", icon: "building" },
  { href: "/subsidies", label: "補助金を探す", icon: "search" },
  { href: "/subsidies/favorites", label: "お気に入り", icon: "sparkles" },
  { href: "/ai-planner", label: "AI事業計画書", icon: "edit" },
  { href: "/applications", label: "マイ申請案件", icon: "archive" },
];

const toolsNav = [
  { href: "/guide", label: "ガイド", icon: "help" },
  { href: "/terms", label: "用語辞書", icon: "book" },
  { href: "/admin/knowledge", label: "AIナレッジ管理", icon: "book" },
  { href: "/admin", label: "管理者レビュー", icon: "shield" },
];

const legalNav = [
  { href: "/settings", label: "設定【すべてのユーザー】", icon: "settings" },
  { href: "/legal/terms", label: "利用規約", icon: "book" },
  { href: "/legal/privacy", label: "プライバシーポリシー", icon: "shield" },
];

const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "管理者ダッシュボード", icon: "grid" },
  { href: "/admin/invitations", label: "ユーザー招待管理", icon: "plus" },
  { href: "/admin/users", label: "ユーザー承認管理", icon: "shield" },
  { href: "/admin/settings", label: "管理者設定【管理者専用】", icon: "settings" },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (status === "unauthenticated") return;
    
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
        console.error("Sidebar Error:", e);
      }
    }
    if (status === "authenticated" && session?.user) loadCompanies();
  }, [session, status]);

  const isAdmin = (session?.user as any)?.role === "admin";
  const isAuthPage = pathname?.startsWith("/auth") || pathname === "/waiting-approval";

  if (!mounted) return null;
  if (isAuthPage) return <main style={{ width: '100vw' }}>{children}</main>;

  return (
    <CompanyContext.Provider value={{ companies, selected, setSelected }}>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>SubsidyNavi</h1>
            <p>Ver. 2.5 Updated</p>
          </div>

          <ul className="sidebar-nav">
            <li className="sidebar-section-title">MAIN</li>
            {mainNav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={pathname === item.href ? "active" : ""}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={icons[item.icon]} />
                  </svg>
                  {item.label}
                </a>
              </li>
            ))}
            
            <li className="sidebar-section-title">TOOLS</li>
            {toolsNav.filter(i => !i.href.includes("admin") || isAdmin).map((item) => (
              <li key={item.href}>
                <a href={item.href} className={pathname === item.href ? "active" : ""}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={icons[item.icon]} />
                  </svg>
                  {item.label}
                </a>
              </li>
            ))}
            
            <li className="sidebar-section-title">設定【すべてのユーザー】</li>
            {legalNav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={pathname === item.href ? "active" : ""}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={icons[item.icon]} />
                  </svg>
                  {item.label}
                </a>
              </li>
            ))}

            {isAdmin && (
              <>
                <li className="sidebar-section-title">管理者設定【管理者専用】</li>
                {ADMIN_NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className={pathname === item.href ? "active" : ""}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d={icons[item.icon]} />
                      </svg>
                      {item.label}
                    </a>
                  </li>
                ))}
              </>
            )}
          </ul>

          <div className="sidebar-footer">
            <div style={{ padding: "0 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{session?.user?.name}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{session?.user?.email}</div>
            </div>
            <button onClick={() => signOut()} className="btn btn-outline btn-sm" style={{ width: "100%" }}>ログアウト</button>
          </div>
        </aside>

        <main className="main-content">
          {children}
        </main>
      </div>
      
      <style jsx global>{`
        .sidebar-section-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.4);
          padding: 24px 16px 8px;
        }
        .active {
          background: rgba(255, 255, 255, 0.1);
          color: white !important;
        }
      `}</style>
    </CompanyContext.Provider>
  );
}
