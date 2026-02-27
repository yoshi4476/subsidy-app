"use client";

export default function LegalPrivacyPage() {
  return (
    <div className="fade-in legal-page">
      <div className="page-header">
        <h1>プライバシーポリシー</h1>
        <p>最終更新日：2026年2月27日</p>
      </div>

      <div className="card">
        <section>
          <h2>1. 個人情報の収集方法</h2>
          <p>
            当サービスは、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、銀行口座番号などの個人情報をお尋ねすることがあります。また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、当方の提携先（情報提供元、広告主、広告配信先などを含みます。）などから収集することがあります。
          </p>
        </section>

        <section>
          <h2>2. 個人情報を収集・利用する目的</h2>
          <p>
            当サービスが個人情報を収集・利用する目的は、以下のとおりです。
            <ul>
              <li>当サービスの提供・運営のため</li>
              <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
              <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等及び当方が提供する他のサービスの案内のメールを送付するため</li>
              <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>3. 個人情報の第三者提供</h2>
          <p>
            当サービスは、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
          </p>
        </section>

        <section>
          <h2>4. 個人情報の開示・訂正・削除</h2>
          <p>
            ユーザーは、当サービスの定める手続きにより、本人確認を行った上で、自身の個人情報の開示、訂正、追加、削除を請求することができます。
          </p>
        </section>

        <section>
          <h2>5. プライバシーポリシーの変更</h2>
          <p>
            本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。当方が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。
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
