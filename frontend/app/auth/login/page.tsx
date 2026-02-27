"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [isHovered, setIsHovered] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"google" | "password">("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const result = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/",
    });

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      
      <div className="login-card-wrapper fade-in">
        <div className="login-card">
          <div className="login-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1>SubsidyNavi</h1>
            <p className="premium-tag">PREMIUM ACCESS</p>
          </div>

          <div className="login-content">
            <h2>未来の補助金体験へ、ようこそ。</h2>
            
            {loginMethod === "google" ? (
              <>
                <p className="login-desc">
                  AIがあなたのビジネスに最適な補助金を導き出します。<br />
                  一歩先を行く、次世代の申請プラットフォーム。
                </p>

                <button 
                  className={`login-btn-premium ${isHovered ? 'hovered' : ''}`}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                >
                  <div className="btn-inner">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Googleでログイン</span>
                  </div>
                </button>

                <button className="switch-method-btn" onClick={() => setLoginMethod("password")}>
                  メールアドレスでログイン
                </button>
              </>
            ) : (
              <form onSubmit={handlePasswordLogin} className="password-login-form">
                <div className="input-field">
                  <input 
                    type="email" 
                    placeholder="メールアドレス" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="input-field">
                  <input 
                    type="password" 
                    placeholder="パスワード" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                
                {error && <p className="error-message">{error}</p>}
                
                <button type="submit" className="login-btn-submit" disabled={loading}>
                  {loading ? "ログイン中..." : "ログイン"}
                </button>

                <div className="secondary-actions">
                  <button type="button" className="switch-method-btn" onClick={() => setLoginMethod("google")}>
                    Googleログインに戻る
                  </button>
                  <a href="/auth/set-password" style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'none' }}>
                    初めての方 / パスワード設定
                  </a>
                </div>
              </form>
            )}
          </div>

          <div className="login-footer">
            <p>© 2026 SubsidyNavi Premium Edition. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          font-family: 'Inter', 'Noto Sans JP', sans-serif;
          overflow: hidden;
          z-index: 9999;
        }

        .login-bg {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: float 20s infinite alternate;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: #4f46e5;
          top: -100px;
          left: -100px;
        }

        .orb-2 {
          width: 500px;
          height: 500px;
          background: #7c3aed;
          bottom: -150px;
          right: -100px;
          animation-delay: -5s;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: #06b6d4;
          top: 30%;
          right: 20%;
          animation-delay: -10s;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 30px) scale(1.1); }
          100% { transform: translate(-30px, -50px) scale(1); }
        }

        .login-card-wrapper {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 480px;
          padding: 20px;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px;
          padding: 48px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
        }

        .login-logo {
          margin-bottom: 40px;
        }

        .logo-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 16px;
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
        }

        .logo-icon svg {
          width: 32px;
          height: 32px;
        }

        h1 {
          font-size: 28px;
          font-weight: 800;
          color: white;
          margin-bottom: 4px;
          letter-spacing: -0.02em;
        }

        .premium-tag {
          font-size: 10px;
          font-weight: 800;
          color: #818cf8;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 0;
        }

        h2 {
          font-size: 22px;
          font-weight: 700;
          color: white;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .login-desc {
          font-size: 15px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .login-btn-premium {
          position: relative;
          width: 100%;
          background: white;
          border: none;
          border-radius: 16px;
          padding: 2px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateY(0);
        }

        .login-btn-premium.hovered {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
        }

        .btn-inner {
          background: white;
          border-radius: 14px;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #1e293b;
          font-weight: 600;
          font-size: 16px;
          transition: background 0.2s;
        }

        .login-btn-premium.hovered .btn-inner {
          background: #f8fafc;
        }

        .login-footer {
          margin-top: 48px;
          font-size: 11px;
          color: #64748b;
        }

        .fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .switch-method-btn {
          margin-top: 1.5rem;
          background: none;
          border: none;
          color: #a855f7;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: color 0.2s;
        }

        .switch-method-btn:hover {
          color: #c084fc;
          text-decoration: underline;
        }

        .password-login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
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
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .login-btn-submit {
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
          margin-top: 0.5rem;
        }

        .login-btn-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
        }

        .login-btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          color: #fb7185;
          font-size: 0.85rem;
          font-weight: 500;
          margin: 0;
        }

        .secondary-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
