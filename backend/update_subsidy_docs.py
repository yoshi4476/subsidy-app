import json
from database import SessionLocal
from models import Subsidy

def update_docs():
    db = SessionLocal()
    try:
        # 1. ものづくり補助金
        monozukuri = db.query(Subsidy).filter(Subsidy.title.like("%ものづくり%")).first()
        if monozukuri:
            monozukuri.required_documents = [
                {"name": "事業計画書", "format": "pdf", "description": "補助事業の具体的達成目標、ROI予測、社会貢献性を記述したもの。指定の10ページ以内。"},
                {"name": "決算書（直近2期分）", "format": "pdf", "description": "貸借対照表、損益計算書、個別注記表"},
                {"name": "従業員数確認書類", "format": "pdf", "description": "労働保険概算・確定保険料申告書の写しなど"},
                {"name": "賃上げ表明書", "format": "pdf", "description": "従業員に対する賃上げ計画の表明および合意書類。加点対象。"},
                {"name": "IT導入による効果の具体的根拠", "format": "pdf", "description": "導入する設備やシステムがどのように生産性向上に寄与するかを数値で示した書類。"}
            ]
            monozukuri.submission_guide = {
                "general_advice": "ものづくり補助金は「革新性」と「ROI」が最重視されます。AIドラフトでは数値的な裏付け（付加価値額の向上）を強調しています。",
                "checkpoints": ["事業実施場所が確保されているか", "賃上げ要件を満たしているか"]
            }

        # 2. IT導入補助金
        it_donyu = db.query(Subsidy).filter(Subsidy.title.like("%IT%")).first()
        if it_donyu:
            it_donyu.required_documents = [
                {"name": "履歴事項全部証明書", "format": "pdf", "description": "発行から3ヶ月以内のもの"},
                {"name": "納税証明書（その1またはその2）", "format": "pdf", "description": "法人税の納税証明書"},
                {"name": "IT導入計画書", "format": "pdf", "description": "導入するITツールの詳細と、それによる生産性向上プロセスを記述。"},
                {"name": "セキュリティアクション宣言", "format": "pdf", "description": "IPAが実施するセキュリティ対策自己宣言。"}
            ]
            it_donyu.submission_guide = {
                "general_advice": "IT導入補助金は、ツールの選定理由と業務プロセスへの適合性が重要です。gBizIDプライムアカウントが必須となります。",
                "checkpoints": ["導入するツールが登録済みか", "インボイス対応枠かどうか"]
            }

        db.commit()
        print("Updated subsidy document requirements and guides.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_docs()
