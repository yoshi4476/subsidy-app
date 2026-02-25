"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:8081/api";

interface Case {
  id: string;
  company_id: string;
  subsidy_id: string;
  application_date: string | null;
  result: string;
  rejection_reason: string | null;
  rejection_category: string[];
  score_at_submission: number | null;
  ai_quality_score: Record<string, string> | null;
  lessons_learned: string | null;
  is_anonymized: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  adopted: number;
  rejected: number;
  pending: number;
  adoption_rate: number;
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [subsidies, setSubsidies] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [rejectFilter, setRejectFilter] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  const rejectionCategories = Array.from(new Set(cases.flatMap(c => c.result === "REJECTED" && c.rejection_category ? c.rejection_category : [])));

  const filteredCases = cases.filter(c => {
    if (filter === "REJECTED" && rejectFilter !== "") {
      return c.rejection_category?.includes(rejectFilter);
    }
    return true;
  });

  useEffect(() => {
    async function load() {
      try {
        const q = filter ? `?result=${filter}` : "";
        const [c, s, subs] = await Promise.all([
          fetch(`${API}/cases${q}`).then((r) => r.json()),
          fetch(`${API}/cases/stats/summary`).then((r) => r.json()),
          fetch(`${API}/subsidies`).then((r) => r.json()),
        ]);
        setCases(c);
        setStats(s);
        const subMap: Record<string, string> = {};
        if (Array.isArray(subs)) {
          subs.forEach((sub: any) => { subMap[sub.id] = sub.title; });
        }
        setSubsidies(subMap);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [filter]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-secondary)" }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>事例データベース</h1>
        <p>過去の採択・不採択事例を蓄積し、次の申請に活かします（補助金ごとに並べて表示）</p>
      </div>

      {/* 統計KPI */}
      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="kpi-card">
            <div className="kpi-label">総申請数</div>
            <div className="kpi-value">{stats.total}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">採択</div>
            <div className="kpi-value" style={{ color: "var(--color-success)" }}>{stats.adopted}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">不採択</div>
            <div className="kpi-value" style={{ color: "var(--color-error)" }}>{stats.rejected}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">採択率</div>
            <div className="kpi-value" style={{ color: "var(--color-accent)" }}>{stats.adoption_rate}%</div>
          </div>
        </div>
      )}

      {/* フィルタ */}
      <div style={{ display: "flex", gap: 8, marginBottom: filter === "REJECTED" ? 16 : 24 }}>
        {["", "ADOPTED", "REJECTED", "PENDING"].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setRejectFilter(""); setLoading(true); }}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-outline"}`}
          >
            {f === "" ? "全て" : f === "ADOPTED" ? "採択" : f === "REJECTED" ? "不採択" : "審査中"}
          </button>
        ))}
      </div>

      {/* 不採択時のサブフィルタ */}
      {filter === "REJECTED" && rejectionCategories.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>不採択理由で絞り込み:</span>
          <button 
            onClick={() => setRejectFilter("")} 
            className={`btn btn-sm ${rejectFilter === "" ? "btn-error" : "btn-outline"}`}
            style={{ borderRadius: 20 }}
          >
            すべて
          </button>
          {rejectionCategories.map(cat => (
             <button 
             key={cat}
             onClick={() => setRejectFilter(cat)} 
             className={`btn btn-sm ${rejectFilter === cat ? "btn-error" : "btn-outline"}`}
             style={{ borderRadius: 20 }}
           >
             {cat}
           </button>
          ))}
        </div>
      )}

      {/* 事例一覧 */}
      <div style={{ display: "grid", gridTemplateColumns: selectedCase ? "1fr 1fr" : "1fr", gap: 24, alignItems: "start" }}>
        
        {/* グループ化されたリスト */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {Object.entries(
            filteredCases.reduce((acc, c) => {
              const sName = subsidies[c.subsidy_id] || "不明な補助金";
              if (!acc[sName]) acc[sName] = [];
              acc[sName].push(c);
              return acc;
            }, {} as Record<string, Case[]>)
          )
          .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, "ja")) // カテゴリー名でソート
          .map(([subsidyName, groupedCases]) => (
            <div key={subsidyName} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", background: "var(--color-primary-surface)", borderBottom: "1px solid var(--color-border)", fontWeight: 700, fontSize: 16, color: "var(--color-primary)" }}>
                {subsidyName} ({groupedCases.length}件)
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{width: 80}}>結果</th>
                    <th style={{width: 100}}>申請日</th>
                    <th style={{width: 70}}>スコア</th>
                    <th>学び・主な理由</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedCases.map((c) => (
                    <tr key={c.id} onClick={() => setSelectedCase(c)} style={{ cursor: "pointer", background: selectedCase?.id === c.id ? "var(--color-primary-surface)" : "transparent" }}>
                      <td>
                        <span className={`status-badge ${c.result.toLowerCase()}`}>
                          {c.result === "ADOPTED" ? "採択" : c.result === "REJECTED" ? "不採択" : "審査中"}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{c.application_date || "-"}</td>
                      <td style={{ fontWeight: 700 }}>{c.score_at_submission || "-"}</td>
                      <td style={{ fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.lessons_learned || c.rejection_reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filteredCases.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>
              表示する事例がありません
            </div>
          )}
        </div>

        {/* 詳細パネル */}
        {selectedCase && (
          <div className="card fade-in">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>事例詳細</h3>

            <div style={{ marginBottom: 16 }}>
              <span className={`status-badge ${selectedCase.result.toLowerCase()}`} style={{ fontSize: 14 }}>
                {selectedCase.result === "ADOPTED" ? "採択" : selectedCase.result === "REJECTED" ? "不採択" : "審査中"}
              </span>
              <span style={{ marginLeft: 12, fontSize: 13, color: "var(--color-text-secondary)" }}>
                申請日: {selectedCase.application_date || "不明"}
              </span>
            </div>

            {selectedCase.score_at_submission && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>提出時スコア</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{selectedCase.score_at_submission}</div>
              </div>
            )}

            {selectedCase.rejection_reason && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-error)", marginBottom: 4 }}>不採択理由</div>
                <div style={{ padding: "12px 16px", background: "#fff5f5", borderRadius: "var(--radius-sm)", fontSize: 14, borderLeft: "3px solid var(--color-error)" }}>
                  {selectedCase.rejection_reason}
                </div>
              </div>
            )}

            {selectedCase.rejection_category && selectedCase.rejection_category.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>分類タグ</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selectedCase.rejection_category.map((tag, i) => (
                    <span key={i} style={{ padding: "3px 10px", background: "#fed7d7", borderRadius: 20, fontSize: 12, color: "#742a2a" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedCase.ai_quality_score && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>AI品質評価</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(selectedCase.ai_quality_score).map(([key, val]) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", background: "#f7fafc", borderRadius: "var(--radius-sm)" }}>
                      <span style={{ fontSize: 13 }}>{key}</span>
                      <span style={{ fontWeight: 700, color: val === "A" || val === "S" ? "var(--color-success)" : val === "B" ? "var(--color-accent)" : "var(--color-error)" }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedCase.lessons_learned && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>学び・改善点</div>
                <div style={{ padding: "12px 16px", background: "var(--color-primary-surface)", borderRadius: "var(--radius-sm)", fontSize: 14, lineHeight: 1.7 }}>
                  {selectedCase.lessons_learned}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
