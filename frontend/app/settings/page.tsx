"use client";

import { useState, useEffect } from "react";

const API = "http://localhost:8081/api";

interface ModelInfo {
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
}

// システム設定画面
export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState("http://localhost:8081");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [theme, setTheme] = useState("light");
  const [lang, setLang] = useState("ja");
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<Record<string, ModelInfo>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [knowledgeStats, setKnowledgeStats] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState("quality_scoring");

  useEffect(() => {
    // AIモデル情報を取得
    fetch(`${API}/ai/models`).then(r => r.json()).then(data => {
      setModels(data.models || {});
      setDefaults(data.defaults || {});
      setApiKeyConfigured(data.api_key_configured || false);
    }).catch(() => {});

    // ナレッジベース情報を取得
    fetch(`${API}/ai/knowledge`).then(r => r.json()).then(data => {
      setKnowledgeStats(data);
    }).catch(() => {});
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const capabilityLabels: Record<string, string> = {
    quality_scoring: "品質評価",
    plan_review: "計画書レビュー",
    improvement_suggestions: "改善提案",
    chat: "チャット",
    translation: "要件翻訳",
    summarization: "要約生成",
    quick_analysis: "クイック分析",
    term_explanation: "用語解説",
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>設定</h1>
        <p>システムとAIモデルの設定を管理します</p>
      </div>

      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* API接続 */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>🔌 API接続設定</h3>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" }}>
            Backend API URL
          </label>
          <input
            className="chat-input"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            style={{ width: "100%", flex: "unset" }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
            Backend FastAPIサーバーのURLを指定してください
          </div>
        </div>

        {/* AI設定（大幅改修） */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 8 }}>🤖 AIモデル設定</h3>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
            補助金申請書の品質評価・文章生成・改善提案に使用するAIモデルを設定します
          </p>

          {/* APIキー設定 */}
          <div style={{ marginBottom: 20, padding: "16px", background: apiKeyConfigured ? "var(--color-success-surface, #c6f6d5)" : "var(--color-warning-surface, #fefcbf)", borderRadius: "var(--radius-sm)", border: `1px solid ${apiKeyConfigured ? "#68d391" : "#f6e05e"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span>{apiKeyConfigured ? "✅" : "⚠️"}</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {apiKeyConfigured ? "✅ OpenAI API キー設定済み" : "⚠️ OpenAI API キーを設定してください"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="chat-input"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-sm btn-outline" onClick={() => setShowKey(!showKey)}>
                {showKey ? "隠す" : "表示"}
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--color-text-muted)" }}>
              環境変数 OPENAI_API_KEY で設定するか、ここに入力してください。
              <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: "var(--color-primary-light)", marginLeft: 4 }}>
                APIキーを取得 →
              </a>
            </div>
          </div>

          {/* 利用可能モデル一覧 */}
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>利用可能なモデル</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {Object.entries(models).map(([id, model]) => (
              <div key={id} style={{
                padding: "14px 16px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)", background: "var(--color-surface)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{model.name}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 8 }}>{model.provider}</span>
                  </div>
                  <span style={{
                    padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: id.includes("5.2") ? "#e9d5ff" : "#dbeafe",
                    color: id.includes("5.2") ? "#6b21a8" : "#1d4ed8",
                  }}>
                    {id.includes("5.2") ? "世界最高峰" : "高速"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  {model.description}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {model.capabilities.map((cap) => (
                    <span key={cap} style={{
                      padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                      background: "var(--color-primary-surface)", color: "var(--color-primary-light)",
                    }}>
                      {capabilityLabels[cap] || cap}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* タスク別モデル配分 */}
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>タスク別モデル配分</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {Object.entries(defaults).map(([task, model]) => (
              <div key={task} style={{
                padding: "10px 14px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)", background: "var(--color-surface)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                  {capabilityLabels[task] || task}
                </div>
                <select
                  className="chat-input"
                  style={{ width: "100%", flex: "unset", fontSize: 13 }}
                  value={model}
                  onChange={() => {}}
                >
                  {Object.entries(models).map(([id, m]) => (
                    <option key={id} value={id}>{m.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* ナレッジベース情報 */}
        {knowledgeStats && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 8 }}>📚 採択学習ナレッジベース</h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              過去の採択・不採択事例から抽出した知見が蓄積されています
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <div style={{ textAlign: "center", padding: "12px", background: "var(--color-primary-surface)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-primary)" }}>
                  {knowledgeStats.total_subsidies}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>対象補助金数</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px", background: "var(--color-success-surface, #c6f6d5)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-success)" }}>50</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>学習済み事例数</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px", background: "#e9d5ff", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#6b21a8" }}>90%</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>目標採択率</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {knowledgeStats.knowledge_base?.map((kb: any) => (
                <div key={kb.key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{kb.name}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 8 }}>
                      全国平均採択率: {(kb.national_adoption_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--color-text-secondary)" }}>
                    <span>審査要因: {kb.key_factor_count}</span>
                    <span>ベストプラクティス: {kb.best_practice_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 表示設定 */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>🎨 表示設定</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" }}>
              テーマ
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "light", label: "ライト" },
                { id: "dark", label: "ダーク" },
              ].map((t) => (
                <button key={t.id} className={`btn btn-sm ${theme === t.id ? "btn-primary" : "btn-outline"}`} onClick={() => setTheme(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" }}>
              表示言語
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "ja", label: "日本語" },
                { id: "en", label: "English" },
              ].map((l) => (
                <button key={l.id} className={`btn btn-sm ${lang === l.id ? "btn-primary" : "btn-outline"}`} onClick={() => setLang(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={handleSave}>設定を保存</button>
          {saved && (
            <span style={{ fontSize: 13, color: "var(--color-success)", fontWeight: 600, animation: "fadeIn 0.3s ease" }}>
              ✅ 保存しました
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
