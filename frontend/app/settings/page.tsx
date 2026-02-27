"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { API_BASE as API } from "../../lib/config";

export default function PersonalSettingsPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // プロフィール設定
  const [name, setName] = useState(session?.user?.name || "");

  // パスワード設定
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  // 通知設定 (DBの settings カラムから取得)
  const [notifications, setNotifications] = useState({
    subsidy_updates: (session?.user as any)?.settings?.notifications?.subsidy_updates !== false,
    deadline_reminders: (session?.user as any)?.settings?.notifications?.deadline_reminders !== false,
  });

  const isAdmin = (session?.user as any)?.role === "admin";

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/users/${(session?.user as any).id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, settings: { notifications } }),
      });

      if (res.ok) {
        await update(); // セッションを更新
        setMessage({ type: "success", text: "プロフィールを更新しました。" });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.detail || "更新に失敗しました。" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "通信エラーが発生しました。" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: "error", text: "新しいパスワードが一致しません。" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/users/${(session?.user as any).id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.new,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "パスワードを変更しました。" });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.detail || "パスワードの変更に失敗しました。" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "通信エラーが発生しました。" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container fade-in" style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-dark)" }}>設定【すべてのユーザー】</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
          あなたのアカウント情報と通知の設定を管理します
        </p>
      </header>

      {message && (
        <div style={{
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
          backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
          color: message.type === "success" ? "#065f46" : "#991b1b",
          border: `1px solid ${message.type === "success" ? "#10b981" : "#ef4444"}`
        }}>
          {message.text}
        </div>
      )}

      {isAdmin && (
        <div style={{
          padding: 20,
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          borderRadius: 12,
          color: "white",
          marginBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)"
        }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>管理者権限をお持ちです</h3>
            <p style={{ fontSize: 13, opacity: 0.9, margin: "4px 0 0 0" }}>システム全体の設定は管理者専用ページから行えます</p>
          </div>
          <a
            href="/admin/settings"
            style={{
              padding: "10px 18px",
              background: "white",
              color: "#6366f1",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              transition: "transform 0.2s"
            }}
          >
            管理者設定へ
          </a>
        </div>
      )}

      <div style={{ display: "grid", gap: 32 }}>
        {/* プロフィールセクション */}
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--color-primary)" }}>●</span> プロフィール設定
          </h2>
          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-text-secondary)" }}>表示名</label>
              <input
                type="text"
                className="chat-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 山田 太郎"
                style={{ width: "100%", flex: "unset" }}
              />
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--color-text-secondary)" }}>通知設定</label>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifications.subsidy_updates}
                    onChange={(e) => setNotifications({ ...notifications, subsidy_updates: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 14 }}>補助金情報のアップデートをメールで受け取る</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifications.deadline_reminders}
                    onChange={(e) => setNotifications({ ...notifications, deadline_reminders: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 14 }}>申請期限のリマインド通知を受け取る</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: 12, borderRadius: 8, fontWeight: 700 }}
            >
              {loading ? "更新中..." : "変更を保存"}
            </button>
          </form>
        </section>

        {/* セキュリティセクション */}
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--color-danger)" }}>●</span> セキュリティ
          </h2>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-text-secondary)" }}>現在のパスワード</label>
              <input
                type="password"
                className="chat-input"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                style={{ width: "100%", flex: "unset" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-text-secondary)" }}>新しいパスワード</label>
              <input
                type="password"
                className="chat-input"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                style={{ width: "100%", flex: "unset" }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-text-secondary)" }}>確認用パスワード</label>
              <input
                type="password"
                className="chat-input"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                style={{ width: "100%", flex: "unset" }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-outline"
              disabled={loading}
              style={{ width: "100%", padding: 12, borderRadius: 8, fontWeight: 700 }}
            >
              {loading ? "変更中..." : "パスワードを更新"}
            </button>
          </form>
        </section>

        {/* アカウント詳細情報 */}
        <section style={{ padding: 16, background: "var(--color-primary-surface)", borderRadius: 12, border: "1px dashed var(--color-primary)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>アカウント詳細</h3>
          <div style={{ fontSize: 13, display: "grid", gap: 4 }}>
            <div>メールアドレス: <span style={{ fontWeight: 600 }}>{session?.user?.email}</span></div>
            <div>ユーザーID: <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 11 }}>{(session?.user as any)?.id}</span></div>
            <div>プラン: <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{(session?.user as any)?.plan_type === "admin" ? "管理者" : "プロフェッショナル"}</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
