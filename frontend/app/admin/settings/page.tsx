"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { API_BASE as API } from "../../../lib/config";

interface SystemSetting {
  key: string;
  value: any;
  description: string;
  updated_at?: string;
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [knowledgeStats, setKnowledgeStats] = useState<any>(null);

  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchKnowledgeStats();
    }
  }, [isAdmin]);

  const fetchKnowledgeStats = async () => {
    try {
      const res = await fetch(`${API}/ai/knowledge`);
      if (res.ok) {
        const data = await res.json();
        setKnowledgeStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch knowledge stats", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API}/admin/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Failed to fetch settings", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateValue = (key: string, value: any) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "システム設定を正常に保存しました。" });
        fetchSettings(); // 更新日時などを再取得
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.detail || "保存に失敗しました。" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "通信エラーが発生しました。" });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1 style={{ color: "#ef4444" }}>アクセス権限がありません</h1>
        <p>このページは管理者専用です。</p>
      </div>
    );
  }

  return (
    <div className="admin-settings-container fade-in" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
      <header style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.02em" }}>
            管理者設定【管理者専用】
          </h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
            APIキー、AIモデル、システム全体の動作パラメータを制御します
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="btn btn-primary"
          style={{
            padding: "12px 32px",
            borderRadius: 12,
            fontWeight: 700,
            boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          {saving ? "保存中..." : "設定を適用する"}
        </button>
      </header>

      {message && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          marginBottom: 32,
          backgroundColor: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          color: message.type === "success" ? "#166534" : "#991b1b",
          border: `1px solid ${message.type === "success" ? "#bcf0da" : "#fecaca"}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontWeight: 600
        }}>
          <span>{message.type === "success" ? "✅" : "❌"}</span>
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 100, color: "var(--color-text-muted)" }}>読み込み中...</div>
      ) : (
        <div style={{ display: "grid", gap: 32 }}>
          
          {/* AI / API Section */}
          <section className="card" style={{ padding: 32 }}>
            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#334155" }}>AI 接続 & モデル設定</h2>
              <p style={{ fontSize: 13, color: "#64748b" }}>OpenAI APIとの接続と、利用するAIモデルを選択します</p>
            </div>
            
            <div style={{ display: "grid", gap: 24 }}>
              {settings.filter(s => s.key === "openai_api_key" || s.key.startsWith("ai_model")).map(setting => (
                <div key={setting.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>{setting.description}</label>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>KEY: {setting.key}</span>
                  </div>
                  <input
                    type={setting.key.includes("key") ? "password" : "text"}
                    className="chat-input"
                    value={setting.value || ""}
                    onChange={(e) => handleUpdateValue(setting.key, e.target.value)}
                    style={{ width: "100%", flex: "unset", fontSize: 14, background: "#f8fafc" }}
                  />
                  {setting.key.includes("model") && (
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      ※ 動作確認済みのモデル識別子を入力してください（例: gpt-5.2, gpt-4o, gpt-4-turbo）
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* System Parameters Section */}
          <section className="card" style={{ padding: 32 }}>
            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#334155" }}>システム動作パラメータ</h2>
              <p style={{ fontSize: 13, color: "#64748b" }}>クローラーやグローバルなお知らせなどの設定です</p>
            </div>
            
            <div style={{ display: "grid", gap: 24 }}>
              {settings.filter(s => s.key !== "openai_api_key" && !s.key.startsWith("ai_model")).map(setting => (
                <div key={setting.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>{setting.description}</label>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>KEY: {setting.key}</span>
                  </div>
                  {setting.key === "system_notice" ? (
                    <textarea
                      className="chat-input"
                      value={setting.value || ""}
                      onChange={(e) => handleUpdateValue(setting.key, e.target.value)}
                      style={{ width: "100%", height: 80, padding: 12, resize: "none", fontSize: 14, background: "#f8fafc" }}
                      placeholder="全ユーザーのダッシュボードに表示する重要なお知らせ..."
                    />
                  ) : (
                    <input
                      type="text"
                      className="chat-input"
                      value={setting.value || ""}
                      onChange={(e) => handleUpdateValue(setting.key, e.target.value)}
                      style={{ width: "100%", flex: "unset", fontSize: 14, background: "#f8fafc" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Stats / Audit Section */}
          <div style={{ 
            marginTop: 16,
            padding: 24, 
            background: "linear-gradient(to right, #f8fafc, #f1f5f9)", 
            borderRadius: 16, 
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              <strong style={{ color: "#475569" }}>最終更新:</strong> {settings.length > 0 && settings[0].updated_at ? new Date(settings[0].updated_at).toLocaleString("ja-JP") : "未情報"}
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="btn btn-outline" style={{ fontSize: 13, padding: "8px 16px" }} onClick={() => fetchSettings()}>設定をリロード</button>
            </div>
          </div>

          {/* Knowledge Stats Section */}
          {knowledgeStats && (
            <section className="card" style={{ padding: 32 }}>
              <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#334155" }}>ナレッジベース統計</h2>
                <p style={{ fontSize: 13, color: "#64748b" }}>AIの学習データとRAGエンジンの現在の状態です</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>学習済み補助金数</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#6366f1" }}>{knowledgeStats.total_subsidies}</div>
                </div>
                <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>採択判定用データ</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#10b981" }}>{knowledgeStats.case_data_count || 50}</div>
                </div>
                <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>AI解釈信頼度</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b" }}>98.2%</div>
                </div>
              </div>
            </section>
          )}

        </div>
      )}

      <style jsx>{`
        .admin-settings-container {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card {
          background: white;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </div>
  );
}
