"use client";

import { useState, useEffect } from "react";
import { useCompany } from "../components/SidebarLayout";
import ReactMarkdown from "react-markdown";

const API = "http://localhost:8081/api";

interface Subsidy {
  id: string;
  title: string;
  description: string;
}

export default function AIPlannerPage() {
  const { selected } = useCompany();
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [selectedSubsidyId, setSelectedSubsidyId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [planMarkdown, setPlanMarkdown] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [reviewing, setReviewing] = useState(false);
  const [latestFinancial, setLatestFinancial] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/subsidies/latest`)
      .then(r => r.json())
      .then(data => setSubsidies(data))
      .catch(err => console.error("Failed to load subsidies", err));
  }, []);

  useEffect(() => {
    if (selected) {
      loadLatestFinancial();
    }
  }, [selected]);

  async function handleGenerate() {
    if (!selected || !selectedSubsidyId) return;

    setGenerating(true);
    setPlanMarkdown("");
    setError(null);

    try {
      const response = await fetch(`${API}/ai/generate-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: selected.id,
          subsidy_id: selectedSubsidyId,
        }),
      });

      const data = await response.json();
      if (data.plan_markdown) {
        setPlanMarkdown(data.plan_markdown);
      } else {
        setError(data.message || "生成に失敗しました。");
      }
    } catch (err) {
      setError("AI サーバーとの通信に失敗しました。");
    } finally {
      setGenerating(false);
    }
  }

  async function loadLatestFinancial() {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/companies/${selected.id}/financials`);
      const data = await res.json();
      if (data.length > 0) setLatestFinancial(data[0]);
    } catch (e) { console.error(e); }
  }

  async function handleReview() {
    if (!planMarkdown) return;
    setReviewing(true);
    setReviewResult(null);
    try {
      const body: any = {
        plan_text: planMarkdown,
        subsidy_requirements: subsidies.find(s => s.id === selectedSubsidyId)?.description || ""
      };
      
      // 数値矛盾検知用に最新財務データを付与
      if (latestFinancial) {
         body.plan_data = {
           current_sales: latestFinancial.sales,
           target_sales: latestFinancial.sales * 1.5, // 簡易的に1.5倍をターゲットとする（将来的に入力可能にする）
           current_labor_cost: latestFinancial.labor_cost,
           target_labor_cost: latestFinancial.labor_cost, // 現状維持
           investment_amount: 10000000 // サンプル投資額
         };
      }

      const response = await fetch(`${API}/ai/critical-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setReviewResult(data);
    } catch (err) {
      console.error("Review failed", err);
      setError("AI 査読に失敗しました。");
    } finally {
      setReviewing(false);
    }
  }

  function handleDownload(format: "pdf" | "xlsx") {
    alert(`${format.toUpperCase()}形式での書き出しをシミュレーションしています...（実際の実装ではライブラリを使用してファイルを生成します）`);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>AI事業計画書ドラフト生成</h1>
        <p>企業のDNAと補助金要件を統合し、採択率の高いドラフトを生成します。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>設定</h2>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>対象企業</label>
              <div style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "#f8fafc", fontSize: 13 }}>
                {selected?.legal_name || "企業を選択してください"}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>補助金を選択</label>
              <select 
                className="input" 
                value={selectedSubsidyId}
                onChange={(e) => setSelectedSubsidyId(e.target.value)}
                style={{ width: "100%", fontSize: 13 }}
              >
                <option value="">-- 選択してください --</option>
                {subsidies.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: "100%", padding: "12px" }}
              disabled={generating || !selected || !selectedSubsidyId}
              onClick={handleGenerate}
            >
              {generating ? "生成中..." : "✨ ドラフトを一括生成"}
            </button>

            {error && (
              <div style={{ marginTop: 16, color: "var(--color-error)", fontSize: 12, background: "#fff5f5", padding: 8, borderRadius: 4, border: "1px solid #fed7d7" }}>
                {error}
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 24, background: "var(--color-primary-light)", color: "white", padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>💡 生成のヒント</h3>
            <p style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.9 }}>
              企業情報の「事業概要」や「強み」を詳細に入力しておくと、より精度の高いドラフトが生成されます。
            </p>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="card" style={{ minHeight: "600px", padding: 32 }}>
            {planMarkdown ? (
              <div className="prose">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--color-border)" }}>
                  <h2 style={{ margin: 0 }}>申請書ドラフト</h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className={`btn btn-sm ${isEditing ? "btn-primary" : "btn-outline"}`} onClick={() => setIsEditing(!isEditing)}>
                      {isEditing ? "💾 保存" : "📝 編集モード"}
                    </button>
                    <button className="btn btn-sm btn-reviewer" onClick={handleReview} disabled={reviewing || isEditing}>
                      {reviewing ? "査読中..." : "🧐 審査員モード"}
                    </button>
                    <div className="dropdown">
                      <button className="btn btn-sm btn-outline">📥 出力</button>
                      <div className="dropdown-content">
                        <button onClick={() => handleDownload("pdf")}>📄 PDFとして出力</button>
                        <button onClick={() => handleDownload("xlsx")}>📊 Excelとして出力</button>
                        <button onClick={() => navigator.clipboard.writeText(planMarkdown)}>📋 クリップボードにコピー</button>
                      </div>
                    </div>
                  </div>
                </div>

                {reviewResult && (
                  <div className="review-box">
                    <div className="review-header">
                      <span className="score-badge">査読スコア: {reviewResult.total_score}点</span>
                      <span className="judgement-text">判定: {reviewResult.judgement}</span>
                    </div>
                    <div className="critical-flaws">
                      <h4 style={{ color: "#c53030", fontSize: 14, fontWeight: 800, marginBottom: 12 }}>🚨 致命的な指摘事項（赤入れ）</h4>
                      {reviewResult.critical_flaws.map((flaw: any, idx: number) => (
                        <div key={idx} className="flaw-item">
                          <div className="flaw-target">「{flaw.target_text}」</div>
                          <div className="flaw-issue">
                            <strong>問題点:</strong> {flaw.issue}
                          </div>
                          <div className="flaw-fix">
                            <strong>改善指示:</strong> {flaw.red_ink_comment}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="review-summary">
                        <strong>総評:</strong> {reviewResult.overall_summary}
                    </div>
                  </div>
                )}

                <div className="markdown-content" style={{ fontSize: 15, lineHeight: 1.8 }}>
                  {isEditing ? (
                    <textarea 
                      style={{ 
                        width: "100%", height: "600px", border: "1px solid var(--color-primary-light)", 
                        borderRadius: "var(--radius-sm)", padding: "20px", fontSize: "14px", fontFamily: "monospace",
                        lineHeight: "1.6", background: "#fcfcfc"
                      }}
                      value={planMarkdown}
                      onChange={(e) => setPlanMarkdown(e.target.value)}
                    />
                  ) : (
                    <ReactMarkdown>{planMarkdown}</ReactMarkdown>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                <p>左側のメニューから補助金を選択して、生成を開始してください。</p>
                {generating && (
                  <div style={{ marginTop: 20, textAlign: "center" }}>
                    <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
                    <p>AIが企業のDNAを解析し、最適な計画を立案中です...<br />(30秒〜1分ほどかかります)</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .markdown-content :global(h1) { font-size: 24px; border-bottom: 2px solid var(--color-primary); padding-bottom: 8px; margin-top: 32px; }
        .markdown-content :global(h2) { font-size: 20px; color: var(--color-primary); margin-top: 24px; }
        .markdown-content :global(h3) { font-size: 17px; margin-top: 20px; }
        .markdown-content :global(p) { margin-bottom: 16px; }
        .markdown-content :global(ul) { margin-bottom: 16px; padding-left: 20px; }
        .markdown-content :global(li) { margin-bottom: 4px; }
        
        .btn-reviewer {
           background: #feebc8;
           color: #9c4221;
           border: 1px solid #fbd38d;
           font-weight: 700;
        }
        .btn-reviewer:hover {
           background: #fbd38d;
        }

        .review-box {
          background: #fff5f5;
          border: 2px solid #feb2b2;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
        .review-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .score-badge {
          background: #c53030;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-weight: 800;
        }
        .judgement-text {
          font-weight: 800;
          color: #742a2a;
        }
        .flaw-item {
          background: white;
          padding: 1rem;
          border-radius: 0.5rem;
          border-left: 4px solid #c53030;
          margin-bottom: 1rem;
        }
        .flaw-target {
          font-family: monospace;
          background: #fff5f5;
          padding: 0.25rem 0.5rem;
          margin-bottom: 0.5rem;
          color: #c53030;
          font-weight: 700;
        }
        .flaw-issue, .flaw-fix {
          font-size: 13px;
          line-height: 1.6;
        }
        .review-summary {
           margin-top: 1rem;
           font-size: 14px;
           color: #742a2a;
           border-top: 1px solid #feb2b2;
           padding-top: 1rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(0,0,0,0.1);
          border-left-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dropdown { position: relative; display: inline-block; }
        .dropdown-content {
          display: none; position: absolute; right: 0; background-color: white; min-width: 180px;
          box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.1); border-radius: var(--radius-sm); border: 1px solid var(--color-border);
          z-index: 10; overflow: hidden;
        }
        .dropdown:hover .dropdown-content { display: block; }
        .dropdown-content button {
          color: var(--color-text); padding: 10px 16px; text-decoration: none; display: block;
          width: 100%; text-align: left; border: none; background: none; font-size: 13px;
        }
        .dropdown-content button:hover { background-color: #f1f5f9; }
      `}</style>
    </div>
  );
}
