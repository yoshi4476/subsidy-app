"use client";

export default function LegalCommercialPage() {
  return (
    <div className="fade-in legal-page">
      <div className="page-header">
        <h1>特定商取引法に基づく表記</h1>
        <p>最終更新日：2026年2月27日</p>
      </div>

      <div className="card">
        <table className="legal-table">
          <tbody>
            <tr>
              <th>サービス名</th>
              <td>SubsidyNavi（サブシディ・ナビ）</td>
            </tr>
            <tr>
              <th>運営事業者</th>
              <td>LinkDesign（管理者：若田）</td>
            </tr>
            <tr>
              <th>所在地</th>
              <td>東京都（詳細はご請求により遅滞なく開示いたします）</td>
            </tr>
            <tr>
              <th>販売価格</th>
              <td>月額料金制（詳細は各プランの紹介ページをご参照ください）</td>
            </tr>
            <tr>
              <th>商品代金以外の必要料金</th>
              <td>インターネット接続料金、通信料金等はお客様のご負担となります。</td>
            </tr>
            <tr>
              <th>支払方法</th>
              <td>銀行振込、クレジットカード決済（Stripe）</td>
            </tr>
            <tr>
              <th>サービス提供の時期</th>
              <td>お支払い手続き完了後、即時（招待登録完了後から利用可能）</td>
            </tr>
            <tr>
              <th>返金・キャンセルについて</th>
              <td>サービスの性質上、原則として返品・返金には応じられません。解約はいつでも可能ですが、次回更新時からの停止となります。</td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .legal-page {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 60px;
        }
        .legal-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .legal-table th, .legal-table td {
          padding: 16px;
          border-bottom: 1px solid #edf2f7;
          text-align: left;
          font-size: 15px;
        }
        .legal-table th {
          width: 200px;
          background: #f7fafc;
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .legal-table td {
          color: var(--color-text-main);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
