"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WaitingApprovalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 承認されたら自動でトップへ
    if (status === "authenticated" && (session?.user as any)?.is_approved) {
      router.push("/");
    }
  }, [session, status, router]);

  return (
    <div className="waiting-container">
      <div className="glass-card">
        <div className="icon-wrapper">
          <div className="pulse-circle"></div>
          <svg className="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        
        <h1>アカウント承認待ち</h1>
        <p className="subtitle">
          現在、管理者によるアカウントの確認を行っております。<br />
          承認が完了次第、すべての機能がご利用いただけるようになります。
        </p>

        <div className="info-box">
          <div className="info-item">
            <span className="label">ステータス</span>
            <span className="value status-pending">確認中</span>
          </div>
          <div className="info-item">
            <span className="label">ユーザー</span>
            <span className="value">{session?.user?.email}</span>
          </div>
        </div>

        <div className="footer-actions">
          <p>お急ぎの場合は担当者までお問い合わせください。</p>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">
            ログアウトして戻る
          </button>
        </div>
      </div>

      <style jsx>{`
        .waiting-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top left, #f8fafc, #f1f5f9);
          padding: 2rem;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 2rem;
          padding: 3.5rem;
          max-width: 540px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
        }
        .icon-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .clock-icon {
          width: 48px;
          height: 48px;
          color: #6366f1;
          z-index: 1;
        }
        .pulse-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #6366f1;
          opacity: 0.15;
          animation: pulse 2s infinite ease-in-out;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.15; }
          50% { transform: scale(1.2); opacity: 0.05; }
          100% { transform: scale(0.95); opacity: 0.15; }
        }
        h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }
        .subtitle {
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 2.5rem;
        }
        .info-box {
          background: #f8fafc;
          border-radius: 1rem;
          padding: 1.25rem;
          margin-bottom: 2.5rem;
          border: 1px solid #e2e8f0;
        }
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
        }
        .info-item:not(:last-child) {
          border-bottom: 1px solid #e2e8f0;
        }
        .label {
          color: #94a3b8;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .value {
          color: #1e293b;
          font-size: 0.875rem;
          font-weight: 700;
        }
        .status-pending {
          color: #f59e0b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .status-pending::before {
          content: "";
          width: 8px;
          height: 8px;
          background: #f59e0b;
          border-radius: 50%;
        }
        .footer-actions p {
          font-size: 0.875rem;
          color: #94a3b8;
          margin-bottom: 1.5rem;
        }
        .btn-secondary {
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: #f1f5f9;
          color: #1e293b;
          border-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
