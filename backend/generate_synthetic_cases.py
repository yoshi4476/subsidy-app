# 採択事例のダミーデータ大量生成スクリプト（学習用プロット）
# 各カテゴリー（ものづくり、IT、小規模持続化、事業再構築、省力化）× 各年度（2022、2023、2024）× 各約100件 = 1500件

import sys
import os
import random
import uuid
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
from models import ApplicationCase, Subsidy, Company

# ============================================================
# ダミーデータの構成要素（詳細化版）
# ============================================================
CATEGORIES = [
    {
        "code_prefix": "MONO",
        "name": "ものづくり補助金",
        "plan_components": [
            "5軸マシニングセンタ導入による航空機部品加工の高精度化。加工精度を0.01mmから0.002mmに向上させ、不良率を5%から0.1%へ低減。",
            "レーザー加工機導入による板金加工の自動化。24時間稼働体制を構築し、生産能力を従来の2.5倍に拡大。リードタイムを10日から3日へ短縮。",
            "3Dプリンタを活用した金型レス試作サービスの開始。試作コストを80%削減し、開発期間を2ヶ月から1週間に短縮することで新市場を開拓。",
            "IoTセンサー導入による生産ラインのデジタルツイン化。ダウンタイムを40%削減し、全体設備効率(OEE)を65%から85%に向上。",
            "AI搭載自動検査装置の導入。目視検査の人員を3名から0名へ省人化。検査漏れゼロを達成し、大手メーカーへの供給体制を強化。",
        ],
        "lessons": [
            "ROI(投資対効果)を4.5年と算出し、設備導入による付加価値額向上(年率8%)の根拠を、受注内定書とともに提示したことが高く評価された。",
            "単なる設備更新ではなく、DX技術との掛け合わせによる「生産プロセスの革新」を強調。旧来の職人技を数値化・マニュアル化した点が決め手。",
            "経営革新計画の承認と賃上げ計画（年率3%増）をセットで提示。地域平均賃金を+100円上回る設定で、人材確保の優位性もアピールした。",
        ],
        "success_factors": [
            ["ROIの絶対的数値化", "生産プロセスの抜本的変革", "DX加点の獲得"],
            ["受注見込みの確実性(内定書)", "賃上げ計画の具体性", "付加価値額の5.2%向上"],
            ["市場データの精密引用", "競合他社との技術差別化", "経営革新計画の連動"],
        ]
    },
    {
        "code_prefix": "IT",
        "name": "IT導入補助金",
        "plan_components": [
            "クラウド型ERP導入によるバックオフィスの一元化。月間120時間の事務工数を削減。インボイス制度・電子帳簿保存法に対応し、コンプラ強化。",
            "CRM/SFA導入による営業プロセスの可視化。受注率を12%から25%に向上させ、休眠顧客の掘り起こしで売上2,000万円増を目指す。",
            "AIチャットボットと予約システムの連携導入。24時間自動受付により機会損失を35%削減。カスタマーサクセス部門の負担を60%軽減。",
            "建設現場用施工管理アプリの全社導入。写真整理と報告書作成を現場で完結させ、監督の残業時間を月平均45時間削減。",
            "電子契約システム導入による成約までのリードタイム短縮。印紙代と郵送費で年間150万円のコスト削減と、営業担当の生産性向上。",
        ],
        "lessons": [
            "SECURITY ACTION二つ星の取得に加え、IT導入支援事業者との詳細な業務分析MAPを添付。ツール導入後の業務時間削減を15分単位で算出した。",
            "単一のツール導入に留まらず、社内全てのワークフローをデジタル化する「DXロードマップ」を提示。経営者のIT活用意欲が極めて高いと評価された。",
            "インボイス制度への対応を入り口としつつ、収集したデータを経営分析に活用する「データ経営」への移行計画を具体化した点が評価を分けた。",
        ],
        "success_factors": [
            ["業務分析MAPの精度", "SECURITY ACTION取得済", "120時間の工数削減効果"],
            ["IT支援事業者との強固な連携", "DXロードマップの提示", "データ利活用の具体策"],
            ["労働生産性の25%向上", "インボイス/電帳法対応の完全化", "顧客満足度の数値向上"],
        ]
    },
    {
        "code_prefix": "JIZOKU",
        "name": "小規模事業者持続化補助金",
        "plan_components": [
            "移動販売車の導入による商圏拡大。既存店舗の半径5kmから30kmまで広げ、非対面型サービスとして月商80万円の新規売上を創出。",
            "古民家を改装したカフェのテラス席増設。ペット同伴市場を取り込み、週末の客数を40%増加させる。WEB予約システムの併用で回転率向上。",
            "専門特化型ECサイトの構築と広告運用。特定のニッチニーズ（左利き専用工具など）に絞ることで、広告費用対効果(ROAS)400%を達成計画。",
            "新商品「地産地消ギフトセット」の開発とパッケージ刷新。ふるさと納税返礼品への登録と合わせ、地域外からの外貨獲得を倍増。",
            "宿泊施設の多言語化とスマートチェックイン導入。インバウンド需要を取り込み、客単価を2.5倍に引き上げるプレミアムプランを展開。",
        ],
        "lessons": [
            "商工会議所の指導を5回受け、非常に精緻なSWOT分析を記述。特に「弱み」を「強み」に変える販路開拓ストーリーが審査員の共感を得た。",
            "ターゲットを「30代の共働き世帯」と極めて具体的に特定し、その行動動線に合わせたチラシ配布とSNS広告の併用策を数値目標付きで提示。",
            "コロナ後の消費トレンド（体験型消費）をデータで裏付け、自社の伝統技術をワークショップ化する具体的な収益モデルが高く評価された。",
        ],
        "success_factors": [
            ["SWOT分析の論理的一貫性", "ターゲットの極限までの絞り込み", "商工会議所の推薦"],
            ["SNS広告のROAS予測", "地域資源の独創的活用", "V字回復の説得力"],
            ["小規模ならではのスピード感", "顧客の声に基づく改善", "収益源の多角化"],
        ]
    },
    {
        "code_prefix": "SHORYOKU",
        "name": "省力化投資補助金",
        "plan_components": [
            "全自動配膳ロボット3台の導入。ホールスタッフ2名分の業務を代替。浮いた人員を調理と接客の高度化に再配置し、客単価を500円向上させる。",
            "倉庫内自動搬送ロボット(AGV)の導入。ピッキング作業の歩行距離を1日あたり15km削減。出荷能力を2倍にし、物流コストを30%カット。",
            "ホテルへのセルフチェックイン機とスマートロック導入。ナイトフロント人員をDX化し、夜間の人件費を年間600万円削減。",
            "AI需要予測システムと連動した自動発注端末。廃棄ロスを25%削減。発注業務に要していた店長の時間を毎日2時間から15分へ短縮。",
            "清掃ロボットと自動床洗浄機の導入。深夜の清掃外注費を廃止し、自社スタッフの負担をゼロ化。投資回収期間(PP)を1.8年と試算。",
        ],
        "lessons": [
            "製品カタログの単なる引用ではなく、自社のシフト表上の「どの時間帯のどの業務」が何分削れるかを分単位でシミュレーションした点が最大の影響力を持った。",
            "「人手不足の深刻化」を求人倍率や離職率などの自社データで証明。導入後の労働環境改善が離職抑制につながるロジックを構成。",
            "補助金活用による省力化分を、新メニュー開発や販路開拓という「攻めの経営」へどう転換するかまで詳細に記述したことが評価された。",
        ],
        "success_factors": [
            ["分単位の業務削減シミュレーション", "カタログ製品の最適選定", "投資回収1.8年の合理性"],
            ["深刻な人手不足のデータ証明", "労働環境の劇的改善", "余剰人員の高度化活用"],
            ["運用マニュアルの完備", "保守体制の信頼性", "継続的な生産性向上計画"],
        ]
    },
    {
        "code_prefix": "SHINJIGYOU",
        "name": "新事業進出補助金",
        "plan_components": [
            "既存の金属加工事業の知見を活かした、医療機器分野への新規参入。高精度クリーンルームと専用加工機を導入し、手術用器具の製造ラインを構築。",
            "アパレル製造業による、廃材を活用したサステナブル家具ブランドの立ち上げ。新素材開発とD2C販売サイトの構築を行い、新市場を開拓。",
            "食品卸業による、AIを活用した鮮度予測・冷凍保存技術の導入と、一般消費者向け高品質冷凍食品サブスクリプトサービスの開始。",
        ],
        "lessons": [
            "「新市場性」の証明に、外部調査機関のデータと既存顧客へのアンケート結果を引用。参入障壁と自社の技術的優位性を論理的に解説したことが決め手。",
        ],
        "success_factors": [
            ["新市場のデータ裏付け", "既存技術の革新的転用", "利益率30%の実現性"],
        ]
    },
    {
        "code_prefix": "DAIKIBO",
        "name": "大規模成長投資補助金",
        "plan_components": [
            "地方圏における大規模生産拠点の新設。自動化ラインの導入により、地域に200名の新規雇用を創出し、輸出比率を30%から60%へ向上させる。",
            "次世代半導体部材の量産化に向けたクリティカル設備投資。年率10%を超える高い成長率を維持するための大規模キャパシティ確保。",
        ],
        "lessons": [
            "10億円超の大型投資に対し、銀行の融資証明と強固な財務レバレッジ計画を提示。地域経済へのGDP寄与度を算出した点が非常に高く評価された。",
        ],
        "success_factors": [
            ["大規模雇用の創出", "輸出比率の劇的向上", "地方経済への波及効果証明"],
        ]
    },
    {
        "code_prefix": "SAIKOUCHIKU",
        "name": "事業再構築補助金",
        "plan_components": [
            "既存のガソリン車部品製造から、EV向けバッテリー冷却システムの製造へ事業転換。既存の熱交換技術を応用し、急成長するEV市場へ参入。",
            "対面形式の予備校経営から、VRを活用した完全オンライン型メタバース教育への転換。固定費を削減しつつ、全国・全世界へ商圏を拡大。",
        ],
        "lessons": [
            "「事業再構築指針」への適合を全項目で証明。既存事業の売上減少をデータで裏付け、新事業の市場規模を詳細に予測したことが採択の決め手。",
        ],
        "success_factors": [
            ["再構築指針への100%適合", "デジタル技術による業態転換", "市場の成長性裏付け"],
        ]
    }
]

YEARS = [2022, 2023, 2024, 2025]
TOTAL_CASES_PER_CATEGORY = 150 # 各カテゴリー150件 (目標: 100採択/50不採択)
REJECTION_RATE = 0.333 # 約1/3を不採択にする

# 不採択パターンの定義（詳細化版）
REJECT_REASONS = [
    {
        "category": "ROIおよび定性的根拠の欠如",
        "lesson": "「効率が良くなると思う」という主観的な表現のみで、何時間の削減でいくらの利益が出るかというROIの視点が完全に欠落。具体的数値が皆無で採択に値しないと判断。",
        "factors": ["定量的エビデンスの不在", "主観的推測のみの計画", "経済波及効果の不明確さ"]
    },
    {
        "category": "事業の継続性と体制の不備",
        "lesson": "大規模な投資（5,000万円超）に対し、担当者が1名かつ外部コンサルへの丸投げ状態。社内の技術継承や運用体制が具体化されておらず、破綻リスクが高いと判断された。",
        "factors": ["実行体制の脆弱性", "外部依存の過多", "財務基盤とのミスマッチ"]
    },
    {
        "category": "市場分析不足と独善的計画",
        "lesson": "希望的観測に基づく売上計画。競合他社の分析や市場全体のダウントレンドを無視しており、撤退基準やリスク対策も記述されていないため実現性が著しく低い。",
        "factors": ["客観的な市場分析の欠落", "競合分析の軽視", "リスクヘッジ策の皆由"]
    },
    {
        "category": "公募要領への不適合・計算ミス",
        "lesson": "付加価値額の向上計算において、対象外の費用を算入する等の初歩的なミス。また、要領で禁止されている「既存設備の単純な買い替え」とみなされ、新規性が否定された。",
        "factors": ["要件理解の致命的ミス", "計算ロジックの脆弱性", "単純更新とみなされる投資"]
    },
    {
        "category": "政策的意義への理解不足",
        "lesson": "自社の利益向上のみが強調され、地域貢献やサプライチェーン全体への好影響、あるいはGX/DXといった政策的付加価値への記述が極めて薄いため、補助の妥当性が低い。",
        "factors": ["政策的意義の欠如", "社会的インパクトの過小評価", "外部経済への貢献不在"]
    }
]

def generate_cases():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    print("[START] 仮想事例データ生成処理（正規化・詳細版）を開始します...")
    
    # 不正確なデータのクリーンアップ
    print("  --> 旧データのクリーンアップ中...")
    db.query(ApplicationCase).filter(ApplicationCase.subsidy_id == "AUTO_GEN_SUB_ID").delete(synchronize_session=False)
    db.query(ApplicationCase).filter(ApplicationCase.is_anonymized == True).delete(synchronize_session=False) # 過去のダミーも一旦消去
    db.commit()
    
    # 実在する補助金マスターの取得
    # カテゴリと subsidy_code のマッピング（マスターと完全同期）
    CODE_MAP = {
        "MONO": "monodukuri_2026_18th",
        "IT": "it_introduction_2026",
        "JIZOKU": "shokibo_jizokuka_2026",
        "SHORYOKU": "shoryokuka_toushi_2026",
        "SHINJIGYOU": "shinjigyou_shinshutsu_2026",
        "DAIKIBO": "daikibo_seicho_2026", # NEW
        "SAIKOUCHIKU": "saikouchiku_2026"  # NEW
    }
    
    subsidy_master = {}
    for prefix, full_code in CODE_MAP.items():
        sub = db.query(Subsidy).filter(Subsidy.subsidy_code == full_code).first()
        if sub:
            subsidy_master[prefix] = sub.id
            print(f"  [OK] 補助金マスタ紐付け完了: {prefix} -> {sub.title} ({sub.id})")
        else:
            print(f"  [WARNING] 補助金マスターが見つかりません: {full_code}")

    if not subsidy_master:
        print("  [ERROR] 有効な補助金マスタが一つも見つかりません。シードデータを先に投入してください。")
        return

    # ダミー用の会社ID
    default_company = db.query(Company).first()
    if not default_company:
        default_company = Company(
            id="dummy-" + str(uuid.uuid4())[:8],
            corporate_number="0000000000000",
            legal_name="株式会社事例データ・ラボ",
            head_office_address="東京都千代nt",
            head_office_prefecture="13",
            establishment_date=date(2010, 5, 15),
            capital_stock=30000000,
            industry_code="0001"
        )
        db.add(default_company)
        db.commit()
    
    company_id = default_company.id

    insert_count = 0
    cases_to_insert = []
    
    # ユーザー要望: カテゴリー別でソート（生成順を整理）
    for category in CATEGORIES:
        prefix = category['code_prefix']
        if prefix not in subsidy_master:
            continue
            
        target_subsidy_id = subsidy_master[prefix]
        print(f"  --> {category['name']} (ID: {target_subsidy_id}) の生成中...")
        
        for i in range(TOTAL_CASES_PER_CATEGORY):
            year = random.choice(YEARS)
            start_date = date(year, 4, 1)
            end_date = date(year+1, 3, 31)
            delta = end_date - start_date
            random_days = random.randrange(delta.days)
            app_date = start_date + timedelta(days=random_days)
            
            is_rejected = random.random() < REJECTION_RATE
            
            if is_rejected:
                result = "REJECTED"
                score = random.randint(35, 62)
                reason_tmpl = random.choice(REJECT_REASONS)
                lesson = reason_tmpl["lesson"]
                rej_category = [reason_tmpl["category"]]
                factors = reason_tmpl["factors"]
            else:
                result = "ADOPTED"
                score = random.randint(72, 98)
                lesson = random.choice(category["lessons"])
                rej_category = []
                factors = random.choice(category["success_factors"])

            plan_summary = f"【{category['name']}】" + random.choice(category["plan_components"])
            plan_summary += f" [事業規模: {random.randint(500, 5000)}万円, ROI: {round(random.uniform(1.2, 5.5), 1)}年]"
            
            code = f"{prefix}-{year}-{str(100+i)}"
            
            new_case = ApplicationCase(
                id=str(uuid.uuid4()),
                company_id=company_id,
                subsidy_id=target_subsidy_id, # 実在する補助金IDに紐付け
                application_date=app_date,
                result=result,
                score_at_submission=score,
                lessons_learned=lesson,
                rejection_category=rej_category,
                ai_quality_score={
                    "plan_summary": plan_summary,
                    "key_factors": factors,
                    "subsidy_code": code,
                    "generated_at": datetime.utcnow().isoformat()
                },
                is_anonymized=True,
                is_real_data=False
            )
            cases_to_insert.append(new_case)
            insert_count += 1
            
            if len(cases_to_insert) >= 200:
                db.add_all(cases_to_insert)
                db.commit()
                cases_to_insert = []
                    
    if cases_to_insert:
        db.add_all(cases_to_insert)
        db.commit()
        
    print(f"\n[FINISH] 計 {insert_count}件 の高品質事例データを実在補助金に紐付けて再投入しました。")
    db.close()

if __name__ == "__main__":
    generate_cases()

if __name__ == "__main__":
    generate_cases()
