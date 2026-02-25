"use client";

import { useEffect, useState, useRef } from "react";
import SidebarLayout, { useCompany } from "@/app/components/SidebarLayout";

const API = "http://localhost:8081/api";

// --- 型定義 ---
interface Doc {
  id: string;
  doc_type: string;
  file_name: string;
  mime_type: string;
  fiscal_year?: number;
  expiry_date?: string;
  category: string;
  upload_date: string;
  ocr_extracted?: boolean;
}

// --- 書類タイプ定義 ---
const DOC_TYPES: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  REGISTRY_COPY:    { label: "履歴事項全部証明書", emoji: "🏢", bg: "#f3e8ff", text: "#7c3aed" },
  TAX_CERTIFICATE:  { label: "納税証明書",       emoji: "🧾", bg: "#ecfdf5", text: "#059669" },
  FINANCIAL_REPORT: { label: "決算書",           emoji: "📊", bg: "#eff6ff", text: "#2563eb" },
  OFFICIAL_SEAL:    { label: "印鑑証明書",       emoji: "🔏", bg: "#fef2f2", text: "#dc2626" },
  BUSINESS_PLAN:    { label: "事業計画書",       emoji: "📋", bg: "#fffbeb", text: "#d97706" },
  OTHER:            { label: "その他",           emoji: "📄", bg: "#f8fafc", text: "#64748b" },
};
const getType = (t: string) => DOC_TYPES[t] || DOC_TYPES.OTHER;

// --- 日付ヘルパー ---
const isExpired = (d?: string) => d ? new Date(d) < new Date() : false;
const isExpiringSoon = (d?: string) => {
  if (!d) return false;
  const diff = (new Date(d).getTime() - Date.now()) / 86400000;
  return diff > 0 && diff <= 30;
};
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("ja-JP") : "—";
const daysLeft = (d?: string) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

export default function CabinetPage() {
  const { selected } = useCompany();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // アップロード用
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upType, setUpType] = useState("OTHER");
  const [upExpiry, setUpExpiry] = useState("");
  const [upCat, setUpCat] = useState("COMMON");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (selected) loadDocs(); }, [selected]);

  async function loadDocs() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/companies/${selected?.id}/documents`);
      if (r.ok) setDocs(await r.json());
    } catch {} finally { setLoading(false); }
  }

  async function handleUpload() {
    if (!upFile || !selected) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", upFile);
      fd.append("doc_type", upType);
      fd.append("category", upCat);
      if (upExpiry) fd.append("expiry_date", upExpiry);
      const r = await fetch(`${API}/companies/${selected.id}/documents`, { method: "POST", body: fd });
      if (r.ok) { setModal(false); setUpFile(null); setUpType("OTHER"); setUpExpiry(""); loadDocs(); }
    } catch {} finally { setUploading(false); }
  }

  async function handleDelete(id: string) {
    if (!selected || !confirm("この書類を削除しますか？")) return;
    await fetch(`${API}/companies/${selected.id}/documents/${id}`, { method: "DELETE" });
    loadDocs();
  }

  const filtered = docs.filter(d => {
    if (filter !== "ALL" && d.category !== filter) return false;
    if (search && !d.file_name.includes(search) && !getType(d.doc_type).label.includes(search)) return false;
    return true;
  });

  const stats = {
    total: docs.length,
    expired: docs.filter(d => isExpired(d.expiry_date)).length,
    soon: docs.filter(d => isExpiringSoon(d.expiry_date)).length,
    valid: docs.filter(d => d.expiry_date ? !isExpired(d.expiry_date) : true).length,
  };

  return (
    <SidebarLayout>
      <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📁</div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>e-Cabinet</h1>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>補助金申請に必要な書類を一元管理・期限管理</p>
              </div>
            </div>
            {selected && (
              <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 12px", fontSize: 13 }}>
                <span style={{ color: "#94a3b8" }}>🏢</span>
                <span style={{ fontWeight: 600, color: "#334155" }}>{selected.legal_name}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setModal(true)}
            style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            ⬆ 書類をアップロード
          </button>
        </div>

        {/* 統計カード */}
        {docs.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "総書類数", val: stats.total, color: "#334155", icon: "📄" },
              { label: "有効",     val: stats.valid,   color: "#059669", icon: "✅" },
              { label: "期限間近", val: stats.soon,    color: "#d97706", icon: "⏰" },
              { label: "期限切れ", val: stats.expired, color: "#dc2626", icon: "⚠️" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span>{s.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* 検索バー */}
        {docs.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              type="text" placeholder="🔍 ファイル名で検索..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", background: "white" }}
            />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, background: "white", cursor: "pointer" }}>
              <option value="ALL">すべて</option>
              <option value="COMMON">共通書類</option>
              <option value="SUBSIDY_SPECIFIC">補助金固有</option>
            </select>
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div style={{ textAlign: "center", padding: 80, color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite" }}>⏳</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#475569" }}>読み込み中...</p>
          </div>
        )}

        {/* 未選択 */}
        {!loading && !selected && (
          <div style={{ textAlign: "center", padding: 80, background: "white", borderRadius: 16, border: "2px dashed #e2e8f0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#64748b" }}>企業を選択してください</p>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>サイドバーから対象企業を選択</p>
          </div>
        )}

        {/* 空状態 */}
        {!loading && selected && docs.length === 0 && (
          <div style={{ textAlign: "center", padding: 80, background: "white", borderRadius: 16, border: "2px dashed #e2e8f0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginBottom: 4 }}>書類がまだ登録されていません</p>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>最初の書類をアップロードして管理を始めましょう</p>
            <button onClick={() => setModal(true)}
              style={{ padding: "10px 24px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ⬆ 最初の書類をアップロード
            </button>
          </div>
        )}

        {/* 書類グリッド */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filtered.map(doc => {
              const t = getType(doc.doc_type);
              const exp = isExpired(doc.expiry_date);
              const soon = isExpiringSoon(doc.expiry_date);
              const days = daysLeft(doc.expiry_date);
              return (
                <div key={doc.id} style={{
                  background: "white", borderRadius: 14, border: `1.5px solid ${exp ? "#fecaca" : soon ? "#fed7aa" : "#f1f5f9"}`,
                  overflow: "hidden", transition: "box-shadow 0.2s",
                }}>
                  {/* ステータスバー */}
                  <div style={{ height: 3, background: exp ? "#ef4444" : soon ? "#f59e0b" : "#22c55e" }} />
                  <div style={{ padding: 20 }}>
                    {/* ヘッダー */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{t.emoji}</div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={doc.file_name}>{doc.file_name}</p>
                          <span style={{ fontSize: 10, fontWeight: 700, color: t.text, background: t.bg, padding: "2px 8px", borderRadius: 6, display: "inline-block", marginTop: 4 }}>{t.label}</span>
                        </div>
                      </div>
                      {/* ステータスバッジ */}
                      <span style={{
                        fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                        padding: "3px 8px", borderRadius: 8,
                        background: exp ? "#fef2f2" : soon ? "#fffbeb" : "#f0fdf4",
                        color: exp ? "#dc2626" : soon ? "#d97706" : "#16a34a",
                      }}>
                        {exp ? "⚠ 期限切れ" : soon ? `⏰ 残${days}日` : "✅ 有効"}
                      </span>
                    </div>

                    {/* 詳細情報 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginTop: 16 }}>
                      {[
                        { label: "カテゴリ", val: doc.category === "COMMON" ? "共通書類" : "補助金固有" },
                        { label: "アップロード", val: fmtDate(doc.upload_date) },
                        { label: "有効期限", val: fmtDate(doc.expiry_date) },
                        { label: "年度", val: doc.fiscal_year ? `${doc.fiscal_year}年度` : "—" },
                      ].map((item, i) => (
                        <div key={i}>
                          <span style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 1 }}>{item.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{item.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* アクションボタン */}
                    <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                      <button style={{ flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#6366f1", background: "#eef2ff", border: "none", borderRadius: 8, cursor: "pointer" }}>👁 表示</button>
                      <button onClick={() => handleDelete(doc.id)} style={{ flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "none", borderRadius: 8, cursor: "pointer" }}>🗑 削除</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ヒントセクション */}
        {!loading && selected && (
          <div style={{ marginTop: 40, padding: 24, background: "linear-gradient(135deg, #eef2ff, #faf5ff)", borderRadius: 16, border: "1px solid #e0e7ff" }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#312e81", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              ✨ e-Cabinet でできること
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { icon: "📎", title: "共通書類の再利用", desc: "登記簿や印鑑証明は複数の補助金申請で使い回せます" },
                { icon: "🔔", title: "期限切れアラート", desc: "有効期限が30日以内の書類を自動で警告します" },
                { icon: "🤖", title: "AI自動チェック", desc: "書類の内容が要件を満たしているかAIが事前判定" },
              ].map((h, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.8)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{h.icon}</div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{h.title}</h3>
                  <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* アップロードモーダル */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setModal(false)}>
          <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 480, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>📤 書類アップロード</h2>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column" as const, gap: 16 }}>
              {/* ファイル選択 */}
              <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #e2e8f0", borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer" }}>
                {upFile ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span>📄</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{upFile.name}</span>
                    <button onClick={e => { e.stopPropagation(); setUpFile(null); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>📁</div>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>クリックしてファイルを選択</p>
                    <p style={{ fontSize: 10, color: "#94a3b8", margin: "4px 0 0" }}>PDF, JPEG, PNG（最大10MB）</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => setUpFile(e.target.files?.[0] || null)} />

              {/* 書類タイプ */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 }}>書類タイプ</label>
                <select value={upType} onChange={e => setUpType(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13 }}>
                  {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>

              {/* カテゴリ＆有効期限 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 }}>カテゴリ</label>
                  <select value={upCat} onChange={e => setUpCat(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13 }}>
                    <option value="COMMON">共通書類</option>
                    <option value="SUBSIDY_SPECIFIC">補助金固有</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 }}>有効期限</label>
                  <input type="date" value={upExpiry} onChange={e => setUpExpiry(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13 }} />
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModal(false)} style={{ padding: "8px 16px", fontSize: 13, background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>キャンセル</button>
              <button onClick={handleUpload} disabled={!upFile || uploading}
                style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700, background: !upFile ? "#cbd5e1" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", border: "none", borderRadius: 8, cursor: upFile ? "pointer" : "not-allowed" }}>
                {uploading ? "⏳ アップロード中..." : "⬆ アップロード"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
