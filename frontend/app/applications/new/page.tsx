"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCompany } from "../../components/SidebarLayout";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from "recharts";

const API = "http://localhost:8081/api";

// Suspenseバウンダリでラップ（Next.js 16必須）
export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "var(--color-text-secondary)" }}>Loading...</div>}>
      <ApplicationsContent />
    </Suspense>
  );
}
// 対話型申請書作成チャットUI
// 補助金IDを引き継いで、企業データを自動反映

interface Message {
  role: "system" | "user";
  text: string;
  section?: string;
}

interface SubsidyInfo {
  id: string;
  title: string;
  administering_body: string;
  max_amount: number | null;
  required_documents: { name: string; format: string }[];
  eligible_costs: string[];
}

const WIZARD_STEPS = [
  { question: "まず、今のお仕事について教えてください。何を作って（または提供して）いますか？", section: "1. 事業概要" },
  { question: "そのお仕事で、一番困っていること・大変なことは何ですか？", section: "2. 現状の課題" },
  { question: "今回導入したい機械やシステムは何ですか？それによって何が変わりますか？", section: "3. 解決策・投資内容" },
  { question: "導入すると、作業時間や売上はどのくらい変わりそうですか？（だいたいで構いません）", section: "4. 数値目標・効果" },
  { question: "同業他社と比べて、御社ならではの強み（得意なこと・特別な技術）はありますか？", section: "5. 競合優位性" },
];

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const subsidyId = searchParams.get("subsidy_id");
  const { selected } = useCompany();

  const [subsidyInfo, setSubsidyInfo] = useState<SubsidyInfo | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiReview, setAiReview] = useState<any>(null);

  useEffect(() => {
    async function loadContext() {
      try {
        // 企業情報取得
        if (selected) {
          setCompanyName(selected.trade_name || selected.legal_name);
        }

        // 補助金情報取得
        if (subsidyId) {
          const sub = await fetch(`${API}/subsidies/${subsidyId}`).then(r => r.json());
          setSubsidyInfo(sub);
          setMessages([
            { role: "system", text: `「${sub.title}」の申請書を作成します。いくつかの質問に答えるだけで、事業計画書を自動生成します。` },
            { role: "system", text: WIZARD_STEPS[0].question, section: WIZARD_STEPS[0].section },
          ]);
        } else {
          setMessages([
            { role: "system", text: "申請書作成ウィザードへようこそ！いくつかの質問に答えるだけで、補助金の事業計画書を自動生成します。" },
            { role: "system", text: WIZARD_STEPS[0].question, section: WIZARD_STEPS[0].section },
          ]);
        }
      } catch (e) {
        console.error(e);
        setMessages([
          { role: "system", text: "申請書作成ウィザードへようこそ！" },
          { role: "system", text: WIZARD_STEPS[0].question, section: WIZARD_STEPS[0].section },
        ]);
      }
    }
    loadContext();
  }, [subsidyId, selected]);

  const handleSend = () => {
    if (!input.trim()) return;

    const currentStep = WIZARD_STEPS[stepIndex];
    const userMsg: Message = { role: "user", text: input };
    const newAnswers = { ...answers, [currentStep.section]: input };

    setMessages((prev) => [...prev, userMsg]);
    setAnswers(newAnswers);
    setInput("");

    const nextIndex = stepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "system", text: `${currentStep.section} の内容を記録しました。`, section: currentStep.section },
          { role: "system", text: WIZARD_STEPS[nextIndex].question, section: WIZARD_STEPS[nextIndex].section },
        ]);
        setStepIndex(nextIndex);
      }, 500);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "system", text: "全ての質問が完了しました！右側のプレビューで事業計画書の下書きを確認してください。" },
        ]);
        setIsComplete(true);
      }, 500);
    }
  };

  // 申請提出ハンドラー
  const handleSubmit = () => {
    setSubmitted(true);
  };

  // AI診断実行ハンドラー (NEW)
  const handleAiReview = async () => {
    if (Object.keys(answers).length === 0) return;
    setIsReviewing(true);
    try {
      // 蓄積された回答を一つのテキストに統合
      const planText = Object.entries(answers).map(([sec, ans]) => `【${sec}】\n${ans}`).join("\n\n");
      const res = await fetch(`${API}/ai/quality-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_text: planText,
          subsidy_title: subsidyInfo?.title || "",
          subsidy_code: subsidyId || "" // 今回は便宜上IDをコードとして渡す
        }),
      });
      const data = await res.json();
      setAiReview(data.quality);
    } catch (e) {
      console.error("AI Review Error:", e);
    } finally {
      setIsReviewing(false);
    }
  };

  // 右ペイン: 事業計画書プレビュー
  const generatePreview = () => {
    if (Object.keys(answers).length === 0) return null;

    return (
      <div>
        {subsidyInfo && (
          <div style={{ padding: "12px 16px", background: "var(--color-primary-surface)", borderRadius: "var(--radius-sm)", marginBottom: 20, borderLeft: "3px solid var(--color-primary-light)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>申請先補助金</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{subsidyInfo.title}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {subsidyInfo.administering_body} | 最大{subsidyInfo.max_amount ? `${(subsidyInfo.max_amount / 10000).toLocaleString()}万円` : "-"}
            </div>
          </div>
        )}

        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: "var(--color-primary)" }}>
          事業計画書（下書き）
        </h3>
        {companyName && (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
            申請者: {companyName}
          </div>
        )}

        {WIZARD_STEPS.map((step) => {
          const answer = answers[step.section];
          if (!answer) return null;
          return (
            <div key={step.section} style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary-light)", marginBottom: 6 }}>
                {step.section}
              </h4>
              <div style={{
                padding: "12px 16px",
                background: "var(--color-primary-surface)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14, lineHeight: 1.7,
                borderLeft: "3px solid var(--color-primary-light)",
              }}>
                {answer}
              </div>
            </div>
          );
        })}

        {isComplete && !submitted && (
          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={handleSubmit}>📤 申請を提出する</button>
            <button 
              className="btn btn-accent" 
              onClick={handleAiReview} 
              disabled={isReviewing}
            >
              {isReviewing ? "📋 診断中..." : "🤖 AI品質チェックを実行"}
            </button>
            <button className="btn btn-outline">Word形式でダウンロード</button>
          </div>
        )}

        {/* AI診断結果表示セクション (NEW) */}
        {aiReview && (
          <div className="card fade-in" style={{ marginTop: 32, border: "2px solid var(--color-accent-surface)", background: "#fffaf0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-accent)" }}>🤖 AI模擬審査員スコア</h3>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>推定採択確率</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: aiReview.adoption_probability >= 70 ? "var(--color-success)" : aiReview.adoption_probability >= 50 ? "var(--color-accent)" : "var(--color-error)" }}>
                  {aiReview.adoption_probability}%
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
              {/* レーダーチャート */}
              <div style={{ height: 240, background: "white", borderRadius: 12, padding: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                    { subject: "具体性", A: aiReview.scores.specificity === "S" ? 100 : aiReview.scores.specificity === "A" ? 85 : aiReview.scores.specificity === "B" ? 65 : 40 },
                    { subject: "論理一貫性", A: aiReview.scores.logic === "S" ? 100 : aiReview.scores.logic === "A" ? 85 : aiReview.scores.logic === "B" ? 65 : 40 },
                    { subject: "実現可能性", A: aiReview.scores.feasibility === "S" ? 100 : aiReview.scores.feasibility === "A" ? 85 : aiReview.scores.feasibility === "B" ? 65 : 40 },
                    { subject: "差別化", A: aiReview.scores.differentiation === "S" ? 100 : aiReview.scores.differentiation === "A" ? 85 : aiReview.scores.differentiation === "B" ? 65 : 40 },
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" fontSize={11} />
                    <Radar name="品質" dataKey="A" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* フィードバックリスト */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {aiReview.feedback.slice(0, 3).map((f: any, i: number) => (
                  <div key={i} style={{ padding: "10px 12px", background: "white", borderRadius: 8, fontSize: 12, borderLeft: `4px solid ${f.score === "A" || f.score === "S" ? "var(--color-success)" : "var(--color-accent)"}` }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{f.area} (ランク: {f.score})</div>
                    <div style={{ color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{f.message}</div>
                  </div>
                ))}
              </div>
            </div>

            {aiReview.critical_improvements?.length > 0 && (
              <div style={{ marginTop: 20, padding: 16, background: "#fff5f5", borderRadius: 12, border: "1px solid #feb2b2" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#c53030", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span> 採択率向上のための最優先課題
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#9b2c2c", lineHeight: 1.6 }}>
                  {aiReview.critical_improvements.map((msg: string, i: number) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {submitted && (
          <div style={{ marginTop: 24, padding: "20px", background: "#c6f6d5", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#22543d" }}>申請が提出されました</h3>
            <p style={{ fontSize: 14, color: "#276749", marginTop: 8 }}>ダッシュボードで進捗を確認できます。</p>
            <a href="/" className="btn btn-primary" style={{ marginTop: 16 }}>ダッシュボードに戻る</a>
          </div>
        )}

        {/* 必要書類チェックリスト */}
        {subsidyInfo && subsidyInfo.required_documents?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📎 必要書類チェックリスト</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subsidyInfo.required_documents.map((doc, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "8px 12px", background: "var(--color-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}>
                  <input type="checkbox" />
                  <span>{doc.name}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: "auto" }}>({doc.format})</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>申請書を作る</h1>
        <p>
          {subsidyInfo
            ? `「${subsidyInfo.title}」の事業計画書を対話形式で作成します`
            : "対話形式で質問に答えるだけで、事業計画書を自動生成します"}
        </p>
      </div>

      {/* 進捗バー */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>
            進捗: {Math.min(stepIndex + (isComplete ? 1 : 0), WIZARD_STEPS.length)}/{WIZARD_STEPS.length}
          </span>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {isComplete ? "完了" : `Step ${stepIndex + 1}: ${WIZARD_STEPS[stepIndex]?.section}`}
          </span>
        </div>
        <div className="score-bar-container" style={{ height: 6 }}>
          <div className="score-bar" style={{
            width: `${((stepIndex + (isComplete ? 1 : 0)) / WIZARD_STEPS.length) * 100}%`,
            background: isComplete
              ? "var(--color-success)"
              : "linear-gradient(90deg, var(--color-primary-light), var(--color-primary-lighter))",
          }} />
        </div>
      </div>

      {/* チャット + プレビュー */}
      <div className="chat-container">
        {/* 左: チャット */}
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", fontWeight: 700, fontSize: 15 }}>
            対話ウィザード
          </div>
          <div className="chat-messages" style={{ flex: 1 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
            ))}
          </div>
          {!isComplete && (
            <div className="chat-input-area">
              <input
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="ここに入力してください..."
              />
              <button className="btn btn-primary" onClick={handleSend}>送信</button>
            </div>
          )}
        </div>

        {/* 右: プレビュー */}
        <div className="card" style={{ overflow: "auto" }}>
          <div style={{ padding: "0" }}>
            {Object.keys(answers).length > 0 ? (
              generatePreview()
            ) : (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                <p style={{ fontSize: 14 }}>左のチャットで質問に答えると、</p>
                <p style={{ fontSize: 14 }}>ここに事業計画書のプレビューが表示されます</p>
                {subsidyInfo && (
                  <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--color-primary-surface)", borderRadius: "var(--radius-sm)", display: "inline-block", textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>申請先</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{subsidyInfo.title}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
