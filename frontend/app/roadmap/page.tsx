"use client";

import { useEffect, useState } from "react";
import SidebarLayout, { useCompany } from "@/app/components/SidebarLayout";

const API = "http://localhost:8081/api";

// --- 型定義 ---
interface GapAction {
  action: string;
  impact: string;
  type: string;
  difficulty?: string;
  estimated_time?: string;
  steps?: string[];
}

interface RoadmapItem {
  subsidy_id: string;
  title: string;
  eligible: boolean;
  score: number;
  max_score: number;
  rank: string;
  gap_analysis: GapAction[];
  dynamic_max_amount: number;
  matched_rate: string;
}

// --- ヘルパー ---
const fmtYen = (n: number) => n > 0 ? `¥${n.toLocaleString()}` : "—";
const rankColors: Record<string, { bg: string; text: string; gradient: string }> = {
  S: { bg: "#f0fdf4", text: "#16a34a", gradient: "linear-gradient(135deg, #22c55e, #16a34a)" },
  A: { bg: "#eff6ff", text: "#2563eb", gradient: "linear-gradient(135deg, #3b82f6, #2563eb)" },
  B: { bg: "#fffbeb", text: "#d97706", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  C: { bg: "#f8fafc", text: "#64748b", gradient: "linear-gradient(135deg, #94a3b8, #64748b)" },
};
const diffMeta: Record<string, { label: string; emoji: string; color: string; bg: string; stars: number }> = {
  EASY:   { label: "簡単", emoji: "⚡", color: "#059669", bg: "#ecfdf5", stars: 2 },
  MEDIUM: { label: "普通", emoji: "🎯", color: "#d97706", bg: "#fffbeb", stars: 3 },
  HARD:   { label: "困難", emoji: "🛡️", color: "#dc2626", bg: "#fef2f2", stars: 5 },
};
const getDiff = (d?: string) => diffMeta[d || "MEDIUM"] || diffMeta.MEDIUM;
const getRank = (r: string) => rankColors[r] || rankColors.C;

export default function RoadmapPage() {
  const { selected } = useCompany();
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => { if (selected) loadRoadmap(); }, [selected]);

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  async function loadRoadmap() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/subsidies/latest`);
      if (!res.ok) throw new Error("fetch failed");
      const list = await res.json();
      if (!Array.isArray(list)) { setRoadmap([]); return; }

      const results = await Promise.all(
        list.slice(0, 3).map(async (s: any) => {
          try {
            if (!selected?.id) return null;
            const r = await fetch(`${API}/subsidies/${s.id}/match?company_id=${selected.id}`);
            if (!r.ok) return null;
            const d = await r.json();
            if (!d?.subsidy) return null;
            return {
              subsidy_id: d.subsidy.id, title: d.subsidy.title, eligible: !!d.eligible,
              score: d.score || 0, max_score: d.max_score || 100, rank: d.rank || "C",
              gap_analysis: d.gap_analysis || [],
              dynamic_max_amount: d.shared_max_amount || d.matched_max_amount || 0,
              matched_rate: d.matched_rate || "N/A",
            };
          } catch { return null; }
        })
      );
      setRoadmap(results.filter(Boolean) as RoadmapItem[]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  return (
    <SidebarLayout>
      <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #2563eb, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📈</div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>戦略的加点ロードマップ</h1>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>あと数ステップで採択率が劇的に向上します</p>
            </div>
          </div>
          {selected && (
            <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 12px", fontSize: 13 }}>
              <span>🏢</span>
              <span style={{ fontWeight: 600, color: "#334155" }}>{selected.legal_name}</span>
              <span style={{ color: "#94a3b8", fontSize: 11 }}>の戦略分析</span>
            </div>
          )}
        </div>

        {/* ローディング */}
        {loading && (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#475569" }}>ロードマップを生成中...</p>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>補助金データを分析しています</p>
          </div>
        )}

        {/* 未選択 */}
        {!loading && !selected && (
          <div style={{ textAlign: "center", padding: 80, background: "white", borderRadius: 16, border: "2px dashed #e2e8f0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#64748b" }}>企業を選択してください</p>
          </div>
        )}

        {/* メインコンテンツ */}
        {!loading && selected && (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}>
            {roadmap.map((item, idx) => {
              const rc = getRank(item.rank);
              const pct = item.max_score > 0 ? Math.round((item.score / item.max_score) * 100) : 0;
              const scoreUps = item.gap_analysis.filter(g => g.type === "SCORE_UP");
              const others = item.gap_analysis.filter(g => g.type !== "SCORE_UP");

              return (
                <div key={idx} style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>

                  {/* カードヘッダー */}
                  <div style={{ padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: 6 }}>🏆 推奨補助金 #{idx + 1}</span>
                        {item.eligible && <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>✅ 申請可能</span>}
                      </div>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>{item.title || "補助金案件"}</h2>
                    </div>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: rc.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: "white" }}>{item.rank}</span>
                    </div>
                  </div>

                  {/* サマリー3カラム */}
                  <div style={{ padding: "16px 28px", background: "#fafbfc", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    {/* スコアゲージ */}
                    <div style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>📊 加点スコア</span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{item.score}<span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>/{item.max_score}</span></span>
                      </div>
                      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: rc.gradient, borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "right" as const, marginTop: 4 }}>{pct}% 達成</div>
                    </div>

                    {/* 補助率 */}
                    <div style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>🎯 適用補助率</span>
                      <span style={{ fontSize: 24, fontWeight: 900, color: "#4f46e5" }}>{item.matched_rate}</span>
                    </div>

                    {/* 最大受給額 */}
                    <div style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>✨ 最大受給額</span>
                      <span style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{fmtYen(item.dynamic_max_amount)}</span>
                    </div>
                  </div>

                  {/* 加点アクション一覧 */}
                  {scoreUps.length > 0 && (
                    <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 3, height: 18, borderRadius: 2, background: "linear-gradient(180deg, #f97316, #f59e0b)" }} />
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", margin: 0 }}>採択率を上げるためのアクションプラン</h3>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#ea580c", background: "#fff7ed", padding: "2px 8px", borderRadius: 6, marginLeft: "auto" }}>{scoreUps.length} 項目</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                        {scoreUps.map((gap, gIdx) => {
                          const dc = getDiff(gap.difficulty);
                          const key = `${idx}-${gIdx}`;
                          const open = expanded[key] ?? (gIdx === 0);

                          return (
                            <div key={gIdx} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "white" }}>
                              {/* アコーディオンヘッダー */}
                              <div
                                onClick={() => toggle(key)}
                                style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", userSelect: "none" as const }}
                              >
                                {/* 番号 */}
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: dc.bg, color: dc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{gIdx + 1}</div>

                                {/* タイトル */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: 0, lineHeight: 1.4 }}>{gap.action}</p>
                                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: dc.color, background: dc.bg, padding: "1px 8px", borderRadius: 6 }}>{dc.emoji} {dc.label}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f8fafc", padding: "1px 8px", borderRadius: 6 }}>⏱ {gap.estimated_time || "1-2ヶ月"}</span>
                                  </div>
                                </div>

                                {/* 効果 */}
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", whiteSpace: "nowrap" as const }}>{gap.impact}</span>

                                {/* 展開矢印 */}
                                <span style={{ color: "#94a3b8", fontSize: 14, transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
                              </div>

                              {/* 展開コンテンツ */}
                              {open && (
                                <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f1f5f9" }}>
                                  {/* 重要度 */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 12 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 1 }}>重要度</span>
                                    <span style={{ letterSpacing: 2 }}>
                                      {Array.from({ length: 5 }, (_, i) => (
                                        <span key={i} style={{ color: i < dc.stars ? "#f59e0b" : "#e2e8f0" }}>★</span>
                                      ))}
                                    </span>
                                  </div>

                                  {/* プロセスフロー */}
                                  {gap.steps && gap.steps.length > 0 && (
                                    <div>
                                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12 }}>取得までのプロセス</p>
                                      {gap.steps.map((step, sIdx) => (
                                        <div key={sIdx} style={{ display: "flex", gap: 12 }}>
                                          {/* 縦ライン */}
                                          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", flexShrink: 0 }}>
                                            <div style={{
                                              width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                              fontSize: 11, fontWeight: 800,
                                              background: sIdx === 0 ? "#2563eb" : "white",
                                              color: sIdx === 0 ? "white" : "#64748b",
                                              border: sIdx === 0 ? "none" : "2px solid #e2e8f0",
                                            }}>{sIdx + 1}</div>
                                            {sIdx < (gap.steps?.length ?? 0) - 1 && (
                                              <div style={{ width: 2, flex: 1, minHeight: 16, background: "#e2e8f0" }} />
                                            )}
                                          </div>
                                          {/* テキスト */}
                                          <div style={{ paddingBottom: sIdx < (gap.steps?.length ?? 0) - 1 ? 12 : 0, paddingTop: 3 }}>
                                            <p style={{ fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{step}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* フッター */}
                                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <button onClick={() => alert("認定支援機関のサポートを予約します")}
                                      style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                      専門家のサポートを受ける →
                                    </button>
                                    <span style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>※取得後の採択率 推定+25% 改善</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 補助率アップのチャンス */}
                  {others.length > 0 && (
                    <div style={{ padding: "16px 28px", background: "#f8faff", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 3, height: 18, borderRadius: 2, background: "linear-gradient(180deg, #3b82f6, #6366f1)" }} />
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#334155", margin: 0 }}>補助率・上限額アップのチャンス</h3>
                      </div>
                      {others.map((g, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "white", borderRadius: 8, padding: "10px 12px", border: "1px solid #f1f5f9", marginBottom: 6 }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", margin: 0 }}>{g.action}</p>
                            <p style={{ fontSize: 11, color: "#2563eb", margin: "2px 0 0" }}>{g.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 全加点済 */}
                  {item.gap_analysis.length === 0 && (
                    <div style={{ padding: 40, textAlign: "center" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#334155" }}>最高ランク達成済み！</p>
                      <p style={{ fontSize: 13, color: "#94a3b8" }}>自信を持って申請しましょう</p>
                    </div>
                  )}

                  {/* CTA */}
                  <div
                    onClick={() => window.location.href = "/ai-planner"}
                    style={{ padding: "14px 28px", background: "linear-gradient(135deg, #2563eb, #4f46e5)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>✨ このロードマップに沿って事業計画書を自動生成する</span>
                    <span style={{ fontSize: 18 }}>→</span>
                  </div>
                </div>
              );
            })}

            {/* データなし */}
            {roadmap.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: 80, background: "white", borderRadius: 16, border: "2px dashed #e2e8f0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#64748b" }}>マッチする補助金が見つかりませんでした</p>
                <p style={{ fontSize: 13, color: "#94a3b8" }}>企業情報を更新すると新しい候補が見つかる場合があります</p>
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
