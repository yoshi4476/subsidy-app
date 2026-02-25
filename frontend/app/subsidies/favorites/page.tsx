"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCompany } from "../../components/SidebarLayout";

const API = "http://localhost:8081/api";

interface Favorite {
  id: string;
  subsidy_id: string;
}

interface Subsidy {
  id: string;
  title: string;
  max_amount: number | null;
  days_left: number | null;
}

export default function FavoritesPage() {
  const { data: session } = useSession();
  const { selected } = useCompany();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [detailedSubsidies, setDetailedSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadFavorites() {
    if (!selected || !(session?.user as any)?.id) return;
    setLoading(true);
    try {
      const favRes = await fetch(`${API}/user/favorites?user_id=${(session?.user as any).id}`);
      const favs = await favRes.json();
      setFavorites(favs);

      // 全補助金リストからお気に入りの詳細を抽出
      const subRes = await fetch(`${API}/subsidies/latest`);
      const allSubsidies = await subRes.json();
      
      const filtered = allSubsidies.filter((s: Subsidy) => 
        favs.some((f: Favorite) => f.subsidy_id === s.id)
      );
      setDetailedSubsidies(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user && selected) {
      loadFavorites();
    }
  }, [selected, session]);

  async function handleRemove(subsidyId: string) {
    if (!(session?.user as any)?.id) return;
    try {
      await fetch(`${API}/user/favorites/${subsidyId}?user_id=${(session?.user as any).id}`, { method: "DELETE" });
      loadFavorites();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>お気に入り補助金</h1>
        <p>気になる補助金をキープして、締切を管理しましょう。</p>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : detailedSubsidies.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 0", opacity: 0.6 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
          <p>お気に入りに登録された補助金はありません。</p>
          <a href="/subsidies" className="btn btn-outline" style={{ marginTop: 20 }}>補助金を探す</a>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {detailedSubsidies.map((s) => (
            <div key={s.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 700, 
                    padding: "2px 8px", 
                    borderRadius: 12, 
                    background: s.days_left !== null && s.days_left <= 14 ? "#fff5f5" : "#f0fff4",
                    color: s.days_left !== null && s.days_left <= 14 ? "#c53030" : "#2f855a",
                    border: `1px solid ${s.days_left !== null && s.days_left <= 14 ? "#feb2b2" : "#9ae6b4"}`
                  }}>
                    {s.days_left !== null ? `締切まで ${s.days_left}日` : "随時受付"}
                  </span>
                  <button 
                    onClick={() => handleRemove(s.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-accent)" }}
                    title="お気に入り解除"
                  >
                    ★
                  </button>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, lineHeight: 1.4 }}>{s.title}</h3>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
                  最大補助額: <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                    {s.max_amount ? `${(s.max_amount / 10000).toLocaleString()}万円` : "未定"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`/subsidies`} className="btn btn-sm btn-outline" style={{ flex: 1, textAlign: "center" }}>詳細を見る</a>
                <a href={`/ai-planner`} className="btn btn-sm btn-primary" style={{ flex: 1, textAlign: "center" }}>AIドラフト生成</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
