"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useCompany } from "../../../components/SidebarLayout";

const API = "http://localhost:8081/api";

interface RequiredDoc {
  name: string;
  format: string;
  description: string;
}

interface ApplicationCase {
  id: string;
  subsidy_id: string;
  company_id: string;
  specific_documents: any[];
}

interface Subsidy {
  id: string;
  title: string;
  required_documents: RequiredDoc[];
  submission_guide: any;
}

export default function DocumentManagementPage() {
  const { id: caseId } = useParams();
  const { selected } = useCompany();
  
  const [appCase, setAppCase] = useState<ApplicationCase | null>(null);
  const [subsidy, setSubsidy] = useState<Subsidy | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<RequiredDoc | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const caseRes = await fetch(`${API}/cases/${caseId}`);
      const caseData = await caseRes.json();
      setAppCase(caseData);

      const subRes = await fetch(`${API}/subsidies/${caseData.subsidy_id}`);
      const subData = await subRes.json();
      setSubsidy(subData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [caseId]);

  async function generateDraft(doc: RequiredDoc) {
    setGeneratingFor(doc.name);
    setSelectedDoc(doc);
    setDraft(null);
    try {
      const res = await fetch(`${API}/cases/${caseId}/documents/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_name: doc.name,
          doc_description: doc.description,
          user_context: ""
        })
      });
      const data = await res.json();
      setDraft(data.draft);
    } catch (err) {
      console.error(err);
      alert("ドラフトの生成に失敗しました");
    } finally {
      setGeneratingFor(null);
    }
  }

  if (loading) return <div>読み込み中...</div>;
  if (!appCase || !subsidy) return <div>案件が見つかりません</div>;

  const uploadedDocs = appCase.specific_documents || [];
  
  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <a href="/applications" style={{ color: "var(--color-primary)", textDecoration: "none", fontSize: 14 }}>← 戻る</a>
        </div>
        <h1>申請書類ハブ</h1>
        <p>{subsidy.title} の提出に必要なすべての書類を準備します。</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* 左側：必要書類チェックリスト */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>📋 必要書類チェックリスト</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {subsidy.required_documents.map((doc, idx) => {
              const matches = uploadedDocs.filter(ud => ud.file_name.includes(doc.name) || ud.doc_type === doc.name);
              const isUploaded = matches.length > 0;
              
              return (
                <div key={idx} className="card" style={{ 
                  padding: 20, 
                  borderLeft: isUploaded ? "4px solid var(--color-success)" : "4px solid #cbd5e0",
                  background: isUploaded ? "#f0fff4" : "#fff"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{isUploaded ? "✅" : "📄"}</span>
                        <h3 style={{ fontSize: 15, fontWeight: 800 }}>{doc.name}</h3>
                        <span style={{ fontSize: 10, padding: "2px 6px", background: "#edf2f7", borderRadius: 4 }}>{doc.format}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{doc.description}</p>
                    </div>
                    {isUploaded ? (
                      <span style={{ fontSize: 12, color: "var(--color-success)", fontWeight: 700 }}>準備完了</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--color-warning)", fontWeight: 700 }}>未対応</span>
                    )}
                  </div>

                  <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => generateDraft(doc)}
                      disabled={generatingFor === doc.name}
                    >
                      {generatingFor === doc.name ? "AI生成中..." : "✨ AIドラフト作成"}
                    </button>
                    <button className="btn btn-sm btn-outline">ファイルをアップロード</button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="card" style={{ marginTop: 32, background: "var(--color-primary-surface)", border: "1px solid #bee3f8" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>🛡️ 共通書類 (Vault)</h3>
              <p style={{ fontSize: 12, lineHeight: 1.6 }}>
                登記簿謄本、納税証明書などは企業DNA（Document Vault）から自動参照されます。
                有効期限が切れている場合は警告が表示されます。
              </p>
              <button className="btn btn-sm btn-outline" style={{ marginTop: 12 }}>Vaultを確認</button>
          </div>
        </div>

        {/* 右側：AIプレビュー・エディタ */}
        <div style={{ position: "sticky", top: 20, height: "calc(100vh - 40px)", display: "flex", flexDirection: "column" }}>
          <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
            <div className="card-header" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
              <div className="card-title">✨ AI生成プレビュー {selectedDoc && `: ${selectedDoc.name}`}</div>
            </div>
            <div style={{ flex: 1, padding: 24, overflowY: "auto", background: "#f8fafc", fontSize: 14, lineHeight: 1.8 }}>
              {draft ? (
                <div style={{ whiteSpace: "pre-wrap" }} className="markdown-body">
                  {draft}
                </div>
              ) : generatingFor ? (
                <div style={{ textAlign: "center", paddingTop: 100 }}>
                  <div className="spinner" style={{ marginBottom: 16 }}></div>
                  <p>AIが申請者の魂を書類に込めています...<br/>(約30秒〜1分程度かかります)</p>
                </div>
              ) : (
                <div style={{ textAlign: "center", paddingTop: 100, color: "var(--color-text-muted)" }}>
                  <span style={{ fontSize: 48 }}>📖</span>
                  <p style={{ marginTop: 16 }}>左のリストから「AIドラフト作成」を選択してください。</p>
                </div>
              )}
            </div>
            {draft && (
              <div style={{ padding: 16, borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button className="btn btn-sm btn-outline">コピー</button>
                <button className="btn btn-sm btn-primary">Word形式で保存</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
