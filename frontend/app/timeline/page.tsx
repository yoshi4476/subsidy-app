"use client";

import { useEffect, useState } from "react";
import { useCompany } from "../components/SidebarLayout";

const API = "http://localhost:8081/api";

interface TimelineEvent {
  type: string;
  subsidy_id: string;
  subsidy_title: string;
  date: string;
  days_from_now: number;
  label: string;
  urgency: string;
}

interface CaseAnalytics {
  summary: {
    total: number;
    adopted: number;
    rejected: number;
    pending: number;
    adoption_rate: number;
  };
  rejection_reasons: Record<string, number>;
  quality_distribution: Record<string, number>;
  lessons: { case_id: string; result: string; lesson: string }[];
}

interface Document {
  id: string;
  doc_type: string;
  file_name: string;
  mime_type: string;
  fiscal_year: number | null;
  upload_date: string;
  ocr_extracted: boolean;
}

// 書類種別の日本語ラベル
const DOC_TYPE_LABELS: Record<string, string> = {
  FINANCIAL_REPORT: "決算書",
  REGISTRY_COPY: "登記簿謄本",
  TAX_CERTIFICATE: "納税証明書",
  OFFICIAL_SEAL: "印鑑証明書",
  BUSINESS_PLAN: "事業計画書",
  OTHER: "その他",
};

export default function TimelinePage() {
  const { selected } = useCompany();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [alerts, setAlerts] = useState<TimelineEvent[]>([]);
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");

  useEffect(() => {
    async function load() {
      try {
        const docPromise = selected ? fetch(`${API}/companies/${selected.id}/documents`).then((r) => r.json()).catch(() => []) : Promise.resolve([]);
        const [timeline, caseData, docs] = await Promise.all([
          fetch(`${API}/timeline`).then((r) => r.json()),
          fetch(`${API}/analytics/cases`).then((r) => r.json()),
          docPromise,
        ]);
        setEvents(timeline.events || []);
        setAlerts(timeline.alerts || []);
        setAnalytics(caseData);
        setDocuments(docs);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [selected]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-secondary)" }}>Loading...</div>;

  const tabs = [
    { id: "timeline", label: "タイムライン" },
    { id: "analytics", label: "事例分析" },
    { id: "documents", label: "書類管理" },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>タイムライン & 分析</h1>
        <p>締切管理・事例分析・書類管理の統合ビュー</p>
      </div>

      {/* 締切アラート */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              padding: "12px 20px",
              background: a.urgency === "critical"
                ? "linear-gradient(135deg, #fff5f5, #fed7d7)"
                : "linear-gradient(135deg, #fffff0, #fefcbf)",
              border: `1px solid ${a.urgency === "critical" ? "#fc8181" : "#f6e05e"}`,
              borderRadius: "var(--radius-sm)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>{a.urgency === "critical" ? "🚨" : "⚠️"}</span>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{a.subsidy_title}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", marginLeft: 8 }}>
                  — 締切まであと <strong style={{ color: a.urgency === "critical" ? "var(--color-error)" : "var(--color-warning)" }}>
                    {a.days_from_now}日
                  </strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* タブ */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid var(--color-border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: activeTab === tab.id ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderBottom: activeTab === tab.id ? "2px solid var(--color-primary)" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* タイムラインタブ */}
      {activeTab === "timeline" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 20 }}>補助金スケジュール</h3>
          <div style={{ position: "relative", paddingLeft: 32 }}>
            {events.map((ev, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 24, paddingLeft: 24 }}>
                {/* タイムラインの縦線 */}
                {i < events.length - 1 && (
                  <div style={{
                    position: "absolute",
                    left: -20,
                    top: 12,
                    bottom: 0,
                    width: 2,
                    background: "var(--color-border)",
                  }} />
                )}
                {/* ドット */}
                <div style={{
                  position: "absolute",
                  left: -26,
                  top: 4,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "3px solid",
                  borderColor: ev.type === "DEADLINE"
                    ? ev.urgency === "critical" ? "var(--color-error)" : "var(--color-warning)"
                    : ev.type === "START" ? "var(--color-success)" : "var(--color-primary-light)",
                  background: "white",
                }} />
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                    {new Date(ev.date).toLocaleDateString("ja-JP")}
                    {ev.days_from_now >= 0 && <span style={{ marginLeft: 8 }}>（あと{ev.days_from_now}日）</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
                    <span style={{
                      display: "inline-block",
                      padding: "1px 8px",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      marginRight: 8,
                      background: ev.type === "DEADLINE" ? "#fed7d7" : ev.type === "START" ? "#c6f6d5" : "#bee3f8",
                      color: ev.type === "DEADLINE" ? "#742a2a" : ev.type === "START" ? "#22543d" : "#2a4365",
                    }}>
                      {ev.label}
                    </span>
                    {ev.subsidy_title}
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div style={{ color: "var(--color-text-muted)", padding: 20 }}>スケジュールされたイベントはありません</div>
            )}
          </div>
        </div>
      )}

      {/* 事例分析タブ */}
      {activeTab === "analytics" && analytics && (
        <div>
          {/* KPIサマリー */}
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card">
              <div className="kpi-label">総事例数</div>
              <div className="kpi-value">{analytics.summary.total}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">採択率</div>
              <div className="kpi-value" style={{ color: "var(--color-success)" }}>{analytics.summary.adoption_rate}%</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">採択</div>
              <div className="kpi-value" style={{ color: "var(--color-success)" }}>{analytics.summary.adopted}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">不採択</div>
              <div className="kpi-value" style={{ color: "var(--color-error)" }}>{analytics.summary.rejected}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* 不採択理由分布 */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>不採択理由の分布</h3>
              {Object.keys(analytics.rejection_reasons).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(analytics.rejection_reasons)
                    .sort((a, b) => b[1] - a[1])
                    .map(([reason, count]) => {
                      const maxCount = Math.max(...Object.values(analytics.rejection_reasons));
                      return (
                        <div key={reason}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{reason}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-error)" }}>{count}件</span>
                          </div>
                          <div className="score-bar-container">
                            <div className="score-bar" style={{
                              width: `${(count / maxCount) * 100}%`,
                              background: "linear-gradient(90deg, #fc8181, #e53e3e)",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>不採択データなし</div>
              )}
            </div>

            {/* AI品質スコア分布 */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>AI品質評価の分布</h3>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 120 }}>
                {["S", "A", "B", "C", "D"].map((grade) => {
                  const count = analytics.quality_distribution[grade] || 0;
                  const maxCount = Math.max(...Object.values(analytics.quality_distribution), 1);
                  const colors: Record<string, string> = {
                    S: "var(--rank-s)", A: "var(--rank-a)", B: "var(--rank-b)", C: "var(--color-warning)", D: "var(--color-error)",
                  };
                  return (
                    <div key={grade} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{count}</div>
                      <div style={{
                        height: `${maxCount > 0 ? (count / maxCount) * 80 : 0}%`,
                        minHeight: count > 0 ? 20 : 4,
                        background: colors[grade],
                        borderRadius: "6px 6px 0 0",
                        transition: "height 0.8s ease",
                      }} />
                      <div style={{
                        marginTop: 6,
                        fontSize: 14,
                        fontWeight: 800,
                        color: colors[grade],
                      }}>{grade}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 学びの集約 */}
          {analytics.lessons.length > 0 && (
            <div className="card" style={{ marginTop: 24 }}>
              <h3 className="card-title" style={{ marginBottom: 16 }}>蓄積された学び・ナレッジ</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {analytics.lessons.map((l, i) => (
                  <div key={i} style={{
                    padding: "12px 16px",
                    background: l.result === "ADOPTED" ? "#f0fff4" : "#fff5f5",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: `3px solid ${l.result === "ADOPTED" ? "var(--color-success)" : "var(--color-error)"}`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: l.result === "ADOPTED" ? "var(--color-success)" : "var(--color-error)", marginBottom: 4 }}>
                      {l.result === "ADOPTED" ? "採択事例からの学び" : "不採択事例からの学び"}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.7 }}>{l.lesson}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 書類管理タブ */}
      {activeTab === "documents" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">登録済み書類</h3>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{documents.length}件</span>
          </div>
          {documents.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>ファイル名</th>
                  <th>年度</th>
                  <th>形式</th>
                  <th>アップロード日</th>
                  <th>OCR</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span style={{
                        padding: "2px 10px",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        background: "var(--color-primary-surface)",
                        color: "var(--color-primary)",
                      }}>
                        {DOC_TYPE_LABELS[d.doc_type] || d.doc_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{d.file_name}</td>
                    <td>{d.fiscal_year || "-"}</td>
                    <td style={{ fontSize: 12, fontFamily: "monospace", color: "var(--color-text-muted)" }}>{d.mime_type}</td>
                    <td style={{ fontSize: 12 }}>{d.upload_date ? new Date(d.upload_date).toLocaleDateString("ja-JP") : "-"}</td>
                    <td>{d.ocr_extracted ? <span style={{ color: "var(--color-success)" }}>済</span> : <span style={{ color: "var(--color-text-muted)" }}>未</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>書類が登録されていません</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>決算書、登記簿、納税証明書などをアップロードしてください</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
