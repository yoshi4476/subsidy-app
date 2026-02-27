"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

import { API_BASE as API } from "../../lib/config";

interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  target_entity: string;
  details: Record<string, string> | null;
  created_at: string;
}

interface Subsidy {
  id: string;
  subsidy_code: string;
  title: string;
  status: string;
  parser_confidence: number | null;
  approved_by: string | null;
  approved_at: string | null;
}

interface Analytics {
  timeline: { month: string; total: number; adopted: number }[];
  by_subsidy: { name: string; total: number; adopted: number }[];
  rejection_causes: { name: string; value: number }[];
  roi_trends: { category: string; avg_roi: number }[];
}

export default function AdminPage() {
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [subs, auditLogs, stats] = await Promise.all([
          fetch(`${API}/subsidies/`).then((r) => r.json()),
          fetch(`${API}/audit-logs?limit=20`).then((r) => r.json()),
          fetch(`${API}/cases/stats/analytics`).then((r) => r.json()).catch(() => null),
        ]);
        setSubsidies(subs);
        setLogs(auditLogs);
        setAnalytics(stats);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`${API}/subsidies/${id}/approve`, { method: "POST" });
      // リロード
      const subs = await fetch(`${API}/subsidies/`).then((r) => r.json());
      const auditLogs = await fetch(`${API}/audit-logs?limit=20`).then((r) => r.json());
      setSubsidies(subs);
      setLogs(auditLogs);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-secondary)" }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>管理者レビュー</h1>
        <p>AI解析結果の承認・差戻し / 監査ログの確認 / 採択傾向の分析</p>
      </div>

      {/* アナリティクスセクション */}
      {analytics && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* 左: 採択トレンド */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">申請・採択トレンド</h2>
            </div>
            <div style={{ height: 300, width: "100%", padding: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" style={{ fontSize: 12 }} />
                  <YAxis style={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="合計申請数" stroke="#cbd5e1" strokeWidth={2} />
                  <Line type="monotone" dataKey="adopted" name="採択数" stroke="var(--color-primary)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 右: 不採択原因分析 */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">不採択の主な要因</h2>
            </div>
            <div style={{ height: 300, width: "100%", padding: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.rejection_causes}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[ "#f1f5f9", "#e2e8f0", "#94a3b8", "#64748b", "#475569" ].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "var(--color-accent)" : color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 補助金別ROI */}
          <div className="card" style={{ gridColumn: "span 2" }}>
             <div className="card-header">
               <h2 className="card-title">補助金カテゴリ別 ROI（投資対効果）予測</h2>
             </div>
             <div style={{ height: 250, width: "100%", padding: 16 }}>
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={analytics.roi_trends} layout="vertical">
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                   <XAxis type="number" hide />
                   <YAxis dataKey="category" type="category" style={{ fontSize: 11 }} width={120} />
                   <Tooltip />
                   <Bar dataKey="avg_roi" name="推定ROI (倍数)" fill="var(--color-primary-light)" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {/* 補助金レビュー */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">補助金データ管理</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>コード</th>
              <th>補助金名</th>
              <th>ステータス</th>
              <th>AI信頼度</th>
              <th>承認者</th>
              <th>アクション</th>
            </tr>
          </thead>
          <tbody>
            {subsidies.map((s) => (
              <tr key={s.id}>
                <td style={{ fontSize: 12, fontFamily: "monospace", color: "var(--color-text-muted)" }}>{s.subsidy_code}</td>
                <td style={{ fontWeight: 600, maxWidth: 280 }}>{s.title}</td>
                <td>
                  <span className={`status-badge ${s.status === "PUBLISHED" ? "published" : "pending"}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  {s.parser_confidence !== null ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="score-bar-container" style={{ width: 60 }}>
                        <div className="score-bar" style={{
                          width: `${s.parser_confidence * 100}%`,
                          background: s.parser_confidence >= 0.9
                            ? "var(--color-success)"
                            : s.parser_confidence >= 0.7
                            ? "var(--color-accent)"
                            : "var(--color-error)",
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{(s.parser_confidence * 100).toFixed(0)}%</span>
                    </div>
                  ) : "-"}
                </td>
                <td style={{ fontSize: 13 }}>{s.approved_by || "-"}</td>
                <td>
                  {s.status !== "PUBLISHED" ? (
                    <button className="btn btn-primary btn-sm" onClick={() => handleApprove(s.id)}>承認</button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--color-success)", fontWeight: 600 }}>承認済み</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 監査ログ (Section 0.1) */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">監査ログ</h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>最新{logs.length}件</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>日時</th>
              <th>種別</th>
              <th>アクター</th>
              <th>アクション</th>
              <th>対象</th>
              <th>詳細</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={{ fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                  {new Date(log.created_at).toLocaleString("ja-JP")}
                </td>
                <td>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    background: log.actor_type === "HUMAN" ? "#bee3f8" : "#e9d8fd",
                    color: log.actor_type === "HUMAN" ? "#2a4365" : "#553c9a",
                  }}>
                    {log.actor_type}
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>{log.actor_id}</td>
                <td style={{ fontWeight: 600 }}>{log.action}</td>
                <td style={{ fontSize: 12, fontFamily: "monospace" }}>{log.target_entity}</td>
                <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {log.details ? JSON.stringify(log.details).substring(0, 40) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
