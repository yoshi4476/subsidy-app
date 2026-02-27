"use client";

import { useState, useEffect } from "react";
import { useCompany } from "@/app/components/SidebarLayout";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const API = "http://localhost:8081/api";

type TabType = "basic" | "financial" | "business" | "hr" | "documents";

export default function CorporateDNAPage() {
  const { selected, setSelected } = useCompany();
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 統合データステート
  const [dna, setDna] = useState<any>({
    company: null,
    financials: [],
    hr: null,
    profile: null,
  });

  // 書類管理ステート
  const [documents, setDocuments] = useState<any[]>([]);
  const [verificationResults, setVerificationResults] = useState<Record<string, any>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (selected) {
      loadDna();
      loadDocuments();
    }
  }, [selected]);

  async function loadDna() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/companies/${selected.id}/dna`);
      if (!res.ok) throw new Error("DNA data fetch failed");
      const data = await res.json();

      // 初期値の補完
      if (!data.financials || data.financials.length === 0) {
        const today = new Date();
        const year = today.getFullYear();
        data.financials = [
          { fiscal_year: year - 1, fiscal_period_start: `${year-1}-04-01`, fiscal_period_end: `${year}-03-31`, sales: 0, operating_profit: 0, ordinary_profit: 0, labor_cost: 0, depreciation: 0 },
          { fiscal_year: year - 2, fiscal_period_start: `${year-2}-04-01`, fiscal_period_end: `${year-1}-03-31`, sales: 0, operating_profit: 0, ordinary_profit: 0, labor_cost: 0, depreciation: 0 },
          { fiscal_year: year - 3, fiscal_period_start: `${year-3}-04-01`, fiscal_period_end: `${year-2}-03-31`, sales: 0, operating_profit: 0, ordinary_profit: 0, labor_cost: 0, depreciation: 0 },
        ];
      }
      if (!data.hr) {
        data.hr = {
          snapshot_date: new Date().toISOString().split('T')[0],
          employee_count_regular: 0,
          employee_count_part: 0,
          lowest_wage: 1000,
          employment_insurance: true,
          social_insurance: true,
          wage_raise_declared: false,
          average_age: 40,
          paid_leave_ratio: 50,
          training_system: "",
          training_expenses: 0
        };
      }
      if (!data.profile) {
        data.profile = {
          business_summary: "",
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: [],
          equipment_list: [],
          licenses: [],
          certifications: [],
          major_customers: [],
          patents_trademarks: [],
          dx_initiatives: "",
          gx_initiatives: "",
          social_contribution: ""
        };
      }
      setDna(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments() {
    if (!selected) return;
    try {
      const docs = await fetch(`${API}/companies/${selected.id}/documents`).then(r => r.json());
      setDocuments(docs);
    } catch (e) { console.error(e); }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/companies/${selected.id}/dna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dna),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setDna(updated);
      if (updated.company) {
          setSelected(updated.company);
      }
      alert("統合企業カルテ (DNA) を保存しました。AIの分析精度が向上しました。");
    } catch (e) {
      alert("保存に失敗しました");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const handleVerify = async (docId: string) => {
    if (!selected) return;
    setVerifyingId(docId);
    try {
      const res = await fetch(`${API}/companies/${selected.id}/documents/${docId}/verify`, { method: "POST" });
      const data = await res.json();
      setVerificationResults(prev => ({ ...prev, [docId]: { ...data.verification, doc_id: docId, extracted: data.extracted } }));
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingId(null);
    }
  };

  const updateDna = (path: string, value: any) => {
    const parts = path.split('.');
    const newDna = { ...dna };
    let current = newDna;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setDna({ ...newDna });
  };

  const updateFinancial = (index: number, field: string, value: any) => {
    const newFinancials = [...dna.financials];
    newFinancials[index] = { ...newFinancials[index], [field]: value };
    setDna({ ...dna, financials: newFinancials });
  };

  // 数値フォーマット用ヘルパー
  const fmt = (n: number) => n?.toLocaleString() ?? "0";

  if (!selected || loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-secondary)" }}>
      DNA情報を読み込み中...
    </div>
  );

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "basic", label: "基本DNA", icon: "🏢" },
    { id: "financial", label: "財務DNA", icon: "📊" },
    { id: "business", label: "事業DNA", icon: "💡" },
    { id: "hr", label: "人事DNA", icon: "👥" },
    { id: "documents", label: "証憑DNA", icon: "📁" },
  ];

  // 財務チャートデータ
  const chartData = [...(dna.financials || [])].reverse().map((f: any) => ({
    year: `${f.fiscal_year}年度`,
    sales: f.sales || 0,
    profit: f.operating_profit || 0,
    valueAdded: (f.operating_profit || 0) + (f.labor_cost || 0) + (f.depreciation || 0),
  }));

  return (
    <div className="fade-in">
      {/* ===== ページヘッダー ===== */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>統合企業カルテ DNA</h1>
          <p>{selected.legal_name} — 基本情報・財務・事業・人事を一元管理</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={loadDna}>リセット</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "💾 DNAを保存"}
          </button>
        </div>
      </div>

      {/* ===== タブナビゲーション ===== */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--color-surface)", padding: 6, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              background: activeTab === tab.id ? "var(--color-primary)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--color-text-secondary)",
              boxShadow: activeTab === tab.id ? "var(--shadow-sm)" : "none",
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================
          1. 基本DNA
         ================================================================ */}
      {activeTab === "basic" && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 24, padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <label style={{ ...labelStyle, marginBottom: 12 }}>事業種別</label>
                <div style={{ display: "flex", gap: 12 }}>
                    <button 
                        onClick={() => updateDna("company.business_category", "CORPORATION")}
                        className={`btn ${dna.company.business_category === "CORPORATION" ? "btn-primary" : "btn-outline"}`}
                        style={{ flex: 1, fontSize: 13 }}
                    >
                        🏢 法人（株式会社・合同会社等）
                    </button>
                    <button 
                        onClick={() => updateDna("company.business_category", "SOLE_PROPRIETOR")}
                        className={`btn ${dna.company.business_category === "SOLE_PROPRIETOR" ? "btn-primary" : "btn-outline"}`}
                        style={{ flex: 1, fontSize: 13 }}
                    >
                        👤 個人事業主・フリーランス
                    </button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>{dna.company.business_category === "SOLE_PROPRIETOR" ? "屋号・氏名" : "正式商号"}</label>
                <input
                  style={inputStyle}
                  value={dna.company.legal_name}
                  onChange={e => updateDna("company.legal_name", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>法人番号 {dna.company.business_category === "SOLE_PROPRIETOR" && "(任意)"}</label>
                {dna.company.business_category === "SOLE_PROPRIETOR" ? (
                    <input
                        style={inputStyle}
                        value={dna.company.corporate_number || ""}
                        onChange={e => updateDna("company.corporate_number", e.target.value)}
                        placeholder="持っている場合のみ入力"
                    />
                ) : (
                    <div style={{ ...inputStyle, background: "#f1f5f9", color: "var(--color-text-muted)", cursor: "not-allowed" }}>
                        {dna.company.corporate_number}
                    </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>本店所在地</label>
              <input
                style={inputStyle}
                value={dna.company.head_office_address}
                onChange={e => updateDna("company.head_office_address", e.target.value)}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>{dna.company.business_category === "SOLE_PROPRIETOR" ? "元入金（または自己資金） (円)" : "資本金 (円)"}</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={dna.company.capital_stock}
                  onChange={e => updateDna("company.capital_stock", parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label style={labelStyle}>{dna.company.business_category === "SOLE_PROPRIETOR" ? "開業年月日" : "設立年月日"}</label>
                <input
                  style={inputStyle}
                  value={dna.company.founded_date || ""}
                  onChange={e => updateDna("company.founded_date", e.target.value)}
                  placeholder="例: 2010-04-01"
                />
              </div>
            </div>
          </div>

          {/* ヒントバナー */}
          <div style={{
            padding: "14px 20px", borderRadius: "var(--radius-sm)",
            background: "linear-gradient(135deg, #ebf8ff, #e6fffa)",
            border: "1px solid #90cdf4", display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div style={{ fontSize: 13, color: "#2c5282", lineHeight: 1.6 }}>
              <strong>基本DNAは補助金申請の「入口」です。</strong>正確な所在地情報は「地域加点」に、資本金は「中小企業枠」の判定に直結します。
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          2. 財務DNA
         ================================================================ */}
      {activeTab === "financial" && (
        <div className="fade-in">
          {/* チャート */}
          {chartData.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <div className="card-title">📈 財務パフォーマンス推移</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-secondary)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "#3182ce", display: "inline-block" }}></span> 売上高</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "#38a169", display: "inline-block" }}></span> 付加価値額</span>
                </div>
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182ce" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3182ce" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradVA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38a169" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#38a169" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#718096" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#718096" }} tickFormatter={(v: any) => `${((v || 0) / 10000).toLocaleString()}万`} />
                    <Tooltip formatter={(v: any) => `${(v || 0).toLocaleString()} 円`} />
                    <Area type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={2} fill="url(#gradSales)" name="売上高" />
                    <Area type="monotone" dataKey="valueAdded" stroke="#38a169" strokeWidth={2} fill="url(#gradVA)" name="付加価値額" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 財務テーブル */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">📋 {dna.company.business_category === "SOLE_PROPRIETOR" ? "確定申告データ入力" : "決算データ入力"}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {dna.company.business_category === "SOLE_PROPRIETOR" ? "※青色申告決算書等の数値を入力してください" : "※決算報告書の数値を入力してください"}
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>年度</th>
                    <th>売上高</th>
                    <th>営業利益</th>
                    <th>経常利益</th>
                    <th>人件費</th>
                    <th>減価償却費</th>
                  </tr>
                </thead>
                <tbody>
                  {dna.financials.map((f: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{f.fiscal_year}年度</td>
                      <td>
                        <input type="number" style={tableInputStyle} value={f.sales} onChange={e => updateFinancial(i, "sales", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td>
                        <input type="number" style={tableInputStyle} value={f.operating_profit} onChange={e => updateFinancial(i, "operating_profit", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td>
                        <input type="number" style={tableInputStyle} value={f.ordinary_profit} onChange={e => updateFinancial(i, "ordinary_profit", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td>
                        <input type="number" style={tableInputStyle} value={f.labor_cost} onChange={e => updateFinancial(i, "labor_cost", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td>
                        <input type="number" style={tableInputStyle} value={f.depreciation} onChange={e => updateFinancial(i, "depreciation", parseFloat(e.target.value) || 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          3. 事業DNA
         ================================================================ */}
      {activeTab === "business" && (
        <div className="fade-in">
          {/* 事業概要 */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div className="card-title">💡 事業実態・戦略</div>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>補助金申請の核</span>
            </div>
            <label style={labelStyle}>事業の概要（補助金審査で最も重視される項目）</label>
            <textarea
              style={{ ...inputStyle, height: 120, resize: "vertical" }}
              value={dna.profile.business_summary}
              onChange={e => updateDna("profile.business_summary", e.target.value)}
              placeholder="主要事業内容、強み、市場での位置づけなどを記載してください..."
            />
          </div>

          {/* DX / GX / 社会貢献 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div className="card">
              <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>🖥️ DXへの取り組み</div>
              <textarea
                style={{ ...inputStyle, height: 100, resize: "vertical" }}
                value={dna.profile.dx_initiatives}
                onChange={e => updateDna("profile.dx_initiatives", e.target.value)}
                placeholder="ITツール導入、データ活用状況..."
              />
            </div>
            <div className="card">
              <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>🌱 GX・省エネへの取り組み</div>
              <textarea
                style={{ ...inputStyle, height: 100, resize: "vertical" }}
                value={dna.profile.gx_initiatives}
                onChange={e => updateDna("profile.gx_initiatives", e.target.value)}
                placeholder="再エネ設備、省エネ対策..."
              />
            </div>
            <div className="card">
              <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>🤝 地域貢献・社会課題</div>
              <textarea
                style={{ ...inputStyle, height: 100, resize: "vertical" }}
                value={dna.profile.social_contribution}
                onChange={e => updateDna("profile.social_contribution", e.target.value)}
                placeholder="SDGs活動、地域ボランティア..."
              />
            </div>
          </div>

          {/* 保有設備 */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div className="card-title">⚙️ 保有設備・ITシステム</div>
              <button className="btn btn-outline btn-sm" onClick={() => {
                const newList = [...dna.profile.equipment_list, { name: "", introduced_year: null, status: "稼働中", condition: "", replacement_plan: "" }];
                updateDna("profile.equipment_list", newList);
              }}>
                ＋ 設備を追加
              </button>
            </div>
            {dna.profile.equipment_list.length === 0 ? (
              <p style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)", fontSize: 13 }}>設備が登録されていません</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>設備名</th>
                    <th>導入年</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dna.profile.equipment_list.map((eq: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <input style={tableInputStyle} value={eq.name} onChange={e => {
                          const list = [...dna.profile.equipment_list];
                          list[i] = { ...list[i], name: e.target.value };
                          updateDna("profile.equipment_list", list);
                        }} placeholder="例: CNC旋盤" />
                      </td>
                      <td>
                        <input type="number" style={{ ...tableInputStyle, width: 90 }} value={eq.introduced_year || ""} onChange={e => {
                          const list = [...dna.profile.equipment_list];
                          list[i] = { ...list[i], introduced_year: parseInt(e.target.value) || null };
                          updateDna("profile.equipment_list", list);
                        }} placeholder="2020" />
                      </td>
                      <td>
                        <select style={tableInputStyle} value={eq.status} onChange={e => {
                          const list = [...dna.profile.equipment_list];
                          list[i] = { ...list[i], status: e.target.value };
                          updateDna("profile.equipment_list", list);
                        }}>
                          <option value="稼働中">稼働中</option>
                          <option value="老朽化">老朽化</option>
                          <option value="更新予定">更新予定</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }} onClick={() => {
                          const list = dna.profile.equipment_list.filter((_: any, j: number) => j !== i);
                          updateDna("profile.equipment_list", list);
                        }}>
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 許認可 + 取引先 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="card">
              <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>📜 保有許認可・認定</div>
              <textarea
                style={{ ...inputStyle, height: 100, resize: "vertical" }}
                value={dna.profile.licenses.join("\n")}
                onChange={e => updateDna("profile.licenses", e.target.value.split("\n"))}
                placeholder={"例:\n経営革新計画承認\n情報セキュリティマネジメント"}
              />
            </div>
            <div className="card">
              <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>🤝 主要取引先</div>
              <textarea
                style={{ ...inputStyle, height: 100, resize: "vertical" }}
                value={dna.profile.major_customers.join("\n")}
                onChange={e => updateDna("profile.major_customers", e.target.value.split("\n"))}
                placeholder={"例:\n日本電気株式会社\n東京都庁"}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          4. 人事DNA
         ================================================================ */}
      {activeTab === "hr" && (
        <div className="fade-in">
          {/* KPI カード */}
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card">
              <div className="kpi-label">正社員数</div>
              <div className="kpi-value" style={{ fontSize: 28 }}>{dna.hr.employee_count_regular}<span style={{ fontSize: 14, marginLeft: 4 }}>名</span></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">パート・アルバイト数</div>
              <div className="kpi-value" style={{ fontSize: 28 }}>{dna.hr.employee_count_part}<span style={{ fontSize: 14, marginLeft: 4 }}>名</span></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">平均年齢</div>
              <div className="kpi-value" style={{ fontSize: 28 }}>{dna.hr.average_age}<span style={{ fontSize: 14, marginLeft: 4 }}>歳</span></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">事業場内最低賃金 (時給)</div>
              <div className="kpi-value" style={{ fontSize: 28, color: "var(--color-error)" }}>¥{fmt(dna.hr.lowest_wage)}</div>
            </div>
          </div>

          {/* 入力フォーム */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div className="card-title">👥 人事労務データ入力</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>正社員数</label>
                <input type="number" style={inputStyle} value={dna.hr.employee_count_regular} onChange={e => updateDna("hr.employee_count_regular", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label style={labelStyle}>パート・アルバイト数</label>
                <input type="number" style={inputStyle} value={dna.hr.employee_count_part} onChange={e => updateDna("hr.employee_count_part", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label style={labelStyle}>事業場内最低賃金 (時給)</label>
                <input type="number" style={inputStyle} value={dna.hr.lowest_wage} onChange={e => updateDna("hr.lowest_wage", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>従業員平均年齢</label>
                <input type="number" step="0.1" style={inputStyle} value={dna.hr.average_age} onChange={e => updateDna("hr.average_age", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label style={labelStyle}>有給休暇取得率 (%)</label>
                <input type="number" step="0.1" style={inputStyle} value={dna.hr.paid_leave_ratio} onChange={e => updateDna("hr.paid_leave_ratio", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label style={labelStyle}>研修教育費 (年間/円)</label>
                <input type="number" style={inputStyle} value={dna.hr.training_expenses || 0} onChange={e => updateDna("hr.training_expenses", parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* 賃上げ表明チェック */}
            <div style={{
              padding: "14px 20px", borderRadius: "var(--radius-sm)", marginBottom: 20,
              background: dna.hr.wage_raise_declared ? "#c6f6d5" : "#f7fafc",
              border: `1px solid ${dna.hr.wage_raise_declared ? "#68d391" : "var(--color-border)"}`,
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
              transition: "all 0.2s"
            }} onClick={() => updateDna("hr.wage_raise_declared", !dna.hr.wage_raise_declared)}>
              <input type="checkbox" checked={dna.hr.wage_raise_declared} readOnly style={{ width: 20, height: 20, cursor: "pointer" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: dna.hr.wage_raise_declared ? "#22543d" : "var(--color-text)" }}>賃上げ表明宣言済み</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>※多くの補助金で加点・補助率アップの対象となります</div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>研修・教育体制の詳細</label>
              <textarea
                style={{ ...inputStyle, height: 100, resize: "vertical" }}
                value={dna.hr.training_system || ""}
                onChange={e => updateDna("hr.training_system", e.target.value)}
                placeholder="資格取得支援制度、外部研修の参加頻度、社内勉強会など"
              />
            </div>
          </div>

          {/* アドバイスバナー */}
          <div style={{
            padding: "14px 20px", borderRadius: "var(--radius-sm)",
            background: "linear-gradient(135deg, #ebf8ff, #e6fffa)",
            border: "1px solid #90cdf4", display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div style={{ fontSize: 13, color: "#2c5282", lineHeight: 1.6 }}>
              <strong>AIアドバイス:</strong> 有給取得率が60%を超えると、多くの認定制度で加点を受けることが可能です。
              教育訓練費を売上の1%以上に設定することで、社員の定着率向上と補助金獲得の両立が期待できます。
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          5. 書類DNA
         ================================================================ */}
      {activeTab === "documents" && (
        <div className="fade-in">
          <div className="card">
            <div className="card-header">
              <div className="card-title">📁 証憑管理 (AI自動解析・整合性チェック)</div>
            </div>
            {documents.length === 0 ? (
              <p style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)", fontSize: 13 }}>書類がアップロードされていません</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>種別</th>
                    <th>ファイル名</th>
                    <th>AI解析状況</th>
                    <th style={{ textAlign: "right" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id}>
                      <td>
                        <span className="status-badge published">{doc.doc_type}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{doc.file_name}</td>
                      <td>
                        {verificationResults[doc.id] ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="score-bar-container" style={{ width: 120 }}>
                              <div className="score-bar" style={{
                                width: `${verificationResults[doc.id].score}%`,
                                background: verificationResults[doc.id].score > 80
                                  ? "linear-gradient(90deg, #38a169, #68d391)"
                                  : "linear-gradient(90deg, #dd6b20, #f6ad55)"
                              }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>信頼度: {verificationResults[doc.id].score}%</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>未解析</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className={`btn btn-outline btn-sm`}
                          onClick={() => handleVerify(doc.id)}
                          disabled={verifyingId === doc.id}
                          style={{ opacity: verifyingId === doc.id ? 0.5 : 1 }}
                        >
                          {verifyingId === doc.id ? "解析中..." : "AI解析実行"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== フッターヒント (通常フロー内、コンパクト) ===== */}
      <div style={{
        marginTop: 32, padding: "16px 24px", borderRadius: "var(--radius-sm)",
        background: "var(--color-primary-surface)", border: "1px solid #bee3f8",
        display: "flex", alignItems: "center", gap: 12,
        fontSize: 13, color: "#2c5282",
      }}>
        <span style={{ fontSize: 18 }}>🚀</span>
        <div>
          ここで入力されたデータは、AI事業計画書生成時の「根拠データ」として使用されます。
          詳細なデータ入力がAIの分析精度向上に直結します。
        </div>
      </div>
    </div>
  );
}

// ===== 共通スタイル定数 =====
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  marginBottom: 6,
  letterSpacing: "0.03em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  fontSize: 14,
  fontWeight: 500,
  color: "var(--color-text)",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  background: "var(--color-surface)",
};

const tableInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-text)",
  outline: "none",
  background: "transparent",
};
