"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "../../../lib/config";

export default function SetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "パスワードが一致しません。" });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: "error", text: "パスワードは8文字以上で設定してください。" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "パスワードを設定しました。ログイン画面へ移動します..." });
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        const errorData = await res.json();
        setMessage({ type: "error", text: errorData.detail || "パスワードの設定に失敗しました。招待されたメールアドレスかご確認ください。" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "エラーが発生しました。" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container fade-in">
      <div className="setup-card">
        <h1>パスワード設定</h1>
        <p className="desc">招待されたメールアドレスのパスワードを設定して、利用を開始しましょう。</p>

        <form onSubmit={handleSetPassword} className="setup-form">
          <div className="input-field">
            <label>招待されたメールアドレス</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required 
            />
          </div>
          <div className="input-field">
            <label>新しいパスワード</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              required 
            />
          </div>
          <div className="input-field">
            <label>パスワード（確認用）</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              required 
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "設定中..." : "パスワードを設定して利用開始"}
          </button>
        </form>

        {message && (
          <div className={`alert-banner ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="footer">
          <a href="/auth/login">ログイン画面へ戻る</a>
        </div>
      </div>

      <style jsx>{`
        .setup-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: white;
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }
        .setup-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
        }
        h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          text-align: center;
        }
        .desc {
          font-size: 14px;
          color: #94a3b8;
          text-align: center;
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .setup-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .input-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .input-field label {
          font-size: 0.85rem;
          color: #cbd5e1;
          font-weight: 500;
        }
        .input-field input {
          width: 100%;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .input-field input:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.08);
        }
        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 1rem;
        }
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
        }
        .alert-banner {
          margin-top: 1.5rem;
          padding: 1rem;
          border-radius: 12px;
          font-size: 0.9rem;
          text-align: center;
        }
        .alert-banner.success { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
        .alert-banner.error { background: rgba(244, 63, 94, 0.1); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.2); }
        .footer {
          margin-top: 2rem;
          text-align: center;
        }
        .footer a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.9rem;
        }
        .footer a:hover { color: white; }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
