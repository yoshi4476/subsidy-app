"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { API_BASE as API } from "../../../lib/config";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualRunning, setManualRunning] = useState(false);

  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    if (status === "authenticated") {
      if (isAdmin) {
        loadData();
      } else {
        window.location.href = "/";
      }
    }
  }, [status, isAdmin]);

  async function loadData() {
    if (!session?.user) return;
    setLoading(true);
    try {
      const headers = { "X-User-ID": (session.user as any).id };
      const [s, l] = await Promise.all([
        fetch(`${API}/admin/stats/overview`, { headers }).then(r => r.json()),
        fetch(`${API}/admin/logs?limit=20`, { headers }).then(r => r.json())
      ]);
      setStats(s);
      setLogs(l);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSync() {
    if (!session?.user || !isAdmin) return;
    setManualRunning(true);
    try {
      const res = await fetch(`${API}/admin/crawler/run`, { 
        method: "POST",
        headers: { "X-User-ID": (session.user as any).id }
      });
      const data = await res.json();
      alert(`同期完了: ${data.created}件新規, ${data.updated}件更新`);
      loadData();
    } catch (e) {
      alert("同期に失敗しました");
    } finally {
      setManualRunning(false);
    }
  }

  if (status === "loading" || loading) return <div className="p-10">読み込み中...</div>;
  if (!session?.user || !isAdmin) return <div className="p-10 text-red-500">管理者権限が必要です。</div>;
  if (!stats || !stats.crawler) return <div className="p-10 text-red-500">統計情報の取得に失敗しました。</div>;

  return (
    <div className="p-8">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
            <p className="text-gray-500">システム稼働状況とAI使用統計</p>
          </div>
          <button 
            className={`btn ${manualRunning ? 'btn-disabled' : 'btn-primary'}`} 
            onClick={handleManualSync}
            disabled={manualRunning}
          >
            {manualRunning ? "同期中..." : "🔄 jGrants 手動同期"}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="card">
            <h3 className="text-sm font-bold text-gray-400 mb-2">クローラー状況</h3>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${stats.crawler.status === 'HEALTHY' ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-2xl font-black">{stats.crawler.status}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">直近24hの同期数: {stats.crawler.sync_count_24h}件</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-bold text-gray-400 mb-2">AI 使用統計 (24h)</h3>
            <div className="text-2xl font-black">{stats.ai_usage.total_calls_24h} <span className="text-sm font-normal">calls</span></div>
            <p className="text-xs text-gray-500 mt-2">推定トークン: {stats.ai_usage.estimated_token_usage.toLocaleString()}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-bold text-gray-400 mb-2">データベース</h3>
            <div className="text-2xl font-black">{stats.db.total_subsidies} <span className="text-sm font-normal">補助金</span></div>
            <p className="text-xs text-gray-500 mt-2">公募中: {stats.db.active_subsidies}件</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card overflow-hidden">
            <h2 className="font-bold mb-4 border-b pb-4">システム監査ログ (直近)</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {logs.map((log, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{log.actor_id}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="font-bold text-sm">{log.action}: {log.target_entity}</div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{JSON.stringify(log.details)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-8">
             <div className="card bg-blue-600 text-white">
                <h3 className="font-bold mb-2">管理者メモ</h3>
                <p className="text-sm opacity-90">jGrants API V2との同期はバックグラウンドで6時間おきに実行されています。緊急時は右上のボタンから手動同期してください。</p>
             </div>
             <div className="card">
                <h3 className="font-bold mb-4">設定ショートカット</h3>
                <div className="grid grid-cols-2 gap-4">
                   <a href="/settings" className="p-3 border rounded-xl text-center hover:bg-gray-50 transition-colors">
                      <div className="text-xl mb-1">⚙️</div>
                      <div className="text-xs font-bold">システム設定</div>
                   </a>
                   <a href="/guide" className="p-3 border rounded-xl text-center hover:bg-gray-50 transition-colors">
                      <div className="text-xl mb-1">📖</div>
                      <div className="text-xs font-bold">ドキュメント</div>
                   </a>
                </div>
             </div>
          </div>
        </div>
    </div>
  );
}
