"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SidebarLayout, { useCompany } from "@/app/components/SidebarLayout";

const API = "http://localhost:8081/api";

interface Projection {
  month: string;
  out: number;
  in: number;
  balance: number;
  note?: string;
}

interface Simulation {
  id: string;
  total_project_cost: number;
  subsidy_amount: number;
  initial_outlay: number;
  loan_amount: number;
  monthly_projections: Projection[];
}

function SimulationContent() {
  const { selected } = useCompany();
  const searchParams = useSearchParams();
  const subsidyId = searchParams.get("subsidyId") || "subsidy-001"; // デフォルト
  const [sim, setSim] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) {
      loadSimulation();
    }
  }, [selected, subsidyId]);

  async function loadSimulation() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/simulation/cashflow/${selected?.id}?subsidy_id=${subsidyId}`);
      if (res.ok) {
        setSim(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const formatYen = (num: number) => {
    return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(num);
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">資金繰りシミュレーター</h1>
        <p className="text-gray-500">補助金受給までのキャッシュフローと、必要な自己資金（持ち出し額）を可視化します</p>
      </header>

      {loading ? (
        <div className="flex justify-center p-20">シミュレーション計算中...</div>
      ) : !sim ? (
        <div className="bg-white rounded-xl p-20 text-center">企業を選択してください</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">事業費総額</p>
              <p className="text-2xl font-bold">{formatYen(sim.total_project_cost)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">補助金受給予定額</p>
              <p className="text-2xl font-bold text-green-600">+{formatYen(sim.subsidy_amount)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-red-500">
              <p className="text-sm text-gray-500 mb-1">最大持ち出し額</p>
              <p className="text-2xl font-bold text-red-600">{formatYen(sim.initial_outlay)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">実質自己負担</p>
              <p className="text-2xl font-bold">{formatYen(sim.total_project_cost - sim.subsidy_amount)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold">月次キャッシュフロー推移</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-sm text-gray-500">
                    <th className="px-6 py-4 font-medium">時期</th>
                    <th className="px-6 py-4 font-medium">支出（持ち出し）</th>
                    <th className="px-6 py-4 font-medium">収入（補助金等）</th>
                    <th className="px-6 py-4 font-medium">累計収支</th>
                    <th className="px-6 py-4 font-medium">備考</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sim.monthly_projections.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{p.month}</td>
                      <td className="px-6 py-4 text-red-500">-{formatYen(p.out)}</td>
                      <td className="px-6 py-4 text-green-600">{p.in > 0 ? `+${formatYen(p.in)}` : "-"}</td>
                      <td className={`px-6 py-4 font-bold ${p.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatYen(p.balance)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="font-bold text-amber-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              AI 財務アドバイス
            </h3>
            <p className="text-amber-700 text-sm">
              補助金の入金までに最大で {formatYen(sim.initial_outlay)} の資金繰りが必要です。
              現在の財務状況（キャッシュポジション）から推測すると、プロジェクト2ヶ月目に資金が逼迫する可能性があります。
              制度融資（つなぎ融資）の活用を検討するか、支払タイミングの調整を行うことをお勧めします。
            </p>
            <button className="mt-4 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition-colors">
              つなぎ融資相談資料（AI案）を生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CashFlowPage() {
  return (
    <SidebarLayout>
      <Suspense fallback={<div className="p-8">読み込み中...</div>}>
        <SimulationContent />
      </Suspense>
    </SidebarLayout>
  );
}
