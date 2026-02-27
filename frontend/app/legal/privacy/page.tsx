"use client";

export default function LegalPrivacyPage() {
  return (
    <div className="fade-in legal-page">
      <div className="page-header">
        <h1>プライバシーポリシー</h1>
        <p>最終更新日：2026年2月27日</p>
      </div>

      <div className="card legal-content">
        <section>
          <h2>はじめに</h2>
          <p>
            当サイト運営者（以下「当方」といいます。）は、提供するサービス「SubsidyNavi」（以下「本サービス」といいます。）における会員の個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。当方は、個人情報の保護に関する法令を遵守し、会員が安心して本サービスを利用できる環境の構築に努めます。
          </p>
        </section>

        <section>
          <h2>1. 収集する個人情報</h2>
          <p>
            当方は、会員から以下の情報を収集することがあります。
            <ul>
              <li><strong>アカウント情報</strong>：氏名、メールアドレス、電話番号、会社名、役職等の登録時に入力いただく情報。</li>
              <li><strong>認証情報</strong>：Google等の外部サービス連携により取得される識別子、及び本サービス独自のログインパスワード（ハッシュ化されたもの）。</li>
              <li><strong>企業データ</strong>：財務情報、事業内容、従業員数、加点項目等の補助金診断に必要な企業の機密情報。</li>
              <li><strong>支払情報</strong>：クレジットカード情報（Stripe等の決済代行会社を通じて取得し、当方サーバーには直接保存しません）、銀行口座情報。</li>
              <li><strong>利用履歴</strong>：本サービス内での検索履歴、チャット履歴、作成書類の内容、IPアドレス、クッキー（Cookie）、端末情報、アクセスログ。</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>2. 利用目的</h2>
          <p>
            当方は、収集した情報を以下の目的で利用します。
            <ul>
              <li>本サービスの提供、維持、保護及び改善のため</li>
              <li>補助金の診断、マッチング、及び書類作成支援等のAI機能提供のため</li>
              <li>会員の本人確認、及び不正利用防止のため</li>
              <li>利用料金の決済、請求管理のため</li>
              <li>本サービスに関するアップデート、重要なお知らせ、及びキャンペーン等のご案内のため</li>
              <li>会員からのお問い合わせへの対応、及びカスタマーサポートのため</li>
              <li>個人を識別できない形式に加工した統計データの作成、及びマーケティング分析のため</li>
              <li>新サービスの開発、及び既存サービスの機能拡充のため</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>3. 個人情報の管理・保護</h2>
          <p>
            当方は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために、以下の物理的、技術的措置を講じています。
            <ul>
              <li>SSL/TLSによる通信の暗号化。</li>
              <li>データベースの厳格なアクセス制御。</li>
              <li>脆弱性診断の定期的な実施とセキュリティアップデート。</li>
              <li>個人情報の取り扱いに関する担当者の限定。</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>4. 第三者提供の禁止</h2>
          <p>
            当方は、次に掲げる場合を除いて、あらかじめ会員の同意を得ることなく、第三者に個人情報を提供することはありません。
            <ul>
              <li>法令に基づく場合。</li>
              <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき。</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき。</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合。</li>
              <li>合併、会社分割、営業譲渡その他の事由によって事業の承継が行われる場合。</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>5. 業務委託</h2>
          <p>
            当方は、利用目的の達成に必要な範囲内において、個人情報の取り扱いの全部または一部を外部に委託することがあります（サーバー運営会社、決済代行会社等）。この場合、当方は委託先に対して必要かつ適切な監督を行います。
          </p>
        </section>

        <section>
          <h2>6. 個人情報の開示・訂正・停止等</h2>
          <p>
            会員は、当方に対し、個人情報保護法の定めに基づき個人情報の開示、訂正、追加、削除、利用停止等を求めることができます。当方は、会員本人であることを確認した上で、遅滞なく対応いたします。ただし、法令により当方がこれらの義務を負わない場合は、この限りではありません。
          </p>
        </section>

        <section>
          <h2>7. Cookie（クッキー）及びアクセス解析ツールの利用</h2>
          <p>
            1. 本サービスでは、会員の利便性向上、及びアクセス状況の分析のためにCookie（クッキー）を使用しています。会員はブラウザの設定によりCookieを無効にすることができますが、その場合、本サービスの一部が正常に機能しない可能性があります。
            <br />
            2. 本サービスでは、Google Analytics等のアクセス解析ツールを利用し、トラフィックデータの収集を行っています。これらのデータは匿名で収集されており、個人を特定するものではありません。
          </p>
        </section>

        <section>
          <h2>8. お問い合わせ窓口</h2>
          <p>
            個人情報の取り扱いに関するご相談、苦情、及び開示等の請求については、本サービス内のお問い合わせフォーム、または管理担当者までご連絡ください。
          </p>
        </section>

        <section>
          <h2>9. 本ポリシーの変更</h2>
          <p>
            当方は、必要に応じて本ポリシーの内容を変更することがあります。変更した場合には、本サービス上に掲載し、会員に通知するものとします。変更後の本ポリシーは、本サービス上に掲載された時点より効力を生じるものとします。
          </p>
        </section>
      </div>

      <style jsx>{`
        .legal-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          font-family: 'Inter', 'Noto Sans JP', sans-serif;
        }
        .legal-content {
          padding: 48px;
          border-radius: 16px;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          color: #1e293b;
        }
        h1 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 8px;
          color: #0f172a;
        }
        .page-header p {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 40px;
        }
        section {
          margin-bottom: 48px;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          border-left: 4px solid var(--color-success);
          padding-left: 1rem;
          color: #0f172a;
        }
        p {
          line-height: 1.8;
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        ul {
          margin: 1rem 0;
          padding-left: 1.5rem;
          list-style-type: disc;
        }
        li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        @media (max-width: 640px) {
          .legal-content {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
}
