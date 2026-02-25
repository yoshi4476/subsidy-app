"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:8081/api";

interface MatchResult {
  subsidy: {
    id: string;
    title: string;
    administering_body: string;
    max_amount: number | null;
    subsidy_rate_numerator: number | null;
    subsidy_rate_denominator: number | null;
    application_end: string | null;
    eligible_costs: string[];
    description: string | null;
    simple_summary: string | null;
    application_template: { section: string; guide: string; example: string; max_chars?: number }[];
    exclusive_rule: string | null;
    related_company_warning: string | null;
    required_documents: { name: string; format?: string; description?: string }[];
    source_url?: string;
  };
  eligible: boolean;
  score: number;
  max_score: number;
  rank: string;
  fulfilled_items: string[];
  recommendations: { action: string; points_gain: number; difficulty: string; new_rank_if_fulfilled: string }[];
  translated_requirements: { original_text: string; translated_text: string; source_page: number | null }[];
  company_data?: {
    sales: number;
    sales_growth_rate: number;
    sales_reduction_rate: number;
    value_added: number;
    value_added_growth_rate: number;
    fiscal_periods_count: number;
  };
  matched_max_amount?: number;
  matched_rate?: string;
  applied_rate_description?: string;
  // NEW: 最大化シミュレーション
  max_potential_amount?: number;
  max_potential_rate?: string;
  gap_analysis: { action: string; impact: string; type: string; difficulty?: string; estimated_time?: string }[];
}

export default function SubsidiesPage() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selected, setSelected] = useState<MatchResult | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplate, setShowTemplate] = useState(false);
  const [viewMode, setViewMode] = useState<"normal" | "max">("normal");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const compsRes = await fetch(`${API}/companies/`);
        if (!compsRes.ok) throw new Error("企業情報の取得に失敗しました");
        const comps = await compsRes.json();
        
        if (comps.length > 0) {
          const matchRes = await fetch(`${API}/subsidies/match/${comps[0].id}`);
          if (!matchRes.ok) throw new Error("マッチングの取得に失敗しました");
          const m = await matchRes.json();
          setMatches(m);
          if (m.length > 0) {
            setSelected(m[0]);
            loadAnalysis(m[0].subsidy.id);
          }
        } else {
          // 企業未登録の場合：公開中の補助金のみ表示する（マッチングなし）
          const latestRes = await fetch(`${API}/subsidies/latest`);
          const latest = await latestRes.json();
          const dummyMatches = latest.map((s: any) => ({
            subsidy: s,
            eligible: true,
            score: 0,
            max_score: 100,
            rank: "-",
            fulfilled_items: [],
            recommendations: [],
            translated_requirements: [],
            gap_analysis: [],
            matched_rate: s.subsidy_rate_numerator && s.subsidy_rate_denominator ? `${s.subsidy_rate_numerator}/${s.subsidy_rate_denominator}` : "-",
            matched_max_amount: s.max_amount || 0,
            max_potential_rate: (s.requirements?.rate_rules?.length > 0) 
              ? `${s.requirements.rate_rules[0].new_numerator}/${s.requirements.rate_rules[0].new_denominator}` 
              : (s.subsidy_rate_numerator && s.subsidy_rate_denominator ? `${s.subsidy_rate_numerator}/${s.subsidy_rate_denominator}` : "-"),
            max_potential_amount: s.max_amount || 0
          }));
          setMatches(dummyMatches);
          if (dummyMatches.length > 0) setSelected(dummyMatches[0]);
        }
      } catch (e) {
        console.error("Load Error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadAnalysis(id: string) {
    try {
      const data = await fetch(`${API}/subsidies/${id}/analysis`).then(r => r.json());
      setAnalysis(data);
    } catch (e) { console.error(e); }
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-secondary)" }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>補助金を探す</h1>
        <p>あなたの企業に最適な補助金をスコア順に表示しています</p>
      </div>

      {/* ===== 関連会社アナウンスバナー ===== */}
      <div style={{
        padding: "14px 20px", marginBottom: 24, borderRadius: "var(--radius-sm)",
        background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
        border: "1px solid #fdba74", display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#9a3412", marginBottom: 4 }}>
            関連会社・グループ企業での申請にご注意ください
          </div>
          <div style={{ fontSize: 13, color: "#c2410c", lineHeight: 1.6 }}>
            資本関係や役員の兼任がある企業同士での重複申請は、
            <strong>原則として不可または減点対象</strong>となります。グループ内での調整をお願いします。
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24 }}>
        {/* 左: 一覧 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {matches.map((m) => (
            <div
              key={m.subsidy.id}
              onClick={() => { setSelected(m); setAnalysis(null); loadAnalysis(m.subsidy.id); setShowTemplate(false); setViewMode("normal"); }}
              className="card"
              style={{
                cursor: "pointer", padding: "16px 20px",
                borderLeft: selected?.subsidy.id === m.subsidy.id ? "4px solid var(--color-primary-light)" : "4px solid transparent",
                background: selected?.subsidy.id === m.subsidy.id ? "var(--color-primary-surface)" : "var(--color-surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span className={`rank-badge ${m.rank}`}>{m.rank}</span>
                <span className={`status-badge ${m.eligible ? "eligible" : "ineligible"}`}>
                  {m.eligible ? "適格" : "不適格"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                {m.subsidy.administering_body}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{m.subsidy.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13 }}>
                    補助上限: <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                      {m.matched_max_amount ? `${(m.matched_max_amount / 10000).toLocaleString()}万` : (m.subsidy.max_amount ? `${(m.subsidy.max_amount / 10000).toLocaleString()}万` : "-")}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    スコア: {m.score}/{m.max_score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 右: 詳細 */}
        {selected && (
          <div className="card" style={{ alignSelf: "flex-start", padding: 0, overflow: "hidden" }}>
            {/* シミュレーター切替タブ */}
            <div style={{ display: "flex", background: "#f1f5f9", padding: "8px 16px", gap: 8 }}>
              <button 
                onClick={() => setViewMode("normal")}
                style={{ 
                  flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                  background: viewMode === "normal" ? "#fff" : "transparent",
                  boxShadow: viewMode === "normal" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                  color: viewMode === "normal" ? "var(--color-primary)" : "var(--color-text-secondary)"
                }}
              >
                現状の受給見込
              </button>
              <button 
                onClick={() => setViewMode("max")}
                style={{ 
                  flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                  background: viewMode === "max" ? "linear-gradient(135deg, #6366f1, #a855f7)" : "transparent",
                  boxShadow: viewMode === "max" ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
                  color: viewMode === "max" ? "#fff" : "var(--color-text-secondary)"
                }}
              >
                🚀 最大条件シミュレーター
              </button>
            </div>

            <div style={{ padding: "24px 32px" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{selected.subsidy.title}</h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                {selected.subsidy.administering_body}
              </p>
              {selected.subsidy.source_url && (
                <a 
                  href={selected.subsidy.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ fontSize: 12, padding: "6px 12px", marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  📄 公募要領PDFを確認する
                </a>
              )}

              {/* ===== 補助内容 (KPIカード - シミュレート対応) ===== */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div className="kpi-card" style={{ 
                  padding: "20px", background: viewMode === "max" ? "#f5f3ff" : "var(--color-surface)",
                  border: viewMode === "max" ? "2px solid #ddd6fe" : "1px solid var(--color-border)"
                }}>
                  <div className="kpi-label">補助率</div>
                  <div className="kpi-value" style={{ color: viewMode === "max" ? "#7c3aed" : "var(--color-primary)" }}>
                    {viewMode === "max" ? (selected.max_potential_rate || "-") : (selected.matched_rate || "-")}
                  </div>
                </div>
                <div className="kpi-card" style={{ 
                  padding: "20px", background: viewMode === "max" ? "#f5f3ff" : "var(--color-surface)",
                  border: viewMode === "max" ? "2px solid #ddd6fe" : "1px solid var(--color-border)"
                }}>
                  <div className="kpi-label">補助上限額</div>
                  <div className="kpi-value" style={{ fontSize: 24, color: viewMode === "max" ? "#7c3aed" : "var(--color-primary)" }}>
                    {viewMode === "max" 
                      ? `${(selected.max_potential_amount! / 10000).toLocaleString()}万` 
                      : (selected.matched_max_amount ? `${(selected.matched_max_amount / 10000).toLocaleString()}万` : "-")}
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: "20px" }}>
                  <div className="kpi-label">採択確度ランク</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`rank-badge ${selected.rank}`} style={{ width: 44, height: 44, fontSize: 20 }}>
                      {selected.rank}
                    </span>
                  </div>
                </div>
              </div>

              {/* ===== アクションプラン：最大化への道 (NEW) ===== */}
              {viewMode === "max" && (
                <div style={{ 
                  marginBottom: 32, padding: "20px", background: "#f8fafc", borderRadius: 12, border: "1px dashed #6366f1"
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#4f46e5", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>💡</span> 受給額を最大化するためのアクションプラン
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {selected.gap_analysis.map((gap, i) => (
                      <div key={i} style={{ 
                        background: "#fff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                        display: "flex", flexDirection: "column", gap: 8
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{gap.action}</div>
                            <div style={{ fontSize: 11, color: "var(--color-primary-light)", marginTop: 2 }}>{gap.impact}</div>
                          </div>
                          <span style={{ 
                            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: gap.type === "RATE_UP" ? "#f59e0b" : "#818cf8", color: "#fff"
                          }}>
                            {gap.type === "RATE_UP" ? "率アップ" : gap.type === "AMOUNT_UP" ? "額アップ" : "確度アップ"}
                          </span>
                        </div>
                        {(gap.difficulty || gap.estimated_time) && (
                          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--color-text-muted)", borderTop: "1px solid #f1f5f9", paddingTop: 6 }}>
                            <span>難易度: {gap.difficulty}</span>
                            <span>目安: {gap.estimated_time}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== 重要箇所の強調表示 ===== */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, borderBottom: "2px solid var(--color-primary-light)", display: "inline-block" }}>
                  📋 審査に刺さる重要ポイント (公募要領より)
                </h3>
                <div style={{ 
                  fontSize: 14, color: "var(--color-text-main)", lineHeight: 1.8, whiteSpace: "pre-wrap",
                  background: "#f8fafc", padding: "16px", borderRadius: 8, border: "1px solid #e2e8f0"
                }}>
                  {selected.subsidy.description?.split("\n").map((line, i) => {
                    if (line.startsWith("🔴") || line.includes("**")) {
                      return <div key={i} style={{ color: "#dc2626", fontWeight: 700, marginBottom: 8 }}>{line.replace(/[*]*/g, "")}</div>;
                    }
                    return <div key={i} style={{ marginBottom: 4 }}>{line}</div>;
                  })}
                </div>
              </div>

              {/* トレンド分析 */}
              {analysis && analysis.count > 0 && (
                <div style={{
                  padding: "18px 22px", marginBottom: 32, borderRadius: 12,
                  background: "var(--color-surface)", border: "1px solid #cbd5e1"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>📊 採択事例の傾向分析</h3>
                    <div style={{ textAlign: "right", color: "var(--color-primary)", fontWeight: 800 }}>
                      平均採択率: {analysis.adoption_rate}%
                    </div>
                  </div>
                  
                  {/* 動的インサイト表示 */}
                  <div style={{ 
                    padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", 
                    borderRadius: 8, color: "#991b1b", fontSize: 13, marginBottom: 16, lineHeight: 1.5 
                  }}>
                    <strong>💡 AIアドバイス:</strong> {analysis.insights}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--color-success)", marginBottom: 8 }}>✨ 採択の鍵 (成功要因)</h4>
                      {analysis.top_success_factors.slice(0,3).map((f: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                          <span>{f.factor}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{f.count}件</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--color-error)", marginBottom: 8 }}>⚠️ 要注意 (不採択理由)</h4>
                      {analysis.top_rejection_reasons.slice(0,3).map((r: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                          <span>{r.reason}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{r.count}件</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <a href={`/company`} className="btn btn-outline" style={{ flex: 1, textAlign: "center" }}>
                   企業情報を充実させて採択率を上げる
                </a>
                <a href={`/applications?subsidy_id=${selected.subsidy.id}`} className="btn btn-primary" style={{ flex: 1, textAlign: "center" }}>
                  AI申請書作成をスタート
                </a>
              </div>
              <p style={{ fontSize: 11, textAlign: "center", marginTop: 12, color: "var(--color-text-muted)" }}>
                ※誇張した数字の記載は失格となります。実績に基づいた誠実な申請を推奨します。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
