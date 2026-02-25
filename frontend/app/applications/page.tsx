"use client";

import { useState, useEffect } from "react";
import { useCompany } from "../components/SidebarLayout";

const API = "http://localhost:8081/api";

interface ReportingTask {
  id: string;
  task_name: string;
  status: string;
  deadline: string | null;
  notes: string | null;
}

interface ApplicationCase {
  id: string;
  subsidy_id: string;
  result: string;
  application_date: string | null;
  score_at_submission: number | null;
  status_updated_at: string;
  reporting_progress: ReportingTask[];
}

export default function MyApplicationsPage() {
  const { selected } = useCompany();
  const [cases, setCases] = useState<ApplicationCase[]>([]);
  const [subsidies, setSubsidies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!selected) return;
    setLoading(true);
    try {
      // ユーザー/企業に紐づく案件を取得
      const res = await fetch(`${API}/cases?company_id=${selected.id}`);
      const data = await res.json();
      setCases(data);

      const subRes = await fetch(`${API}/subsidies`);
      const subs = await subRes.json();
      const subMap: Record<string, string> = {};
      subs.forEach((s: any) => { subMap[s.id] = s.title; });
      setSubsidies(subMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTaskStatus(caseId: string, taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    try {
      await fetch(`${API}/user/reporting-progress/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err) {
      console.error("Failed to update task", err);
    }
  }

  useEffect(() => {
    loadData();
  }, [selected]);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>マイ申請案件</h1>
          <p>進行中の申請プロジェクトと採択後の手続きを管理します。</p>
        </div>
        <a href="/applications/new" className="btn btn-primary">
          + 新規申請を作成
        </a>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : cases.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 0", opacity: 0.6 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <p>申請中の案件はありません。</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {cases.map((c) => (
            <div key={c.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>{subsidies[c.subsidy_id] || "読み込み中..."}</span>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>ID: {c.id}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`status-badge ${c.result.toLowerCase()}`} style={{ fontSize: 14 }}>
                    {c.result === "ADOPTED" ? "採択済み" : c.result === "REJECTED" ? "不採択" : "申請中"}
                  </span>
                </div>
              </div>

              <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32 }}>
                {/* 左側：基本情報 */}
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: "var(--color-text-secondary)" }}>基本情報</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>申請日</span>
                      <span style={{ fontWeight: 600 }}>{c.application_date || "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>当初スコア</span>
                      <span style={{ fontWeight: 600 }}>{c.score_at_submission || "-"} pt</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>最終更新</span>
                      <span style={{ fontWeight: 600 }}>{new Date(c.status_updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* 右側：事後サポート・手続き進捗 */}
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: "var(--color-text-secondary)" }}>
                    {c.result === "ADOPTED" ? "🎊 採択後ワークフロー" : "📋 手続き進捗"}
                  </h3>
                  
                  {c.result === "ADOPTED" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* バックエンドから取得した進捗、または初期設定 */}
                      {c.reporting_progress.length > 0 ? (
                        c.reporting_progress.map((task) => (
                          <div 
                            key={task.id} 
                            onClick={() => toggleTaskStatus(c.id, task.id, task.status)}
                            style={{ 
                              padding: "12px 16px", 
                              background: task.status === "COMPLETED" ? "#f0fff4" : "#f8fafc", 
                              borderRadius: 8, 
                              border: `1px solid ${task.status === "COMPLETED" ? "#9ae6b4" : "var(--color-border)"}`,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            className="task-item"
                          >
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="checkbox" checked={task.status === "COMPLETED"} readOnly />
                                {task.task_name}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 24 }}>
                                期限: {task.deadline || "未設定"}
                              </div>
                            </div>
                            <span style={{ 
                              fontSize: 11, 
                              fontWeight: 700, 
                              color: task.status === "COMPLETED" ? "var(--color-success)" : "var(--color-warning)" 
                            }}>
                              {task.status === "COMPLETED" ? "完了" : "対応中"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "20px", textAlign: "center", background: "#f8fafc", borderRadius: 8, border: "1px dashed var(--color-border)" }}>
                          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>採択おめでとうございます！事後サポートを開始しましょう。</p>
                          <button className="btn btn-sm btn-outline" style={{ marginTop: 12 }}>ガイドを表示</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                      現在は審査結果を待機している状態です。採択されると、実績報告や交付申請のワークフローがここに表示されます。
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid var(--color-border)", textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                {c.result === "ADOPTED" && (
                  <ProfitReturnSimulator subsidyTitle={subsidies[c.subsidy_id]} />
                )}
                <button className="btn btn-sm btn-outline">詳細ドキュメントを表示</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 収益納付シミュレーターコンポーネント */}
      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-content {
          background: white; padding: 32px; borderRadius: 16px; width: 500px; max-width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* アクションガイドセクション */}
      <div className="card" style={{ marginTop: 40, borderLeft: "4px solid var(--color-primary)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>🚀 次のアクションガイド</h2>
        <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--color-text-secondary)" }}>
          <p>補助金は採択されてからが本番です。以下のステップに注意しましょう：</p>
          <ul style={{ marginTop: 12, paddingLeft: 20 }}>
            <li><strong>交付申請:</strong> 採択後、正式に補助金額を確定させる手続きです。</li>
            <li><strong>実績報告:</strong> 投資完了後、領収書やエビデンスを提出します。</li>
            <li><strong>補助金請求:</strong> 全ての手続きが完了して初めて入金されます。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProfitReturnSimulator({ subsidyTitle }: { subsidyTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profit, setProfit] = useState("");
  const [subsidyAmount, setSubsidyAmount] = useState("5000000"); // 500万円と仮定
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const p = Number(profit);
    const s = Number(subsidyAmount);
    if (isNaN(p) || isNaN(s)) return;
    
    // 簡易的な収益納付計算ロジック
    // (利益 - 実質負担額) 等の複雑な計算が必要だが、ここでは「利益の10% または 補助金総額の少ない方」をシミュレート
    const estimated = Math.min(p * 0.1, s);
    setResult(estimated);
  };

  return (
    <>
      <button className="btn btn-sm btn-accent" onClick={() => setIsOpen(true)}>💰 収益納付をシミュレーション</button>
      
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>収益納付シミュレーター</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
              {subsidyTitle} の事業によって得られた利益から、返還が必要な金額を予測します。
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>この事業で得られた年次利益（円）</label>
              <input 
                type="number" 
                className="input" 
                style={{ width: "100%" }} 
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                placeholder="例: 10,000,000"
              />
            </div>

            <button className="btn btn-primary" style={{ width: "100%", marginBottom: 24 }} onClick={calculate}>計算する</button>

            {result !== null && (
              <div style={{ padding: 20, background: result > 0 ? "var(--color-accent-surface)" : "var(--color-success-surface)", borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>納付予想額:</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: result > 0 ? "var(--color-accent)" : "var(--color-success)" }}>
                  ¥ {result.toLocaleString()}
                </div>
                <p style={{ fontSize: 11, marginTop: 8, opacity: 0.8 }}>
                  ※この金額は概算です。人件費や自己負担額の控除により実際の納付額は変動します。
                </p>
              </div>
            )}

            <button className="btn btn-sm btn-outline" style={{ width: "100%", marginTop: 16 }} onClick={() => setIsOpen(false)}>閉じる</button>
          </div>
        </div>
      )}
    </>
  );
}
