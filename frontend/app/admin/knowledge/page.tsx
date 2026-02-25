"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCompany } from "../../components/SidebarLayout";

import { API_BASE as API } from "../../../lib/config";

type RealCase = {
  id: string;
  filename: string;
  result: string;
  year: number;
  text_length: number;
  created_at: string;
};

type SubsidyMin = {
  id: string;
  title: string;
  subsidy_code: string;
};

export default function KnowledgeBasePage() {
  const { data: session, status } = useSession();
  const { selected: company } = useCompany();
  const [cases, setCases] = useState<RealCase[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyMin[]>([]);
  
  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      window.location.href = "/";
    }
  }, [status, isAdmin]);
  
  const [selectedSubsidyId, setSelectedSubsidyId] = useState("");
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploadResult, setUploadResult] = useState("ADOPTED");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // チャット用ステート
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // マスタデータの取得
  useEffect(() => {
    fetch(`${API}/subsidies/`)
      .then(res => res.json())
      .then(data => {
        setSubsidies(data);
        if (data.length > 0) setSelectedSubsidyId(data[0].id);
      })
      .catch(console.error);
  }, []);

  // 自社の実データ取得
  const fetchMyCases = () => {
    if (!company) return;
    fetch(`${API}/knowledge/my_cases?company_id=${company.id}`)
      .then(res => res.json())
      .then(data => setCases(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchMyCases();
  }, [company]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!company) {
      setUploadStatus({ type: 'error', message: '左メニューから企業を選択してください。' });
      return;
    }
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'ファイルを選択してください。' });
      return;
    }
    if (!selectedSubsidyId) {
      setUploadStatus({ type: 'error', message: '対象の補助金を選択してください。' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("company_id", company.id);
    formData.append("subsidy_id", selectedSubsidyId);
    formData.append("year", uploadYear.toString());
    formData.append("result", uploadResult);
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API}/knowledge/upload_success_case`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "アップロードに失敗しました");
      }

      setUploadStatus({ type: 'success', message: '学習用データの抽出と保存が完了しました。' });
      setSelectedFile(null);
      fetchMyCases();
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // チャット送信
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg,
          context: { 
            company: company,
            selected_subsidy: subsidies.find(s => s.id === selectedSubsidyId)
          } 
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "エラーが発生しました。接続を確認してください。" }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!company) {
    return (
      <div className="page-header">
        <h1 className="page-title">AIナレッジ & コンサルティング</h1>
        <p className="page-description" style={{color: 'red'}}>
          左側のメニューから企業を選択してください。
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">AIナレッジ & コンサルティング (RAG)</h1>
        <p className="page-description">
          採択事例データベースとAIチャットを統合。自社のナレッジを蓄え、AIアドバイザーから戦略的な助言を受けられます。
        </p>
      </div>

      <div className="dashboard-grid">
        {/* 左側：アップロードフォーム */}
        <div className="card" style={{ gridColumn: "span 1" }}>
          <div className="card-header">
            <h2 className="card-title">実績書類の学習 (Knowledge)</h2>
          </div>
          <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">対象補助金</label>
              <select className="form-select" value={selectedSubsidyId} onChange={(e) => setSelectedSubsidyId(e.target.value)}>
                {subsidies.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">審査結果</label>
              <select className="form-select" value={uploadResult} onChange={(e) => setUploadResult(e.target.value)}>
                <option value="ADOPTED">採択（成功事例として学習）</option>
                <option value="REJECTED">不採択（失敗・反面教師として学習）</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">アップロード</label>
              <input type="file" onChange={handleFileChange} className="form-input" style={{ fontSize: 12, padding: "8px" }} />
            </div>
            {uploadStatus && (
              <div style={{ padding: "10px", borderRadius: "6px", fontSize: "12px", background: uploadStatus.type === 'success' ? '#f0fff4' : '#fff5f5', color: uploadStatus.type === 'success' ? '#2f855a' : '#c53030' }}>
                {uploadStatus.message}
              </div>
            )}
            <button className="btn btn-primary" onClick={handleUpload} disabled={isUploading || !selectedFile} style={{ width: "100%", justifyContent: "center" }}>
              {isUploading ? "解析中..." : "AIに学習させる"}
            </button>
          </div>
        </div>

        {/* 右側：AI戦略アドバイザー（RAGチャット） */}
        <div className="card" style={{ gridColumn: "span 2", display: "flex", flexDirection: "column" }}>
          <div className="card-header" style={{ background: "linear-gradient(135deg, var(--color-accent), #f6ad55)", color: "white" }}>
            <h2 className="card-title" style={{ color: "white" }}>💡 AI戦略アドバイザーに相談</h2>
            <p style={{ fontSize: 11, opacity: 0.9 }}>事例データベースから最適な知見を抽出して回答します</p>
          </div>
          <div className="chat-container" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px", height: "450px" }}>
            <div style={{ flex: 1, overflowY: "auto", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: "40px" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                  <p style={{ fontSize: 14 }}>「自分に合う補助金は？」「採択されるコツは？」<br/>何でも聞いてください。過去の採択実績から回答します。</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ 
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%', padding: '10px 16px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.6,
                  background: m.role === 'user' ? 'var(--color-primary)' : '#f1f5f9',
                  color: m.role === 'user' ? 'white' : 'var(--color-text-main)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {m.text}
                </div>
              ))}
              {isTyping && <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '10px 16px', borderRadius: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>AIが過去の事例を検索中...</div>}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" className="form-input" placeholder="質問を入力..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
              <button className="btn btn-primary" onClick={handleSendMessage} disabled={isTyping || !input.trim()}>送信</button>
            </div>
          </div>
        </div>

        {/* 下段：学習済みナレッジ一覧 */}
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="card-header">
            <h2 className="card-title">学習済みナレッジ一覧 <span className="badge badge-success" style={{ marginLeft: 8 }}>{cases.length}</span></h2>
          </div>
          <div className="card-content">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ファイル名</th>
                  <th>年度</th>
                  <th>抽出文字数</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.filename.replace("【実データ登録】", "")}</td>
                    <td>{c.year}</td>
                    <td>{c.text_length} 文字</td>
                    <td>
                      <span className={`status-badge ${c.result === 'ADOPTED' ? 'eligible' : 'ineligible'}`}>
                        {c.result === 'ADOPTED' ? '採択' : '不採択'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
