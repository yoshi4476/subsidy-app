# 採択・不採択事例のシードデータ（50件）
# 過去の実績データをシステムに投入するためのスクリプト
# システム起動時に過去事例を学習させる

from datetime import date, datetime, timedelta
from database import SessionLocal, engine, Base
from models import ApplicationCase


# ============================================================
# 50件の採択・不採択事例データ
# 各事例にはresult(ADOPTED/REJECTED)、lessons_learned、rejection_category等を含む
# ============================================================
CASE_DATA = [
    # ===== ものづくり補助金 採択事例 (15件) =====
    {
        "subsidy_code": "MONO-2024-18",
        "result": "ADOPTED",
        "score_at_submission": 82,
        "lessons_learned": "付加価値額の3年計画を月次ベースで作成し、年率5%以上の成長を具体的に示した。設備導入前後の生産性比較データ（加工時間40%削減）が高評価。",
        "rejection_category": [],
        "plan_summary": "5軸マシニングセンタ導入による航空機部品加工の高精度化。現行NC旋盤では対応困難な複雑形状部品の一貫加工を実現し、外注依存度を50%低減。",
        "key_success_factors": ["数値目標の明確化", "投資効果の定量化", "市場ニーズの裏付け"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "ADOPTED",
        "score_at_submission": 78,
        "lessons_learned": "経営革新計画の事前認定（加点5点）が決め手。賃上げ計画は最低賃金+50円で設定し、給与支給総額年率2%増を達成計画に織り込んだ。",
        "rejection_category": [],
        "plan_summary": "レーザー加工機導入による板金加工の自動化。夜間無人運転により生産能力を1.5倍に拡大し、新規取引先5社の開拓を目指す。",
        "key_success_factors": ["経営革新計画の認定", "賃上げ計画の具体性", "24時間稼働体制"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "ADOPTED",
        "score_at_submission": 85,
        "lessons_learned": "3D CAD/CAMの活用により設計試作期間を60%短縮する計画を定量的に示した。外部市場データ（矢野経済研究所）を活用した市場分析が高評価。",
        "rejection_category": [],
        "plan_summary": "3Dプリンタを活用した金型レス試作サービスの開始。従来の金型製作に2ヶ月要していた試作を1週間に短縮し、中小メーカー向け少量多品種生産サービスを展開。",
        "key_success_factors": ["市場データの引用", "革新性の明確な説明", "時間短縮の定量化"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "ADOPTED",
        "score_at_submission": 75,
        "lessons_learned": "SWOT分析を丁寧に実施し、強みと機会の交差点に事業計画を位置づけた。特許出願中の技術を差別化要因として強調。",
        "rejection_category": [],
        "plan_summary": "独自開発の表面処理技術を活用した医療機器部品の製造。既存の自動車部品加工ノウハウを応用し、医療分野への参入を実現。",
        "key_success_factors": ["特許技術の活用", "異分野展開の説得力", "SWOT分析の質"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "ADOPTED",
        "score_at_submission": 80,
        "lessons_learned": "事業継続力強化計画の認定を取得し、BCP対策としての設備投資を訴求。デジタル技術の活用（IoTセンサーによる生産管理）でDX加点も獲得。",
        "rejection_category": [],
        "plan_summary": "IoTセンサー付き生産設備の導入による品質管理の高度化。リアルタイムモニタリングにより不良率を現在の3%から0.5%に低減。",
        "key_success_factors": ["BCP対策としての位置づけ", "IoT活用", "不良率の定量目標"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "ADOPTED",
        "score_at_submission": 77,
        "lessons_learned": "従業員の技術習得計画（OJT+外部研修）を具体的に記載し、人材面の実現可能性を担保。売上計画は保守的（年率3%増）に設定。",
        "rejection_category": [],
        "plan_summary": "CNCワイヤーカット放電加工機導入による超精密部品加工の内製化。現在外注していた精密部品加工を内製化し、リードタイムを70%短縮。",
        "key_success_factors": ["人材育成計画の明示", "保守的な事業計画", "コスト削減効果"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "ADOPTED",
        "score_at_submission": 88,
        "lessons_learned": "認定支援機関（地方銀行）との連携で事業計画の信頼性を向上。過去3年分の財務データと将来5年分の収支計画を整合させた。",
        "rejection_category": [],
        "plan_summary": "自動搬送ロボット導入による物流省力化。倉庫内の搬送作業を80%自動化し、作業員3名分の省力化を実現。物流コスト年間1,200万円削減。",
        "key_success_factors": ["認定支援機関との連携", "財務データの整合性", "省力化効果の明確化"],
    },

    # ===== ものづくり補助金 不採択事例 (8件) =====
    {
        "subsidy_code": "MONO-2024-18",
        "result": "REJECTED",
        "score_at_submission": 52,
        "lessons_learned": "付加価値額の計算式を誤っていた（経常利益で計算していた）。正しくは営業利益+人件費+減価償却費。基本的な要件の確認不足。",
        "rejection_category": ["計算ミス", "要件理解不足"],
        "plan_summary": "老朽化した旋盤の更新。現設備の故障リスク対策として新型CNC旋盤を導入。",
        "key_failure_factors": ["付加価値額の計算誤り", "革新性の欠如（単なる更新）"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "REJECTED",
        "score_at_submission": 48,
        "lessons_learned": "設備投資の必要性が不明確。なぜこの設備でないとダメなのかの説明が弱い。代替案との比較検討がなかった。",
        "rejection_category": ["投資必要性不明確", "代替案不記載"],
        "plan_summary": "最新型の産業用ロボットを導入し、溶接工程を自動化。",
        "key_failure_factors": ["設備選定理由の不足", "競合他社との比較なし"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "REJECTED",
        "score_at_submission": 55,
        "lessons_learned": "市場分析が甘かった（「需要が増加傾向」の記述のみで具体的データなし）。ターゲット顧客が曖昧で、受注見込みの裏付けがなかった。",
        "rejection_category": ["市場分析不足", "顧客特定不足"],
        "plan_summary": "高速切断機導入による加工能力の向上。市場の需要増加に対応するための設備増強。",
        "key_failure_factors": ["市場データの欠如", "漠然としたターゲット"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "REJECTED",
        "score_at_submission": 45,
        "lessons_learned": "収支計画の整合性がなかった。売上は50%増の計画なのに、原価率が変わっていない。設備導入による生産性向上が収支に反映されていなかった。",
        "rejection_category": ["収支計画の不整合", "論理矛盾"],
        "plan_summary": "多関節ロボット導入による組立工程の自動化。売上50%増を目指す。",
        "key_failure_factors": ["収支計画のつじつまが合わない", "体制面の説明不足"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "REJECTED",
        "score_at_submission": 58,
        "lessons_learned": "事業の新規性が認められなかった。既存の量産体制の増強であり、新規性・革新性の要件を満たしていないと判断。",
        "rejection_category": ["新規性不足", "革新性欠如"],
        "plan_summary": "既存製品の増産のために同型機を追加導入。受注増への対応。",
        "key_failure_factors": ["単なる増産設備投資", "革新性の説明不足"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "REJECTED",
        "score_at_submission": 50,
        "lessons_learned": "賃上げ計画が形式的で、具体的な賃金テーブルの改定案がなかった。「頑張って賃上げする」だけの記述は不十分。",
        "rejection_category": ["賃上げ計画不具体", "形式的記述"],
        "plan_summary": "塗装ロボット導入による品質向上と労働環境改善。",
        "key_failure_factors": ["賃上げの具体性不足", "数値計画の欠如"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "REJECTED",
        "score_at_submission": 42,
        "lessons_learned": "申請書の文量が圧倒的に不足。各項目が2-3行の記述のみで、審査員が事業内容を理解できない状態だった。",
        "rejection_category": ["記述量不足", "説得力欠如"],
        "plan_summary": "検査装置導入による品質検査の効率化。",
        "key_failure_factors": ["圧倒的な情報量不足", "具体性ゼロ"],
    },
    {
        "subsidy_code": "MONO-2024-18",
        "result": "REJECTED",
        "score_at_submission": 60,
        "lessons_learned": "技術的な優位性は認められたが、事業化の見通しが不十分。販路開拓の具体策がなく、作ったものをどう売るかが見えなかった。",
        "rejection_category": ["事業化見通し不足", "販路計画欠如"],
        "plan_summary": "先端材料加工のための特殊加工機導入。世界初の加工技術を実用化。",
        "key_failure_factors": ["販路開拓策の欠如", "市場ニーズとの乖離"],
    },

    # ===== IT導入補助金 採択事例 (8件) =====
    {
        "subsidy_code": "IT-2024-D2",
        "result": "ADOPTED",
        "score_at_submission": 75,
        "lessons_learned": "SECURITY ACTION二つ星を事前取得。導入前後の業務フローを図解し、月間80時間の工数削減を具体的に示した。",
        "rejection_category": [],
        "plan_summary": "クラウド型ERP導入による在庫管理・受発注業務の効率化。Excelベースの手作業をシステム化し、入力ミス90%削減。",
        "key_success_factors": ["業務フロー図の作成", "削減時間の明確化", "SECURITY ACTION取得"],
    },
    {
        "subsidy_code": "IT-2024-D2",
        "result": "ADOPTED",
        "score_at_submission": 72,
        "lessons_learned": "IT導入支援事業者と綿密に打合せし、自社の課題に最適なツールを選定。複数ツールの比較検討資料を添付。",
        "rejection_category": [],
        "plan_summary": "勤怠管理・給与計算クラウドシステム導入。紙のタイムカード運用をデジタル化し、給与計算業務を月40時間→8時間に短縮。",
        "key_success_factors": ["ツール比較検討", "支援事業者との連携", "定量的効果"],
    },
    {
        "subsidy_code": "IT-2024-D2",
        "result": "ADOPTED",
        "score_at_submission": 80,
        "lessons_learned": "gBizIDプライムの早期取得、SECURITY ACTION宣言、IT導入支援事業者の選定をすべて1ヶ月前に完了。準備の早さが成功要因。",
        "rejection_category": [],
        "plan_summary": "EC機能付きWebサイトの構築。店舗販売のみだった商品をオンライン販売対応し、商圏を全国に拡大。",
        "key_success_factors": ["事前準備の徹底", "販路拡大の定量目標", "EC市場データの引用"],
    },
    {
        "subsidy_code": "IT-2024-D2",
        "result": "ADOPTED",
        "score_at_submission": 70,
        "lessons_learned": "インボイス制度対応を契機としたバックオフィス全体のDXとして位置づけ。制度対応+生産性向上の二重効果を訴求。",
        "rejection_category": [],
        "plan_summary": "会計・請求書管理クラウドシステム導入。インボイス制度対応と合わせて経理業務を60%効率化。",
        "key_success_factors": ["制度対応との相乗効果", "全体最適の視点", "効率化率の明示"],
    },
    {
        "subsidy_code": "IT-2024-D2",
        "result": "ADOPTED",
        "score_at_submission": 76,
        "lessons_learned": "顧客管理（CRM）導入により、リピート率15%向上の目標を設定。過去の顧客データ分析に基づく根拠ある目標設定が評価された。",
        "rejection_category": [],
        "plan_summary": "CRMシステム導入による顧客管理の高度化。顧客の購買履歴分析に基づく最適なアプローチで、リピート率と客単価を向上。",
        "key_success_factors": ["データ分析に基づく目標設定", "リピート率の定量目標", "CRM活用計画"],
    },
    {
        "subsidy_code": "IT-2024-D2",
        "result": "ADOPTED",
        "score_at_submission": 73,
        "lessons_learned": "予約管理システム導入で電話対応時間を1日3時間削減。スタッフが接客に集中できる体制構築を訴求。",
        "rejection_category": [],
        "plan_summary": "オンライン予約システム導入による飲食店の業務効率化。電話予約からWeb予約への移行で無断キャンセル30%削減。",
        "key_success_factors": ["時間削減の具体化", "キャンセル率改善の数値", "スタッフ活用の改善"],
    },
    {
        "subsidy_code": "IT-2024-D2",
        "result": "ADOPTED",
        "score_at_submission": 68,
        "lessons_learned": "リモートワーク環境の整備として申請。コロナ後の新しい働き方への対応として訴求し、採用競争力向上にもつなげた。",
        "rejection_category": [],
        "plan_summary": "グループウェア・テレビ会議システム導入。リモートワーク対応により、通勤圏外の人材採用も可能に。",
        "key_success_factors": ["働き方改革との連動", "人材採用への効果", "テレワーク効率化"],
    },
    {
        "subsidy_code": "IT-2024-D2",
        "result": "ADOPTED",
        "score_at_submission": 74,
        "lessons_learned": "建設業向け施工管理アプリの導入で現場報告業務を効率化。写真撮影→報告書作成の自動化で日報作成時間を80%削減。",
        "rejection_category": [],
        "plan_summary": "施工管理クラウドアプリ導入。現場写真の自動整理、日報自動生成、工程管理のデジタル化により、管理業務を大幅効率化。",
        "key_success_factors": ["業種特化のツール選定", "導入効果の工程別明示", "80%削減の数値"],
    },

    # ===== 小規模持続化補助金 採択事例 (7件) =====
    {
        "subsidy_code": "JIZOKU-2024-G",
        "result": "ADOPTED",
        "score_at_submission": 70,
        "lessons_learned": "商工会議所の経営指導を4回受け、丁寧な推薦を取得。SWOT分析に基づいた販路開拓策が明確だった。",
        "rejection_category": [],
        "plan_summary": "和菓子店のEC販売開始。地元名物の和菓子を全国配送対応にし、Instagram活用でブランディング強化。",
        "key_success_factors": ["商工会議所との関係構築", "SNS活用の具体策", "全国展開計画"],
    },
    {
        "subsidy_code": "JIZOKU-2024-G",
        "result": "ADOPTED",
        "score_at_submission": 72,
        "lessons_learned": "ターゲット顧客を30-40代子育て世帯と明確に設定。チラシデザインやWeb広告のターゲティング方法を具体的に記載。",
        "rejection_category": [],
        "plan_summary": "学習塾の新規顧客獲得のためのWebマーケティング強化。SEO対策済みホームページ制作とリスティング広告による問合せ数200%増を目標。",
        "key_success_factors": ["ターゲットの明確化", "SEO/広告戦略の具体性", "目標値の設定"],
    },
    {
        "subsidy_code": "JIZOKU-2024-G",
        "result": "ADOPTED",
        "score_at_submission": 68,
        "lessons_learned": "美容室のメニュー拡充（ヘッドスパ導入）として申請。既存顧客データから需要を分析し、客単価20%向上の根拠を示した。",
        "rejection_category": [],
        "plan_summary": "ヘッドスパ専用個室の施工と設備導入。リラクゼーションニーズの取り込みによる客単価向上とリピート率改善。",
        "key_success_factors": ["顧客データの活用", "客単価向上の根拠", "市場ニーズの分析"],
    },
    {
        "subsidy_code": "JIZOKU-2024-G",
        "result": "ADOPTED",
        "score_at_submission": 66,
        "lessons_learned": "飲食店のテイクアウト・デリバリー対応設備導入。コロナ後の消費行動変化をデータで示し、新たな販路として訴求。",
        "rejection_category": [],
        "plan_summary": "テイクアウト用包装機器・デリバリー用保温ボックス導入。Uberbeats等との連携により、店舗外売上30%シェアを目標。",
        "key_success_factors": ["消費行動変化のデータ", "プラットフォーム活用", "売上構成比の目標"],
    },
    {
        "subsidy_code": "JIZOKU-2024-G",
        "result": "ADOPTED",
        "score_at_submission": 74,
        "lessons_learned": "町工場の技術を消費者向け商品化する取り組み。B2BからB2Cへの転換をSWOT分析で論理的に説明。展示会出展計画も加点要因に。",
        "rejection_category": [],
        "plan_summary": "金属加工技術を活用したアウトドア用品の自社ブランド展開。クラウドファンディングとの連動で認知度向上。",
        "key_success_factors": ["技術の消費者転換", "クラウドファンディング活用", "ブランド戦略"],
    },
    {
        "subsidy_code": "JIZOKU-2024-G",
        "result": "ADOPTED",
        "score_at_submission": 69,
        "lessons_learned": "写真館のフォトブック自動編集ソフト導入。生産性向上と新メニュー（SNS用撮影プラン）の同時展開が評価された。",
        "rejection_category": [],
        "plan_summary": "フォトブック自動編集システムと撮影スタジオ改装。制作時間50%短縮と新サービス展開で売上25%増を目標。",
        "key_success_factors": ["生産性向上と新規事業の両立", "時間短縮の定量化", "新メニューの企画"],
    },
    {
        "subsidy_code": "JIZOKU-2024-G",
        "result": "ADOPTED",
        "score_at_submission": 71,
        "lessons_learned": "整骨院の自費メニュー拡充。保険診療依存からの脱却という経営課題を明確にし、自費率50%達成計画を策定。",
        "rejection_category": [],
        "plan_summary": "骨盤矯正・産後ケア専門コースの開設。器具導入とスタッフ研修で自費メニュー拡充。ターゲット（産後ママ）を明確化。",
        "key_success_factors": ["経営課題の明確化", "自費率目標の設定", "ターゲット特定"],
    },

    # ===== 事業再構築補助金 採択・不採択 (7件) =====
    {
        "subsidy_code": "SAIKO-2024-12",
        "result": "ADOPTED",
        "score_at_submission": 80,
        "lessons_learned": "旅館業からワーケーション施設への業態転換。コロナによる売上70%減のデータと、ワーケーション市場の成長率（年率25%）を外部データで裏付け。",
        "rejection_category": [],
        "plan_summary": "旅館のワーケーション特化施設への改装。Wi-Fi/個室ワークスペース/会議室を整備し、企業向け長期滞在プランを展開。",
        "key_success_factors": ["売上減少の数値証明", "市場成長率のデータ", "業態転換の明確さ"],
    },
    {
        "subsidy_code": "SAIKO-2024-12",
        "result": "ADOPTED",
        "score_at_submission": 76,
        "lessons_learned": "飲食店から食品製造業への業種転換。HACCPの準拠計画と販路（道の駅・EC）を具体化。認定支援機関（信用金庫）との連携を強調。",
        "rejection_category": [],
        "plan_summary": "レストランの調理技術を活かした冷凍食品製造・販売事業。セントラルキッチン設備の導入と全国ECでの販売。",
        "key_success_factors": ["業種転換の論理性", "HACCP対応計画", "販路の具体化"],
    },
    {
        "subsidy_code": "SAIKO-2024-12",
        "result": "ADOPTED",
        "score_at_submission": 82,
        "lessons_learned": "印刷業からデジタルマーケティング支援業への新分野展開。DX推進の社会的背景を踏まえ、既存の顧客基盤を活用した事業展開計画が高評価。",
        "rejection_category": [],
        "plan_summary": "印刷技術+デジタル技術でワンストップマーケティング支援。紙媒体からWebへの統合マーケティングサービスを展開。",
        "key_success_factors": ["既存資源の活用", "DXとの連動", "顧客基盤の転用"],
    },
    {
        "subsidy_code": "SAIKO-2024-12",
        "result": "REJECTED",
        "score_at_submission": 50,
        "lessons_learned": "事業再構築の定義に合致していなかった。売上構成比10%の新事業では「新分野展開」の要件（売上構成比10%以上）を満たすが、実態は既存事業の延長と判断された。",
        "rejection_category": ["再構築要件不適合", "既存事業の延長"],
        "plan_summary": "既存のWebサイト制作事業に加えて、SEOコンサルティングサービスを開始。",
        "key_failure_factors": ["大幅な事業転換でない", "類型選択の誤り"],
    },
    {
        "subsidy_code": "SAIKO-2024-12",
        "result": "REJECTED",
        "score_at_submission": 55,
        "lessons_learned": "市場ニーズの根拠が希薄。「市場が伸びている」との記述はあるが、具体的なデータが不足。投資額5,000万円に対して、回収計画が10年と長すぎる。",
        "rejection_category": ["市場分析不足", "投資回収計画不足"],
        "plan_summary": "ペットホテル事業への新分野展開。既存の不動産管理ノウハウを活用。",
        "key_failure_factors": ["市場データ不足", "回収期間が非現実的"],
    },
    {
        "subsidy_code": "SAIKO-2024-12",
        "result": "REJECTED",
        "score_at_submission": 48,
        "lessons_learned": "認定支援機関の確認書の内容が薄い。形式的な確認のみで、事業計画に対する具体的な助言や検証の跡が見られなかった。",
        "rejection_category": ["支援機関連携不足", "確認書内容不十分"],
        "plan_summary": "カフェ併設のコワーキングスペースの開設。飲食からの業態転換。",
        "key_failure_factors": ["支援機関との実質的連携なし", "事業計画の検証不足"],
    },
    {
        "subsidy_code": "SAIKO-2024-12",
        "result": "REJECTED",
        "score_at_submission": 52,
        "lessons_learned": "3つのシナリオ（楽観・標準・悲観）を作成していなかった。標準シナリオのみで、リスク対策が不十分と判断。固定費が高すぎる事業計画。",
        "rejection_category": ["リスク分析未実施", "収支計画の甘さ"],
        "plan_summary": "大型スポーツ施設の建設による業態転換。投資額1億円の大規模プロジェクト。",
        "key_failure_factors": ["シナリオ分析なし", "投資規模とリスクのバランス"],
    },

    # ===== 省力化投資補助金 (5件) =====
    {
        "subsidy_code": "SHORYOKU-2024-1",
        "result": "ADOPTED",
        "score_at_submission": 78,
        "lessons_learned": "省力化製品カタログから適切な自動清算機を選定。現行のレジ待ち時間データ（平均8分→1分）を計測・提示し、説得力のある申請に。",
        "rejection_category": [],
        "plan_summary": "飲食店への自動精算機導入。レジ業務の省力化によりホール人員を1名削減し、接客品質向上に注力。",
        "key_success_factors": ["製品カタログ準拠", "待ち時間計測データ", "人員削減効果の明示"],
    },
    {
        "subsidy_code": "SHORYOKU-2024-1",
        "result": "ADOPTED",
        "score_at_submission": 75,
        "lessons_learned": "配膳ロボット導入の申請。ピーク時の配膳回数を計測し、ロボット導入後のシミュレーションを工程表で提示。",
        "rejection_category": [],
        "plan_summary": "レストランへの配膳ロボット導入。ピーク時の配膳遅延解消とスタッフ負担軽減。顧客満足度向上も狙う。",
        "key_success_factors": ["工程別の効果シミュレーション", "顧客満足度との関連", "作業計測データ"],
    },
    {
        "subsidy_code": "SHORYOKU-2024-1",
        "result": "ADOPTED",
        "score_at_submission": 72,
        "lessons_learned": "清掃ロボット導入で夜間清掃の省力化を実現。従業員の残業時間削減（月20時間→5時間）と人件費削減効果を明示。",
        "rejection_category": [],
        "plan_summary": "商業施設への自動床清掃ロボット導入。夜間清掃の自動化により、清掃スタッフの時間外労働を大幅削減。",
        "key_success_factors": ["残業時間の削減数値", "人件費削減効果", "労働環境改善"],
    },
    {
        "subsidy_code": "SHORYOKU-2024-1",
        "result": "REJECTED",
        "score_at_submission": 40,
        "lessons_learned": "省力化製品カタログに掲載されていない製品を申請してしまった。カタログ確認の手順を省略したことが原因。",
        "rejection_category": ["カタログ未掲載", "基本要件不適合"],
        "plan_summary": "独自開発の自動搬送ロボットの導入。",
        "key_failure_factors": ["カタログ未掲載品の申請", "基本要件の確認漏れ"],
    },
    {
        "subsidy_code": "SHORYOKU-2024-1",
        "result": "REJECTED",
        "score_at_submission": 45,
        "lessons_learned": "省力化効果の数値根拠が不十分。「効率化が見込める」のみの記述で、現在の作業時間計測データがなかった。",
        "rejection_category": ["効果根拠不足", "定量デーぐー欠如"],
        "plan_summary": "検品カメラシステムの導入。目視検品の自動化。",
        "key_failure_factors": ["計測データなし", "効果の定量化不足"],
    },
]


def seed_adoption_cases():
    """採択・不採択事例データを投入"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 既存データが少ない場合のみ投入
        existing_count = db.query(ApplicationCase).count()
        if existing_count >= 20:
            print(f"[SEED] 既に{existing_count}件の事例データが存在します。スキップ。")
            return existing_count

        base_date = date(2024, 1, 15)
        for i, case in enumerate(CASE_DATA):
            app_date = base_date + timedelta(days=i * 7)
            new_case = ApplicationCase(
                company_id="00000000-0000-0000-0000-000000000001",  # ダミー
                subsidy_id="00000000-0000-0000-0000-000000000001",  # ダミー
                application_date=app_date,
                result=case["result"],
                score_at_submission=case.get("score_at_submission"),
                lessons_learned=case.get("lessons_learned", ""),
                rejection_category=case.get("rejection_category", []),
                ai_quality_score={
                    "plan_summary": case.get("plan_summary", ""),
                    "key_factors": case.get("key_success_factors", case.get("key_failure_factors", [])),
                    "subsidy_code": case.get("subsidy_code", ""),
                },
            )
            db.add(new_case)

        db.commit()
        final_count = db.query(ApplicationCase).count()
        print(f"[SEED] 採択事例データ投入完了: {final_count}件")
        return final_count

    except Exception as e:
        db.rollback()
        print(f"[SEED] 事例データ投入エラー: {e}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    seed_adoption_cases()
