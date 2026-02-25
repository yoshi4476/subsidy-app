"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { API_BASE as API } from "../../../lib/config";

interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  role: string;
  is_approved: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { "X-User-ID": (session?.user as any).id }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadUsers();
    }
  }, [session]);

  const handleApprove = async (userId: string) => {
    try {
      const res = await fetch(`${API}/admin/users/${userId}/approve`, { 
        method: "POST",
        headers: { "X-User-ID": (session?.user as any).id }
      });
      if (res.ok) {
        setMessage("ユーザーを承認しました。");
        loadUsers();
      }
    } catch (e) {
      setMessage("承認に失敗しました。");
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const res = await fetch(`${API}/admin/users/${userId}/reject`, { 
        method: "POST",
        headers: { "X-User-ID": (session?.user as any).id }
      });
      if (res.ok) {
        setMessage("承認を取り消しました。");
        loadUsers();
      }
    } catch (e) {
      setMessage("操作に失敗しました。");
    }
  };

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      window.location.href = "/";
    }
  }, [status, isAdmin]);

  if (status === "loading") return <div className="p-8 text-center">認証中...</div>;
  if (!session?.user || !isAdmin) return <div className="p-8 text-center text-red-500">管理者権限が必要です。</div>;

  return (
    <div className="admin-users-container">
      <div className="header-section">
        <h1>ユーザー管理・承認</h1>
        <p>システムを利用可能なクライアントユーザーを管理します。管理者が承認したユーザーのみがログイン後の機能を使用できます。</p>
      </div>

      {message && (
        <div className="alert alert-info">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <div className="users-card">
        {loading ? (
          <div className="loading-state">ユーザーリストを取得中...</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>ユーザー</th>
                <th>メールアドレス</th>
                <th>ロール</th>
                <th>ステータス</th>
                <th>登録日</th>
                <th>アクション</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      {user.picture ? (
                        <img src={user.picture} alt="" className="user-avatar" />
                      ) : (
                        <div className="user-avatar-placeholder">
                          {user.name?.charAt(0) || user.email.charAt(0)}
                        </div>
                      )}
                      <span>{user.name || "名称なし"}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge badge-${user.role}`}>
                      {user.role === "admin" ? "管理者" : "クライアント"}
                    </span>
                  </td>
                  <td>
                    {user.is_approved ? (
                      <span className="status-approved">● 承認済み</span>
                    ) : (
                      <span className="status-pending">● 承認待ち</span>
                    )}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="actions">
                      {user.is_approved ? (
                        <button 
                          className="btn-reject" 
                          onClick={() => handleReject(user.id)}
                          disabled={user.role === "admin"} // 管理者は解除不可
                        >
                          承認解除
                        </button>
                      ) : (
                        <button className="btn-approve" onClick={() => handleApprove(user.id)}>
                          承認する
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .admin-users-container {
          padding: 2.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .header-section {
          margin-bottom: 2.5rem;
        }
        .header-section h1 {
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-text-dark);
          margin-bottom: 0.5rem;
        }
        .header-section p {
          color: var(--color-text-muted);
        }
        .alert {
          background: var(--color-primary-light);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .alert button {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .users-card {
          background: white;
          border-radius: 1.25rem;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .users-table th {
          background: var(--color-bg-light);
          padding: 1rem 1.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .users-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.95rem;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-avatar, .user-avatar-placeholder {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          object-fit: cover;
        }
        .user-avatar-placeholder {
          background: var(--color-primary-light);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .badge-admin { background: #fee2e2; color: #991b1b; }
        .badge-client { background: #dcfce7; color: #166534; }
        
        .status-approved { color: var(--color-success); font-weight: 600; }
        .status-pending { color: #f59e0b; font-weight: 600; }
        
        .actions {
          display: flex;
          gap: 0.5rem;
        }
        .btn-approve {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-approve:hover { background: var(--color-primary-dark); }
        
        .btn-reject {
          background: white;
          color: #ef4444;
          border: 1px solid #ef4444;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-reject:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .loading-state {
          padding: 4rem;
          text-align: center;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
