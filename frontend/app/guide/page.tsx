"use client";

export default function GuidePage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>SubsidyNavi 活用ガイド</h1>
        <p>補助金採択率を最大化するための、システムの正しい使い方と重要ポイント</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

        {/* 0. 導入: 全体フロー */}
        <section className="card" style={{ borderLeft: "4px solid var(--color-primary)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>🚀 最短で採択を勝ち取るための4ステップ</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { step: "01", title: "DNA構築", desc: "自社の財務・事業情報を入力" },
              { step: "02", title: "補助金検索", desc: "AIが相性の良い補助金を提案" },
              { step: "03", title: "書類管理", desc: "e-Cabinetで必要書類を集約" },
              { step: "04", title: "計画書作成", desc: "AIが論理的な下書きを生成" },
            ].map((item) => (
              <div key={item.step} style={{ textAlign: "center", padding: 16, background: "var(--color-surface-hover)", borderRadius: 12 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--color-primary)", opacity: 0.3, marginBottom: 4 }}>{item.step}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 1. ダッシュボードの活用 */}
        <section className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, borderBottom: "2px solid var(--color-primary-light)", paddingBottom: 8 }}>
                1. ダッシュボードで現状を把握
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
                ログイン後、最初に見るのがダッシュボードです。現在「公募中」の補助金数や「最大でいくらもらえるか」の目安がひと目で分かります。
              </p>
              <div style={{ background: "#f0f7ff", padding: 16, borderRadius: 12, borderLeft: "4px solid #3b82f6" }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1e40af" }}>💡 ここがポイント！</h4>
                <ul style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 20 }}>
                  <li><strong>アラートを確認:</strong> 締切間近の補助金は画面上部に赤色で表示されます。</li>
                  <li><strong>最大補助額の目安:</strong> DNAデータに基づき、自社が受給できる可能性のある概算額をAIが算出しています。</li>
                </ul>
              </div>
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-lg)", border: "1px solid var(--color-border)" }}>
              <img src="/guide/dashboard.png" alt="Dashboard" style={{ width: "100%" }} />
            </div>
          </div>
        </section>

        {/* 2. 統合企業カルテ DNA */}
        <section className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
            <div style={{ order: 2 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, borderBottom: "2px solid var(--color-primary-light)", paddingBottom: 8 }}>
                2. 統合企業カルテ (DNA) の登録
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
                これが「SubsidyNavi」の心臓部です。基本・財務・事業・人事の4つの側面から企業データを登録します。データが正確であるほど、AIの分析精度が上がります。
              </p>
              <div style={{ background: "#fff9f0", padding: 16, borderRadius: 12, borderLeft: "4px solid #f59e0b" }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#92400e" }}>💡 ここがポイント！</h4>
                <ul style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 20 }}>
                  <li><strong>財務データの活用:</strong> 財務諸表の数値を入力することで、補助金要件（売上減少率など）を自動判定します。</li>
                  <li><strong>強みの言語化:</strong> 事業DNAに入力した「自社の強み」は、事業計画書の自動生成時に「採択の根拠」として引用されます。</li>
                </ul>
              </div>
            </div>
            <div style={{ order: 1, borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-lg)", border: "1px solid var(--color-border)" }}>
              <img src="/guide/dna.png" alt="DNA Page" style={{ width: "100%" }} />
            </div>
          </div>
        </section>

        {/* 3. 補助金検索とAIアドバイス */}
        <section className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, borderBottom: "2px solid var(--color-primary-light)", paddingBottom: 8 }}>
                3. 補助金検索とAIアドバイス
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
                「補助金を探す」メニューでは、AIが各案件の「自社との相性」と「採択のための改善点」をリアルタイムで提示します。
              </p>
              <div style={{ background: "#ecfdf5", padding: 16, borderRadius: 12, borderLeft: "4px solid #10b981" }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#065f46" }}>💡 ここがポイント！</h4>
                <ul style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 20 }}>
                  <li><strong>成功の鍵を確認:</strong> AIが「なぜ今この補助金が狙い目か」をアドバイスします。</li>
                  <li><strong>マッチングスコア:</strong> 登録したDNA情報を元に算出されるため、まずはDNAを充実させることが重要です。</li>
                </ul>
              </div>
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-lg)", border: "1px solid var(--color-border)" }}>
              <img src="/guide/search.png" alt="Search Results" style={{ width: "100%" }} />
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {/* GOOD */}
          <div className="card" style={{ borderTop: "4px solid var(--color-success)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: "var(--color-success)" }}>
              ✅ 採択されやすい計画書のポイント
            </h2>
            <ul style={{ display: "flex", flexDirection: "column", gap: 16, paddingLeft: 0, listStyle: "none" }}>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                <strong>ストーリーの論理性:</strong><br/>
                「自社の強み」→「市場の機会」→「だからこの設備（IT）が必要」→「導入すればこれだけ売上が上がる」という流れを意識してください。
              </li>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                <strong>加点項目の取得:</strong><br/>
                「賃上げ表明」や「経営革新計画」などの事前策定は、数点の差で合否が決まる補助金審査において非常に強力です。
              </li>
            </ul>
          </div>

          {/* NG */}
          <div className="card" style={{ borderTop: "4px solid var(--color-error)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: "var(--color-error)" }}>
              ❌ よくある不採択理由（NG項目）
            </h2>
            <ul style={{ display: "flex", flexDirection: "column", gap: 16, paddingLeft: 0, listStyle: "none" }}>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                <strong>具体性の欠如:</strong><br/>
                「効率化を図る」だけでなく「誰の業務が週に何時間削減されるか」まで数値で表現しましょう。
              </li>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                <strong>要件未達:</strong><br/>
                パソコン単体や車両など、汎用性の高いものは対象外になることが多いです。公募要領を本システムで要約して確認しましょう。
              </li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}
