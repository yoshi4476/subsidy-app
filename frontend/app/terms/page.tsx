"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:8081/api";

interface Term {
  id: string;
  term: string;
  legal_definition: string;
  simplified_text: string;
  example: string | null;
  related_terms: string[];
}

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [selected, setSelected] = useState<Term | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/terms`).then((r) => r.json()).then((data) => {
      setTerms(data);
      if (data.length > 0) setSelected(data[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = terms.filter((t) =>
    t.term.includes(search) || t.simplified_text.includes(search)
  );

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-secondary)" }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>用語辞書</h1>
        <p>難しい補助金用語をわかりやすく解説します</p>
      </div>

      {/* おすすめ用語 (Featured Terms) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span>🌟</span> おすすめの重要用語:
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["gBizID (GビズID)", "付加価値額", "経営革新計画", "交付決定", "労働生産性"].map((tag) => (
            <button
              key={tag}
              onClick={() => setSearch(tag)}
              style={{
                padding: "8px 16px",
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--color-primary-light)")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 検索 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ position: "relative", maxWidth: 500 }}>
          <input
            className="chat-input"
            style={{ width: "100%", paddingLeft: 40 }}
            placeholder="用語を検索 (例: 補助率, BCP, 採択...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }}>🔍</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
        {/* 左: 用語リスト */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              className="card"
              style={{
                cursor: "pointer",
                padding: "12px 16px",
                borderLeft: selected?.id === t.id ? "4px solid var(--color-primary-light)" : "4px solid transparent",
                background: selected?.id === t.id ? "var(--color-primary-surface)" : "var(--color-surface)",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.term}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.simplified_text.substring(0, 40)}...
              </div>
            </div>
          ))}
        </div>

        {/* 右: 詳細 */}
        {selected && (
          <div className="card fade-in">
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-primary)", marginBottom: 20 }}>
              {selected.term}
            </h2>

            {/* わかりやすい説明 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-success)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                わかりやすい説明
              </div>
              <div style={{
                padding: "16px 20px",
                background: "linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)",
                borderRadius: "var(--radius)",
                fontSize: 15,
                lineHeight: 1.8,
                fontWeight: 500,
              }}>
                {selected.simplified_text}
              </div>
            </div>

            {/* 法律上の定義 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                法律上の定義
              </div>
              <div style={{
                padding: "12px 16px",
                background: "#f7fafc",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                lineHeight: 1.7,
                color: "var(--color-text-secondary)",
                borderLeft: "3px solid var(--color-border)",
              }}>
                {selected.legal_definition}
              </div>
            </div>

            {/* 具体例 */}
            {selected.example && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  具体例
                </div>
                <div style={{
                  padding: "12px 16px",
                  background: "linear-gradient(135deg, #fffaf0 0%, #fefcbf 100%)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  borderLeft: "3px solid var(--color-accent)",
                }}>
                  {selected.example}
                </div>
              </div>
            )}

            {/* 関連用語 */}
            {selected.related_terms.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  関連用語
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selected.related_terms.map((rt, i) => (
                    <span
                      key={i}
                      onClick={() => { const found = terms.find((t) => t.term === rt); if (found) setSelected(found); }}
                      style={{
                        padding: "4px 12px",
                        background: "var(--color-primary-surface)",
                        borderRadius: 20,
                        fontSize: 13,
                        cursor: "pointer",
                        color: "var(--color-primary-light)",
                        fontWeight: 500,
                        transition: "all 0.2s",
                      }}
                    >
                      {rt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
