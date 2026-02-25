# 補助金情報自動サーチ・更新サービス
# 設計書 Section 2.1 Crawler Strategy 準拠
# 開発環境: JSONマスターデータ読込 / 本番: Webクローラー

import json
import os
from datetime import datetime, date
from sqlalchemy.orm import Session
from models import Subsidy, AuditLog

from services.jgrants_api_client import JGrantsClient
import asyncio

# マスターデータファイルパス
MASTER_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "subsidy_master.json")


def load_master_data() -> list[dict]:
    """マスターデータJSONを読み込む"""
    if not os.path.exists(MASTER_DATA_PATH):
        print(f"[WARN] マスターデータが見つかりません: {MASTER_DATA_PATH}")
        return []
    with open(MASTER_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_date(date_str: str | None) -> date | None:
    """日付文字列をdate型に変換"""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return date.fromisoformat(date_str)
        except ValueError:
            return None


def parse_datetime(dt_str: str | None) -> datetime | None:
    """日時文字列をdatetime型に変換"""
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str)
    except ValueError:
        return None


def map_jgrants_to_subsidy(item: dict) -> dict:
    """J-Grantsのデータを内部のSubsidyモデル形式にマッピング"""
    # 基本情報のマッピング
    # J-Grants V1/V2 でフィールド名が異なる場合があるため、get() で安全に取得
    return {
        "subsidy_code": item.get("id") or item.get("subsidy_id"),
        "title": item.get("title") or item.get("name"),
        "administering_body": item.get("administering_body") or item.get("organization_name"),
        "source_url": item.get("source_url") or item.get("detail_url"),
        "description": item.get("description") or item.get("summary"),
        "simple_summary": item.get("simple_summary"),
        "application_start": item.get("application_start") or item.get("reception_start_date"),
        "application_end": item.get("application_end") or item.get("reception_end_date"),
        "max_amount": item.get("max_amount"),
        "subsidy_rate_numerator": item.get("subsidy_rate_numerator"),
        "subsidy_rate_denominator": item.get("subsidy_rate_denominator"),
        "target_region": item.get("target_region", "ALL"),
        "target_industries": item.get("target_industries", "ALL"),
        # その他のフィールドは必要に応じて追加
    }


def sync_subsidies(db: Session, data_list: list[dict] = None) -> dict:
    """リストデータからDBへ補助金情報を同期する（INSERT or UPDATE）"""
    if data_list is None:
        data_list = load_master_data()
        
    if not data_list:
        return {"synced": 0, "created": 0, "updated": 0, "errors": []}

    created = 0
    updated = 0
    errors = []
    now = datetime.utcnow()
    today = date.today()

    for item in data_list:
        try:
            code = item.get("subsidy_code")
            if not code:
                continue
                
            existing = db.query(Subsidy).filter(Subsidy.subsidy_code == code).first()

            # 公募開始日に基づくステータス自動判定
            app_start = parse_date(item.get("application_start"))
            app_end_val = item.get("application_end")
            app_end = parse_datetime(app_end_val) if isinstance(app_end_val, str) else app_end_val
            
            status = "PENDING_REVIEW"
            if app_start and app_start <= today:
                if app_end and (app_end.date() if isinstance(app_end, datetime) else app_end) >= today:
                    status = "PUBLISHED"  # 公募中
                elif app_end and (app_end.date() if isinstance(app_end, datetime) else app_end) < today:
                    status = "CLOSED"  # 締切済み
                else:
                    status = "PUBLISHED"
            elif app_start and app_start > today:
                status = "PENDING_REVIEW"  # まだ公募前

            if existing:
                # 更新
                existing.title = item.get("title", existing.title)
                existing.administering_body = item.get("administering_body", existing.administering_body)
                existing.source_url = item.get("source_url", existing.source_url)
                existing.description = item.get("description", existing.description)
                existing.simple_summary = item.get("simple_summary", existing.simple_summary)
                existing.application_template = item.get("application_template", existing.application_template)
                existing.exclusive_rule = item.get("exclusive_rule", existing.exclusive_rule)
                existing.related_company_warning = item.get("related_company_warning", existing.related_company_warning)
                existing.requirements = item.get("requirements", existing.requirements)
                existing.bonus_points = item.get("bonus_points", existing.bonus_points)
                existing.subsidy_rate_numerator = item.get("subsidy_rate_numerator", existing.subsidy_rate_numerator)
                existing.subsidy_rate_denominator = item.get("subsidy_rate_denominator", existing.subsidy_rate_denominator)
                existing.max_amount = item.get("max_amount", existing.max_amount)
                existing.eligible_costs = item.get("eligible_costs", existing.eligible_costs)
                existing.announcement_date = parse_date(item.get("announcement_date")) or existing.announcement_date
                existing.application_start = app_start or existing.application_start
                existing.application_end = app_end or existing.application_end
                existing.project_end = parse_date(item.get("project_end")) or existing.project_end
                existing.target_region = item.get("target_region", existing.target_region)
                existing.target_industries = item.get("target_industries", existing.target_industries)
                existing.max_capital = item.get("max_capital", existing.max_capital)
                existing.max_employees = item.get("max_employees", existing.max_employees)
                existing.required_documents = item.get("required_documents", existing.required_documents)
                existing.status = status
                existing.parser_confidence = item.get("parser_confidence", existing.parser_confidence)
                existing.parsed_at = now
                updated += 1
            else:
                # 新規作成
                subsidy = Subsidy(
                    subsidy_code=code,
                    title=item["title"],
                    administering_body=item["administering_body"],
                    source_url=item.get("source_url"),
                    description=item.get("description"),
                    simple_summary=item.get("simple_summary"),
                    application_template=item.get("application_template", []),
                    exclusive_rule=item.get("exclusive_rule"),
                    related_company_warning=item.get("related_company_warning"),
                    requirements=item.get("requirements", {}),
                    bonus_points=item.get("bonus_points", []),
                    subsidy_rate_numerator=item.get("subsidy_rate_numerator"),
                    subsidy_rate_denominator=item.get("subsidy_rate_denominator"),
                    max_amount=item.get("max_amount"),
                    eligible_costs=item.get("eligible_costs", []),
                    announcement_date=parse_date(item.get("announcement_date")),
                    application_start=app_start,
                    application_end=app_end,
                    project_end=parse_date(item.get("project_end")),
                    target_region=item.get("target_region", "ALL"),
                    target_industries=item.get("target_industries", "ALL"),
                    max_capital=item.get("max_capital"),
                    max_employees=item.get("max_employees"),
                    required_documents=item.get("required_documents", []),
                    status=status,
                    parser_confidence=item.get("parser_confidence"),
                    parsed_at=now,
                )
                db.add(subsidy)
                created += 1

                # 監査ログ
                log = AuditLog(
                    actor_type="SYSTEM",
                    actor_id="subsidy_crawler",
                    action="GENERATE",
                    target_entity=f"subsidy:{code}",
                    details={"title": item["title"], "source": item.get("_source", "sync")},
                )
                db.add(log)

        except Exception as e:
            errors.append({"code": item.get("subsidy_code", "?"), "error": str(e)})

    # 同期成功ログを常に残す (新規0件でもHEALTHYステータスを維持するため)
    log = AuditLog(
        actor_type="SYSTEM",
        actor_id="subsidy_crawler",
        action="SYNC_SUCCESS",
        target_entity="subsidy_all",
        details={"created": created, "updated": updated, "synced_total": len(data_list)},
    )
    db.add(log)
    db.commit()

    result = {
        "synced": len(data_list),
        "created": created,
        "updated": updated,
        "errors": errors,
        "synced_at": now.isoformat(),
    }
    print(f"[SYNC] 補助金同期完了: 新規{created}件, 更新{updated}件, エラー{len(errors)}件")
    return result


async def fetch_from_jgrants_and_sync(db: Session, keyword: str = "") -> dict:
    """J-Grants APIから取得して同期する"""
    client = JGrantsClient()
    print(f"[JGRANTS] データ取得開始: keyword={keyword}")
    items = await client.search_subsidies(keyword=keyword, limit=50)
    
    if not items:
        return {"synced": 0, "created": 0, "updated": 0, "errors": [], "message": "J-Grantsからデータが取得できませんでした。"}
        
    mapped_data = []
    for item in items:
        # 詳細情報を取得
        subsidy_id = item.get("id") or item.get("subsidy_id")
        detail = await client.get_subsidy_detail(subsidy_id)
        
        target = detail if detail else item
        mapped = map_jgrants_to_subsidy(target)
        mapped["_source"] = "jgrants_api"
        mapped_data.append(mapped)
        
    return sync_subsidies(db, mapped_data)


def update_subsidy_statuses(db: Session) -> int:
    """全補助金のステータスを日付ベースで自動更新（毎起動時に実行）"""
    today = date.today()
    count = 0

    subsidies = db.query(Subsidy).all()
    for s in subsidies:
        if s.application_end:
            # application_end が datetime か date かを確認
            end_date = s.application_end.date() if isinstance(s.application_end, datetime) else s.application_end
            if end_date < today and s.status not in ("CLOSED", "ARCHIVED"):
                s.status = "CLOSED"
                count += 1
        if s.application_start and s.application_start <= today and s.status == "PENDING_REVIEW":
            s.status = "PUBLISHED"
            count += 1

    if count > 0:
        db.commit()
        print(f"[STATUS] 補助金ステータス自動更新: {count}件")
    return count
