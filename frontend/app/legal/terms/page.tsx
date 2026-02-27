"use client";

export default function LegalTermsPage() {
  return (
    <div className="fade-in legal-page">
      <div className="page-header">
        <h1>利用規約</h1>
        <p>最終更新日：2026年2月27日</p>
      </div>

      <div className="card">
        <section>
          <h2>第1条（適用）</h2>
          <p>
            本利用規約（以下「本規約」といいます。）は、SubsidyNavi（以下「当サービス」といいます。）の提供条件及び当サービスと会員との間の権利義務関係を定めるものです。本サービスの利用に際しては、本規約の全文をお読みいただいたうえで、本規約に同意いただく必要があります。
          </p>
        </section>

        <section>
          <h2>第2条（登録）</h2>
          <p>
            1. 当サービスの利用を希望する者（以下「登録希望者」といいます。）は、本規約を遵守することに同意し、かつ当方の定める一定の情報を当方の定める方法で提供することにより、当方に対し、当サービスの利用の登録を申請することができます。
            <br />
            2. 当方は、登録希望者が当方の招待制に基づき、招待リストに含まれていることを条件として登録を承認します。
          </p>
        </section>

        <section>
          <h2>第3条（料金及び支払方法）</h2>
          <p>
            会員は、当サービス利用の対価として、別途当方が定め、表示する利用料金を、当方が指定する支払方法により支払うものとします。
          </p>
        </section>

        <section>
          <h2>第4条（禁止事項）</h2>
          <p>
            会員は、本サービスの利用にあたり、以下の各号のいずれかに該当する行為をしてはなりません。
            <ul>
              <li>法令に違反する行為、または犯罪行為に関連する行為</li>
              <li>当方、本サービスの他の利用者またはその他の第三者に対する詐欺または脅迫行為</li>
              <li>公序良俗に反する行為</li>
              <li>本サービスのネットワークまたはシステム等に過度な負荷をかける行為</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>第5条（サービスの停止等）</h2>
          <p>
            当方は、以下のいずれかに該当する場合には、利用者に事前に通知することなく、本サービスの全部または一部の提供を停止または中断することができるものとします。
            <ul>
              <li>本サービスに係るコンピューター・システムの点検または保守作業を緊急に行う場合</li>
              <li>コンピューター、通信回線等が事故により停止した場合</li>
              <li>地震、落雷、火災、風水害、停電、天災地変などの不可抗力により本サービスの運営ができなくなった場合</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>第6条（免責事項）</h2>
          <p>
            当方は、当サービスが会員の特定の目的に適合すること、期待する機能・商品的価値・正確性・有用性を有すること、及び不具合が生じないことについて、何ら保証するものではありません。補助金の採択を確約するものでもありません。
          </p>
        </section>
      </div>

      <style jsx>{`
        .legal-page {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 60px;
        }
        section {
          margin-bottom: 32px;
        }
        h2 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--color-primary);
        }
        p {
          line-height: 1.8;
          color: var(--color-text-main);
          font-size: 15px;
        }
        ul {
          margin-top: 8px;
          padding-left: 20px;
        }
        li {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
