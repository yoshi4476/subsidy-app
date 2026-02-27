"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, Mail, ShieldCheck, Clock } from "lucide-react";

import { API_BASE } from "../../../lib/config";

interface Invitation {
  id: string;
  email: string;
  invited_by: string;
  created_at: string;
}

export default function InvitationsPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  // API URLの妥当性チェック
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      if (API_BASE.includes("localhost")) {
        setMessage({ 
          type: "warning", 
          text: "警告: API接続先がlocalhostになっています。環境変数 NEXT_PUBLIC_API_URL を設定してください。" 
        });
      }
    }
  }, []);

  // 招待リストの読み込み
  const loadInvitations = async () => {
    try {
      // API_BASEは '/api' を含むので /admin/invitations を追加
      const res = await fetch(`${API_BASE}/admin/invitations`, {
        headers: {
          "X-User-ID": (session?.user as any)?.id || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadInvitations();
    }
  }, [session]);

  // 招待の送信
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const res = await fetch(`${API_BASE}/admin/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": (session?.user as any)?.id || "",
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "ユーザーを招待しました！このメールアドレスでログインすると自動的に承認されます。" });
        setEmail("");
        loadInvitations();
      } else {
        const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status} Error` }));
        console.error("Invitation failed:", errorData);
        setMessage({ type: "error", text: errorData.detail || "招待に失敗しました。" });
      }
    } catch (e) {
      console.error("Fetch error:", e);
      setMessage({ type: "error", text: "エラーが発生しました（通信エラー）。" });
    }
  };

  // 招待の取り消し
  const handleDelete = async (id: string) => {
    if (!confirm("この招待を取り消しますか？")) return;

    try {
      const res = await fetch(`${API_BASE}/admin/invitations/${id}`, {
        method: "DELETE",
        headers: {
          "X-User-ID": (session?.user as any)?.id || "",
        },
      });

      if (res.ok) {
        setInvitations(invitations.filter((i) => i.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="loading-state">読み込み中...</div>;

  return (
    <div className="invitations-container fade-in">
      <div className="page-header">
        <h1>ユーザー招待</h1>
        <p>新しいユーザーを招待リストに追加すると、そのユーザーはログイン時に自動的に承認されます。</p>
      </div>

      <div className="content-grid">
        {/* 送信フォーム */}
        <div className="card invite-form-card">
          <div className="card-header">
            <h2 className="card-title">
              <Plus size={18} /> 新規招待
            </h2>
          </div>
          <form onSubmit={handleInvite} className="invite-form">
            <div className="input-group">
              <Mail className="input-icon" size={18} />
              <input 
                type="email" 
                placeholder="招待したいメールアドレスを入力" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">招待メールを登録</button>
          </form>
          {message && (
            <div className={`alert-banner ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        {/* 招待済みリスト */}
        <div className="card list-card">
          <div className="card-header">
            <h2 className="card-title">
              <ShieldCheck size={18} /> 承認待ち招待リスト
            </h2>
          </div>
          <div className="invitation-list">
            {invitations.length === 0 ? (
              <p className="empty-state">現在、待機中の招待はありません。</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>メールアドレス</th>
                    <th>招待日</th>
                    <th>アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="email-cell">{inv.email}</td>
                      <td className="date-cell">
                        <Clock size={14} style={{ marginRight: 4 }} />
                        {new Date(inv.created_at).toLocaleDateString("ja-JP")}
                      </td>
                      <td>
                        <button 
                          onClick={() => handleDelete(inv.id)}
                          className="btn-icon-delete"
                          title="招待を取り消す"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .invitations-container {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .page-header {
          margin-bottom: 2rem;
        }
        .page-header h1 {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        .invite-form-card {
          padding: 1.5rem;
        }
        .invite-form {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .input-group {
          flex: 1;
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }
        input {
          width: 100%;
          padding: 0.8rem 1rem 0.8rem 3rem;
          border-radius: 0.75rem;
          border: 1px solid var(--color-border);
          background: var(--color-bg-subtle);
          color: var(--color-text);
          font-size: 1rem;
        }
        input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .alert-banner {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 0.75rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .alert-banner.success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .alert-banner.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .alert-banner.warning {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fef3c7;
        }
        .email-cell {
          font-weight: 600;
        }
        .date-cell {
          display: flex;
          align-items: center;
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }
        .btn-icon-delete {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        .btn-icon-delete:hover {
          color: var(--color-error);
          background: #fef2f2;
        }
        .empty-state {
          padding: 3rem;
          text-align: center;
          color: var(--color-text-muted);
          font-style: italic;
        }
        .loading-state {
          padding: 5rem;
          text-align: center;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
