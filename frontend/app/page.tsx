"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCompany } from "./components/SidebarLayout";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

import { API_BASE as API } from "../lib/config";

// 型定義
interface LatestSubsidy {
  id: string;
  title: string;
  days_left: number | null;
  status: string;
  max_amount: number | null;
}

interface MatchResult {
  subsidy: any;
  eligible: boolean;
  score: number;
  max_score: number;
  rank: string;
}

interface Analytics {
  timeline: { month: string; total: number; adopted: number }[];
  by_subsidy: { name: string; total: number; adopted: number }[];
  rejection_causes: { name: string; value: number }[];
  roi_trends: { category: string; avg_roi: number }[];
}

const COLORS = ["#4fd1c5", "#f6e05e", "#fc8181", "#63b3ed", "#a0aec0", "#9f7aea"];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { companies, selected } = useCompany();
  const [latestSubsidies, setLatestSubsidies] = useState<LatestSubsidy[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [favSubsidies, setFavSubsidies] = useState<LatestSubsidy[]>([]);
  const [systemNotice, setSystemNotice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [latest, m, stats, favs, noticeRes] = await Promise.all([
          fetch(`${API}/subsidies/latest`).then((r) => r.json()).catch(() => []),
          selected ? fetch(`${API}/subsidies/match/${selected.id}`).then((r) => r.json()).catch(() => []) : Promise.resolve([]),
          fetch(`${API}/cases/stats/analytics`).then((r) => r.json()).catch(() => null),
          (session?.user as any)?.id ? fetch(`${API}/user/favorites?user_id=${(session?.user as any).id}`).then((r) => r.json()).catch(() => []) : Promise.resolve([]),
          fetch(`${API}/system/notice`).then((r) => r.json()).catch(() => ({ notice: "" }))
        ]);
        setLatestSubsidies(latest);
        setMatches(m);
        setAnalytics(stats);
        setSystemNotice(noticeRes.notice || "");
        
        // お気に入り詳細の紐付け
        const favDetails = latest.filter((s: LatestSubsidy) => 
          favs.some((f: any) => f.subsidy_id === s.id)
        );
        setFavSubsidies(favDetails);
      } catch (e) {
        console.error("API Error:", e);
      } finally {
        setLoading(false);
      }
    }
    
    if (status !== "loading") {
      loadData();
    }
  }, [selected, status]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch(`${API}/subsidies/refresh`, { method: "POST" });
      const [latest, m, stats, noticeRes] = await Promise.all([
        fetch(`${API}/subsidies/latest`).then((r) => r.json()).catch(() => []),
        selected ? fetch(`${API}/subsidies/match/${selected.id}`).then((r) => r.json()).catch(() => []) : Promise.resolve([]),
        fetch(`${API}/cases/stats/analytics`).then((r) => r.json()).catch(() => null),
        fetch(`${API}/system/notice`).then((r) => r.json()).catch(() => ({ notice: "" }))
      ]);
      setLatestSubsidies(latest);
      setMatches(m);
      setAnalytics(stats);
      setSystemNotice(noticeRes.notice || "");
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>...</div>
          <p style={{ color: "var(--color-text-secondary)" }}>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (status !== "loading" && (!companies || companies.length === 0)) {
    return (
      <div className="fade-in">
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🏢</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            {status === "unauthenticated" ? "SubsidyNaviへログインしてください" : "ようこそ SubsidyNavi へ"}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 16, marginBottom: 32, lineHeight: 1.8 }}>
            まずは企業情報を登録してください。<br />
            入力された情報をもとに、最適な補助金を自動でマッチングします。
          </p>
          <a href="/company/new" className="btn btn-primary" style={{ fontSize: 16, padding: "14px 40px" }}>
            企業情報を登録する →
          </a>
        </div>
      </div>
    );
  }

  const eligibleCount = matches.filter((m) => m.eligible).length;
  const topMatch = matches[0];
  const urgentSubsidies = latestSubsidies.filter((s) => s.days_left !== null && s.days_left >= 0 && s.days_left <= 30);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>ダッシュボード</h1>
          <p>{selected?.legal_name || "企業"} — 補助金マッチング概要</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "更新中..." : "🔄 最新情報を取得"}
          </button>
        </div>
      </div>

      {systemNotice && (
        <div style={{
          marginBottom: 24, padding: "16px 20px", 
          background: "linear-gradient(to right, #ebf8ff, #bee3f8)", 
          borderLeft: "4px solid var(--color-primary-lighter)", 
          borderRadius: "var(--radius-sm)",
          display: "flex", alignItems: "flex-start", gap: 12
        }}>
          <span style={{ fontSize: 20 }}>📢</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)", marginBottom: 4 }}>システムからのお知らせ</div>
            <div style={{ fontSize: 14, color: "var(--color-text-dark)", whiteSpace: "pre-wrap" }}>{systemNotice}</div>
          </div>
        </div>
      )}

      {urgentSubsidies.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {urgentSubsidies.map((s) => (
            <div key={s.id} style={{
              padding: "12px 20px", marginBottom: 8,
              background: s.days_left! <= 7 ? "linear-gradient(135deg, #fff5f5, #fed7d7)" : "linear-gradient(135deg, #fffff0, #fefcbf)",
              border: `1px solid ${s.days_left! <= 7 ? "#fc8181" : "#f6e05e"}`,
              borderRadius: "var(--radius-sm)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>{s.days_left! <= 7 ? "🚨" : "⚠️"}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", marginLeft: 8 }}>
                  — 締切まであと <strong style={{ color: s.days_left! <= 7 ? "var(--color-error)" : "var(--color-warning)" }}>{s.days_left}日</strong>
                </span>
              </div>
              <a href="/subsidies" className="btn btn-sm btn-primary" style={{ fontSize: 12 }}>詳細</a>
            </div>
          ))}
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">公募中の補助金</div><div className="kpi-value">{latestSubsidies.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">申請可能な補助金</div><div className="kpi-value" style={{ color: "var(--color-success)" }}>{eligibleCount}</div></div>
        <div className="kpi-card"><div className="kpi-label">最大補助額</div><div className="kpi-value" style={{ color: "var(--color-accent)" }}>{topMatch?.subsidy?.max_amount ? (topMatch.subsidy.max_amount / 10000).toLocaleString() : "-"}</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginTop: 32 }}>
        {/* お気に入り管理 */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>⭐ お気に入り補助金の状況</h2>
            <a href="/subsidies/favorites" style={{ fontSize: 12, color: "var(--color-primary)" }}>全て表示</a>
          </div>
          {favSubsidies.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {favSubsidies.slice(0, 3).map(s => (
                <div key={s.id} style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      締切まであと <span style={{ color: s.days_left !== null && s.days_left <= 7 ? "var(--color-error)" : "inherit", fontWeight: 700 }}>{s.days_left ?? "-"}日</span>
                    </div>
                  </div>
                  <a href={`/ai-planner`} className="btn btn-sm btn-outline">AI生成</a>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--color-text-muted)", textAlign: "center", padding: "20px 0" }}>
              お気に入りに登録された補助金はありません。
            </p>
          )}
        </div>

        {/* クイックツール */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))", color: "white", padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>🤖 AIドラフト生成</h3>
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 16 }}>企業のDNAから申請書を一括作成します。</p>
            <a href="/ai-planner" className="btn btn-sm" style={{ background: "white", color: "var(--color-primary)" }}>プランナーを開く</a>
          </div>
          <div className="card" style={{ background: "linear-gradient(135deg, var(--color-accent), #f6ad55)", color: "white", padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>✅ マイ申請案件</h3>
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 16 }}>採択後の報告手続きや進捗を管理。</p>
            <a href="/applications" className="btn btn-sm" style={{ background: "white", color: "var(--color-accent)" }}>進捗を確認</a>
          </div>
        </div>
      </div>
    </div>
  );
}
