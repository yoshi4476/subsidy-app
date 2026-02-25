"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

const API = "http://localhost:8081/api";

// ステップ定義
const STEPS = [
  { label: "基本情報", icon: "🏢" },
  { label: "財務データ", icon: "💰" },
  { label: "人事・労務", icon: "👥" },
  { label: "事業プロフィール", icon: "📋" },
];

export default function CompanyNewPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  // ===== ステップ1: 基本情報 =====
  const [basic, setBasic] = useState({
    corporate_number: "", legal_name: "", trade_name: "",
    head_office_address: "", head_office_prefecture: "13",
    establishment_date: "", capital_stock: "",
    industry_code: "",
  });
  const [executives, setExecutives] = useState([{ name: "", title: "代表取締役", birthdate: "" }]);
  const [shareholders, setShareholders] = useState([{ name: "", type: "individual", ratio: "" }]);

  // ===== ステップ2: 財務データ （1期分）=====
  const [financial, setFinancial] = useState({
    fiscal_year: "2025",
    fiscal_period_start: "2025-04-01", fiscal_period_end: "2026-03-31",
    sales: "", operating_profit: "", ordinary_profit: "",
    depreciation: "", labor_cost: "", sga_expenses: "",
    total_assets: "", net_assets: "", cash_on_hand: "",
    accounts_receivable: "", inventory: "", accounts_payable: "",
    short_term_borrowings: "", long_term_borrowings: "", rd_expenses: "",
  });

  // ===== ステップ3: 人事・労務 =====
  const [hr, setHR] = useState({
    snapshot_date: new Date().toISOString().split("T")[0],
    employee_count_regular: "", employee_count_part: "",
    min_wage_employees_count: "", lowest_wage: "",
    employment_insurance: true, social_insurance: true,
    wage_raise_declared: false,
    wage_raise_plan_rate: "", wage_raise_plan_amount: "",
    average_annual_salary: "", training_expenses: "",
    overtime_hours_avg: "", female_manager_ratio: "",
  });

  // ===== ステップ4: 事業プロフィール =====
  const [profile, setProfile] = useState({
    business_summary: "",
    strengths: "",
    weaknesses: "",
    opportunities: "",
    threats: "",
    certifications: "",
    market_competitiveness: "", dx_initiatives: "", gx_initiatives: "",
    future_rd_plan: "", social_contribution: "",
  });

  // 保存処理
  async function saveStep() {
    setSaving(true);
    setError("");
    try {
      if (step === 0) {
        // 基本情報 → 企業作成
        const body = {
          ...basic,
          capital_stock: Number(basic.capital_stock) || 0,
          establishment_date: basic.establishment_date || null,
          executives: executives.filter(e => e.name).map(e => ({
            name: e.name, title: e.title, birthdate: e.birthdate || null,
          })),
          shareholders: shareholders.filter(s => s.name).map(s => ({
            name: s.name, type: s.type, ratio: parseFloat(s.ratio as string) || 0,
          })),
          user_id: (session?.user as any)?.id || null, // オーナー紐付け
        };
        const res = await fetch(`${API}/companies/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "企業登録に失敗しました");
        }
        const company = await res.json();
        setCompanyId(company.id);
        setStep(1);

      } else if (step === 1) {
        // 財務データ
        const body = {
          fiscal_year: Number(financial.fiscal_year),
          fiscal_period_start: financial.fiscal_period_start,
          fiscal_period_end: financial.fiscal_period_end,
          sales: Number(financial.sales) || 0,
          operating_profit: Number(financial.operating_profit) || 0,
          ordinary_profit: Number(financial.ordinary_profit) || 0,
          depreciation: Number(financial.depreciation) || 0,
          labor_cost: Number(financial.labor_cost) || 0,
          sga_expenses: Number(financial.sga_expenses) || 0,
          total_assets: Number(financial.total_assets) || 0,
          net_assets: Number(financial.net_assets) || 0,
          cash_on_hand: Number(financial.cash_on_hand) || 0,
          accounts_receivable: Number(financial.accounts_receivable) || 0,
          inventory: Number(financial.inventory) || 0,
          accounts_payable: Number(financial.accounts_payable) || 0,
          short_term_borrowings: Number(financial.short_term_borrowings) || 0,
          long_term_borrowings: Number(financial.long_term_borrowings) || 0,
          rd_expenses: Number(financial.rd_expenses) || 0,
        };
        const res = await fetch(`${API}/companies/${companyId}/financials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("財務データ登録に失敗しました");
        setStep(2);

      } else if (step === 2) {
        // 人事・労務
        const body = {
          snapshot_date: hr.snapshot_date,
          employee_count_regular: Number(hr.employee_count_regular) || 0,
          employee_count_part: Number(hr.employee_count_part) || 0,
          min_wage_employees_count: Number(hr.min_wage_employees_count) || 0,
          lowest_wage: Number(hr.lowest_wage) || 0,
          employment_insurance: hr.employment_insurance,
          social_insurance: hr.social_insurance,
          wage_raise_declared: hr.wage_raise_declared,
          wage_raise_plan_rate: Number(hr.wage_raise_plan_rate) || 0,
          wage_raise_plan_amount: Number(hr.wage_raise_plan_amount) || 0,
          average_annual_salary: Number(hr.average_annual_salary) || 0,
          training_expenses: Number(hr.training_expenses) || 0,
          overtime_hours_avg: Number(hr.overtime_hours_avg) || 0,
          female_manager_ratio: Number(hr.female_manager_ratio) || 0,
        };
        const res = await fetch(`${API}/companies/${companyId}/hr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("人事・労務データ登録に失敗しました");
        setStep(3);

      } else if (step === 3) {
        // 事業プロフィール
        const body = {
          business_summary: profile.business_summary,
          strengths: profile.strengths.split("\n").filter(s => s.trim()),
          weaknesses: profile.weaknesses.split("\n").filter(s => s.trim()),
          opportunities: profile.opportunities.split("\n").filter(s => s.trim()),
          threats: profile.threats.split("\n").filter(s => s.trim()),
          equipment_list: [],
          licenses: [],
          certifications: profile.certifications.split("\n").filter(s => s.trim()),
          market_competitiveness: profile.market_competitiveness,
          dx_initiatives: profile.dx_initiatives,
          gx_initiatives: profile.gx_initiatives,
          future_rd_plan: profile.future_rd_plan,
          social_contribution: profile.social_contribution,
        };
        const res = await fetch(`${API}/companies/${companyId}/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("事業プロフィール登録に失敗しました");
        setComplete(true);
      }
    } catch (e: any) {
      setError(e.message || "保存中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  // 完了画面
  if (complete) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>企業登録が完了しました！</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 16, marginBottom: 32, lineHeight: 1.8 }}>
          入力されたデータをもとに、最適な補助金を自動マッチングします。
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <a href="/" className="btn btn-primary" style={{ fontSize: 16, padding: "14px 40px" }}>
            ダッシュボードで結果を見る →
          </a>
          <a href="/subsidies" className="btn btn-accent" style={{ fontSize: 16, padding: "14px 40px" }}>
            補助金を探す
          </a>
        </div>
      </div>
    );
  }

  // フォームの入力ヘルパー
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)", fontSize: 14, background: "var(--color-surface)",
    color: "var(--color-text)",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text-secondary)",
  };
  const fieldStyle: React.CSSProperties = { marginBottom: 16 };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>企業情報を登録する</h1>
        <p>入力された情報から最適な補助金を自動マッチングします</p>
      </div>

      {/* ステッパー */}
      <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center", padding: "12px 8px",
            background: i === step ? "var(--color-primary-surface)" : i < step ? "var(--color-success-surface, #c6f6d5)" : "var(--color-surface)",
            border: i === step ? "2px solid var(--color-primary-light)" : "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            opacity: i > step ? 0.5 : 1,
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{i < step ? "✅" : s.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fff5f5", border: "1px solid #fc8181", borderRadius: "var(--radius-sm)", color: "#c53030", marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 32 }}>
        {/* ===== ステップ 0: 基本情報 ===== */}
        {step === 0 && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>🏢 基本情報</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>法人番号 *</label>
                <input style={inputStyle} placeholder="1234567890123" value={basic.corporate_number} onChange={e => setBasic({ ...basic, corporate_number: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>法人名（正式名称）*</label>
                <input style={inputStyle} placeholder="株式会社〇〇" value={basic.legal_name} onChange={e => setBasic({ ...basic, legal_name: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>屋号・通称</label>
                <input style={inputStyle} placeholder="〇〇製作所" value={basic.trade_name} onChange={e => setBasic({ ...basic, trade_name: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>本社所在地 *</label>
                <input style={inputStyle} placeholder="東京都〇〇区..." value={basic.head_office_address} onChange={e => setBasic({ ...basic, head_office_address: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>都道府県コード</label>
                <input style={inputStyle} placeholder="13" value={basic.head_office_prefecture} onChange={e => setBasic({ ...basic, head_office_prefecture: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>設立年月日</label>
                <input style={inputStyle} type="date" value={basic.establishment_date} onChange={e => setBasic({ ...basic, establishment_date: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>資本金（円）*</label>
                <input style={inputStyle} type="number" placeholder="30000000" value={basic.capital_stock} onChange={e => setBasic({ ...basic, capital_stock: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>業種コード *</label>
                <input style={inputStyle} placeholder="2599" value={basic.industry_code} onChange={e => setBasic({ ...basic, industry_code: e.target.value })} />
              </div>
            </div>

            {/* 役員 */}
            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>役員情報</h3>
            {executives.map((exec, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, marginBottom: 8 }}>
                <input style={inputStyle} placeholder="氏名" value={exec.name} onChange={e => { const arr = [...executives]; arr[i].name = e.target.value; setExecutives(arr); }} />
                <input style={inputStyle} placeholder="役職" value={exec.title} onChange={e => { const arr = [...executives]; arr[i].title = e.target.value; setExecutives(arr); }} />
                <input style={inputStyle} type="date" value={exec.birthdate} onChange={e => { const arr = [...executives]; arr[i].birthdate = e.target.value; setExecutives(arr); }} />
                {executives.length > 1 && <button className="btn btn-outline btn-sm" onClick={() => setExecutives(executives.filter((_, j) => j !== i))}>×</button>}
              </div>
            ))}
            <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setExecutives([...executives, { name: "", title: "", birthdate: "" }])}>
              + 役員を追加
            </button>

            {/* 株主 */}
            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>株主構成</h3>
            {shareholders.map((sh, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, marginBottom: 8 }}>
                <input style={inputStyle} placeholder="株主名" value={sh.name} onChange={e => { const arr = [...shareholders]; arr[i].name = e.target.value; setShareholders(arr); }} />
                <select style={inputStyle} value={sh.type} onChange={e => { const arr = [...shareholders]; arr[i].type = e.target.value; setShareholders(arr); }}>
                  <option value="individual">個人</option>
                  <option value="corporate">法人</option>
                </select>
                <input style={inputStyle} type="number" step="0.01" placeholder="持株比率 (0.0~1.0)" value={sh.ratio} onChange={e => { const arr = [...shareholders]; arr[i].ratio = e.target.value; setShareholders(arr); }} />
                {shareholders.length > 1 && <button className="btn btn-outline btn-sm" onClick={() => setShareholders(shareholders.filter((_, j) => j !== i))}>×</button>}
              </div>
            ))}
            <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setShareholders([...shareholders, { name: "", type: "individual", ratio: "" }])}>
              + 株主を追加
            </button>
          </>
        )}

        {/* ===== ステップ 1: 財務データ ===== */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>💰 財務データ</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
              直近の決算データを入力してください（マッチングの精度に直結します）
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>決算年度 *</label>
                <input style={inputStyle} type="number" value={financial.fiscal_year} onChange={e => setFinancial({ ...financial, fiscal_year: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>期首</label>
                <input style={inputStyle} type="date" value={financial.fiscal_period_start} onChange={e => setFinancial({ ...financial, fiscal_period_start: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>期末</label>
                <input style={inputStyle} type="date" value={financial.fiscal_period_end} onChange={e => setFinancial({ ...financial, fiscal_period_end: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>売上高（円）*</label>
                <input style={inputStyle} type="number" placeholder="250000000" value={financial.sales} onChange={e => setFinancial({ ...financial, sales: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>営業利益（円）*</label>
                <input style={inputStyle} type="number" placeholder="15000000" value={financial.operating_profit} onChange={e => setFinancial({ ...financial, operating_profit: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>経常利益（円）</label>
                <input style={inputStyle} type="number" placeholder="14000000" value={financial.ordinary_profit} onChange={e => setFinancial({ ...financial, ordinary_profit: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>減価償却費（円）*</label>
                <input style={inputStyle} type="number" placeholder="8000000" value={financial.depreciation} onChange={e => setFinancial({ ...financial, depreciation: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>人件費（円）*</label>
                <input style={inputStyle} type="number" placeholder="80000000" value={financial.labor_cost} onChange={e => setFinancial({ ...financial, labor_cost: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>販管費（円）</label>
                <input style={inputStyle} type="number" placeholder="50000000" value={financial.sga_expenses} onChange={e => setFinancial({ ...financial, sga_expenses: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>現預金（円）</label>
                <input style={inputStyle} type="number" placeholder="20000000" value={financial.cash_on_hand} onChange={e => setFinancial({ ...financial, cash_on_hand: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>売掛金（円）</label>
                <input style={inputStyle} type="number" placeholder="10000000" value={financial.accounts_receivable} onChange={e => setFinancial({ ...financial, accounts_receivable: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>棚卸資産（円）</label>
                <input style={inputStyle} type="number" placeholder="5000000" value={financial.inventory} onChange={e => setFinancial({ ...financial, inventory: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>買掛金（円）</label>
                <input style={inputStyle} type="number" placeholder="8000000" value={financial.accounts_payable} onChange={e => setFinancial({ ...financial, accounts_payable: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>短期借入金（円）</label>
                <input style={inputStyle} type="number" placeholder="5000000" value={financial.short_term_borrowings} onChange={e => setFinancial({ ...financial, short_term_borrowings: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>長期借入金（円）</label>
                <input style={inputStyle} type="number" placeholder="25000000" value={financial.long_term_borrowings} onChange={e => setFinancial({ ...financial, long_term_borrowings: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>研究開発費（円）</label>
                <input style={inputStyle} type="number" placeholder="2000000" value={financial.rd_expenses} onChange={e => setFinancial({ ...financial, rd_expenses: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>総資産（円）</label>
                <input style={inputStyle} type="number" placeholder="100000000" value={financial.total_assets} onChange={e => setFinancial({ ...financial, total_assets: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>純資産（円）</label>
                <input style={inputStyle} type="number" placeholder="40000000" value={financial.net_assets} onChange={e => setFinancial({ ...financial, net_assets: e.target.value })} />
              </div>
            </div>
            <div style={{ padding: "12px 16px", background: "var(--color-primary-surface)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--color-primary-light)", fontSize: 13 }}>
              💡 付加価値額（営業利益+人件費+減価償却費）と労働生産性は自動計算されます
            </div>
          </>
        )}

        {/* ===== ステップ 2: 人事・労務 ===== */}
        {step === 2 && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>👥 人事・労務データ</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
              従業員数・賃金情報は補助金の適格判定に使用されます
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>基準日</label>
                <input style={inputStyle} type="date" value={hr.snapshot_date} onChange={e => setHR({ ...hr, snapshot_date: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>正社員数 *</label>
                <input style={inputStyle} type="number" placeholder="20" value={hr.employee_count_regular} onChange={e => setHR({ ...hr, employee_count_regular: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>パート・アルバイト数</label>
                <input style={inputStyle} type="number" placeholder="5" value={hr.employee_count_part} onChange={e => setHR({ ...hr, employee_count_part: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>最低賃金対象従業員数</label>
                <input style={inputStyle} type="number" placeholder="3" value={hr.min_wage_employees_count} onChange={e => setHR({ ...hr, min_wage_employees_count: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>事業場内最低賃金（円/時）*</label>
                <input style={inputStyle} type="number" placeholder="1050" value={hr.lowest_wage} onChange={e => setHR({ ...hr, lowest_wage: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={hr.employment_insurance} onChange={e => setHR({ ...hr, employment_insurance: e.target.checked })} /> 雇用保険適用済み
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={hr.social_insurance} onChange={e => setHR({ ...hr, social_insurance: e.target.checked })} /> 社会保険適用済み
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={hr.wage_raise_declared} onChange={e => setHR({ ...hr, wage_raise_declared: e.target.checked })} /> 賃上げ計画を表明
              </label>
            </div>
            {hr.wage_raise_declared && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>賃上げ計画率（%）</label>
                  <input style={inputStyle} type="number" step="0.1" placeholder="3.0" value={hr.wage_raise_plan_rate} onChange={e => setHR({ ...hr, wage_raise_plan_rate: e.target.value })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>賃上げ計画額（円/月）</label>
                  <input style={inputStyle} type="number" placeholder="5000" value={hr.wage_raise_plan_amount} onChange={e => setHR({ ...hr, wage_raise_plan_amount: e.target.value })} />
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>平均年収（円）</label>
                <input style={inputStyle} type="number" placeholder="4500000" value={hr.average_annual_salary} onChange={e => setHR({ ...hr, average_annual_salary: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>研修教育費（円/年）</label>
                <input style={inputStyle} type="number" placeholder="200000" value={hr.training_expenses} onChange={e => setHR({ ...hr, training_expenses: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>月平均残業時間（h）</label>
                <input style={inputStyle} type="number" step="0.1" placeholder="15.5" value={hr.overtime_hours_avg} onChange={e => setHR({ ...hr, overtime_hours_avg: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>女性管理職比率（%）</label>
                <input style={inputStyle} type="number" step="0.1" placeholder="25.0" value={hr.female_manager_ratio} onChange={e => setHR({ ...hr, female_manager_ratio: e.target.value })} />
              </div>
            </div>
          </>
        )}

        {/* ===== ステップ 3: 事業プロフィール ===== */}
        {step === 3 && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>📋 事業プロフィール</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
              事業内容やSWOT分析は、申請書の自動生成やマッチング精度向上に活用されます
            </p>
            <div style={fieldStyle}>
              <label style={labelStyle}>事業概要 *</label>
              <textarea style={{ ...inputStyle, height: 100, resize: "vertical" }} placeholder="御社の主な事業内容を記入してください..." value={profile.business_summary} onChange={e => setProfile({ ...profile, business_summary: e.target.value })} />
              <div style={{ fontSize: 12, color: "var(--color-primary)", marginTop: 8, padding: "8px 12px", background: "var(--color-primary-surface)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--color-primary-light)" }}>
                <strong>💡 受かりやすい記載例:</strong> 「主に〇〇県内の製造業向けに、特注品の金属部品加工を行っている。最新の5軸加工機を用いたミクロン単位の精密加工技術が強みであり、昨年度の売上比率は〇〇業が60%を占める。」のように、<strong>「誰に」「何を」「自社の強み（特徴）」</strong>を含めて記載するとAI生成の精度が格段に上がります。
              </div>
            </div>
            
            <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>SWOT分析（箇条書きで1行に1つずつ入力してください）</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <div style={fieldStyle}>
                <label style={{ ...labelStyle, color: "var(--color-success)" }}>強み (Strengths)</label>
                <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} placeholder="高精度な加工技術&#10;20年の取引実績" value={profile.strengths} onChange={e => setProfile({ ...profile, strengths: e.target.value })} />
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>例: 熟練工による短納期対応 / 特許技術の保有</div>
              </div>
              <div style={fieldStyle}>
                <label style={{ ...labelStyle, color: "var(--color-error)" }}>弱み (Weaknesses)</label>
                <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} placeholder="デジタル化の遅れ&#10;後継者育成が途上" value={profile.weaknesses} onChange={e => setProfile({ ...profile, weaknesses: e.target.value })} />
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>例: 特定顧客への売上依存 / アナログな管理体制</div>
              </div>
              <div style={fieldStyle}>
                <label style={{ ...labelStyle, color: "var(--color-accent)" }}>機会 (Opportunities)</label>
                <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} placeholder="EV化に伴う新規需要&#10;DX補助金の活用" value={profile.opportunities} onChange={e => setProfile({ ...profile, opportunities: e.target.value })} />
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>例: インバウンド需要の回復 / 省人化ニーズの拡大</div>
              </div>
              <div style={fieldStyle}>
                <label style={{ ...labelStyle, color: "var(--color-warning)" }}>脅威 (Threats)</label>
                <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} placeholder="原材料価格の高騰&#10;人手不足の深刻化" value={profile.threats} onChange={e => setProfile({ ...profile, threats: e.target.value })} />
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>例: 原材料価格の高騰 / 深刻な人手不足</div>
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>取得済み認定・計画（1行に1つ）</label>
              <textarea style={{ ...inputStyle, height: 60, resize: "vertical" }} placeholder="経営革新計画&#10;事業継続力強化計画&#10;ISO9001" value={profile.certifications} onChange={e => setProfile({ ...profile, certifications: e.target.value })} />
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                ※ 補助金の加点項目に直結します
              </div>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 16, color: "var(--color-primary)" }}>🚀 採択率向上のための追加情報</h3>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                { key: "market_competitiveness", label: "市場における優位性と差別化要因", placeholder: "地域内で唯一の〇〇加工技術を保有..." },
                { key: "dx_initiatives", label: "DX(デジタル化)への取組", placeholder: "クラウド型受発注システムの導入により..." },
                { key: "gx_initiatives", label: "GX(脱炭素・省エネ)への貢献", placeholder: "太陽光パネルの設置と全照明のLED化により..." },
                { key: "future_rd_plan", label: "今後の研究開発・事業計画", placeholder: "来年度中にAIを活用した自動見積機能を..." },
                { key: "social_contribution", label: "社会的貢献・地域課題解決", placeholder: "近隣の工業高校から毎年2名のインターンを..." },
              ].map(item => (
                <div key={item.key} style={fieldStyle}>
                  <label style={labelStyle}>{item.label}</label>
                  <textarea
                    style={{ ...inputStyle, height: 80, resize: "vertical" }}
                    placeholder={item.placeholder}
                    value={(profile as any)[item.key]}
                    onChange={e => setProfile({ ...profile, [item.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ナビゲーション */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--color-border)" }}>
          <div>
            {step > 0 && !companyId && (
              <button className="btn btn-outline" onClick={() => setStep(step - 1)}>← 戻る</button>
            )}
          </div>
          <button className="btn btn-primary" onClick={saveStep} disabled={saving} style={{ padding: "12px 36px" }}>
            {saving ? "保存中..." : step < STEPS.length - 1 ? `保存して次へ → ${STEPS[step + 1].label}` : "登録完了 → マッチング開始 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
