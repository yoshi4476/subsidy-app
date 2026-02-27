# 全テーブルのSQLAlchemy ORMモデル定義
# 設計書v2.0 Section 1: Universal Corporate DNA 準拠

import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, Date,
    DateTime, ForeignKey, Enum, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


# ============================================================
# Section 1.0: ユーザー (Users)
# ============================================================
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False, comment="メールアドレス")
    name = Column(String, nullable=True, comment="ユーザー名")
    picture = Column(String, nullable=True, comment="プロフィール画像URL")
    role = Column(String, default="client", comment="ロール: client, admin")
    hashed_password = Column(String, nullable=True, comment="ハッシュ化済みパスワード")
    plan_type = Column(String, default="paid", comment="プラン: trial, paid, admin")
    subscription_status = Column(String, default="active", comment="状態: active, expired")
    is_approved = Column(Boolean, default=False, comment="承認済みフラグ")
    created_at = Column(DateTime, default=datetime.utcnow)

    companies = relationship("Company", back_populates="user", cascade="all, delete-orphan")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False, comment="招待メールアドレス")
    invited_by = Column(String, ForeignKey("users.id"), nullable=False, comment="招待者（管理者）ID")
    status = Column(String, default="pending", comment="ステータス: pending, accepted")
    created_at = Column(DateTime, default=datetime.utcnow)

    inviter = relationship("User", foreign_keys=[invited_by])


# ============================================================
# Section 1.1: 基本属性 (companies)
# ============================================================
class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, comment="オーナーユーザーID")
    corporate_number = Column(String(13), unique=True, nullable=False, index=True, comment="法人番号")
    legal_name = Column(String, nullable=False, comment="正式商号")
    trade_name = Column(String, nullable=True, comment="屋号・通称")
    head_office_address = Column(String, nullable=False, comment="本店所在地")
    head_office_prefecture = Column(String(4), nullable=False, comment="都道府県コード")
    establishment_date = Column(Date, nullable=False, comment="設立年月日")
    capital_stock = Column(Float, nullable=False, comment="資本金（円）")
    industry_code = Column(String(4), nullable=False, comment="日本標準産業分類コード")
    executives = Column(JSON, nullable=False, default=list, comment="役員リスト")
    shareholders = Column(JSON, nullable=False, default=list, comment="株主構成")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # リレーション
    user = relationship("User", back_populates="companies")
    financial_statements = relationship("FinancialStatement", back_populates="company", cascade="all, delete-orphan")
    hr_data = relationship("HRData", back_populates="company", cascade="all, delete-orphan")
    business_profile = relationship("BusinessProfile", back_populates="company", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="company", cascade="all, delete-orphan")
    application_cases = relationship("ApplicationCase", back_populates="company", cascade="all, delete-orphan")


# ============================================================
# Section 1.2: 詳細財務データ（過去3期分）
# ============================================================
class FinancialStatement(Base):
    __tablename__ = "financial_statements"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    fiscal_year = Column(Integer, nullable=False, comment="会計年度")
    fiscal_period_start = Column(Date, nullable=False, comment="期の開始日")
    fiscal_period_end = Column(Date, nullable=False, comment="期の終了日")
    sales = Column(Float, nullable=False, comment="売上高")
    operating_profit = Column(Float, nullable=False, comment="営業利益")
    ordinary_profit = Column(Float, nullable=False, comment="経常利益")
    depreciation = Column(Float, nullable=False, comment="減価償却費")
    labor_cost = Column(Float, nullable=False, comment="人件費")

    # 詳細な財務状況（追加）
    sga_expenses = Column(Float, nullable=True, comment="販売管理費")
    total_assets = Column(Float, nullable=True, comment="総資産")
    net_assets = Column(Float, nullable=True, comment="純資産")
    cash_on_hand = Column(Float, nullable=True, comment="現預金")
    accounts_receivable = Column(Float, nullable=True, comment="売掛金")
    inventory = Column(Float, nullable=True, comment="棚卸資産")
    accounts_payable = Column(Float, nullable=True, comment="買掛金")
    short_term_borrowings = Column(Float, nullable=True, comment="短期借入金")
    long_term_borrowings = Column(Float, nullable=True, comment="長期借入金")
    rd_expenses = Column(Float, nullable=True, comment="研究開発費")

    # 自動計算フィールド
    value_added = Column(Float, nullable=False, comment="付加価値額 = 営業利益+人件費+減価償却費")
    labor_productivity = Column(Float, nullable=True, comment="労働生産性 = 付加価値額/従業員数")

    company = relationship("Company", back_populates="financial_statements")


# ============================================================
# Section 1.3: 人事・労務データ
# ============================================================
class HRData(Base):
    __tablename__ = "hr_data"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False, comment="データ取得日")
    employee_count_regular = Column(Integer, nullable=False, comment="正社員数")
    employee_count_part = Column(Integer, nullable=False, comment="パート・アルバイト数")
    employee_count_total = Column(Integer, nullable=False, comment="全従業員数")
    min_wage_employees_count = Column(Integer, nullable=False, default=0, comment="最低賃金近傍の従業員数")
    lowest_wage = Column(Float, nullable=False, comment="事業場内最低賃金（時給）")
    employment_insurance = Column(Boolean, nullable=False, default=True, comment="雇用保険加入済")
    social_insurance = Column(Boolean, nullable=False, default=True, comment="社会保険加入済")
    wage_raise_declared = Column(Boolean, nullable=False, default=False, comment="賃上げ表明の有無")
    wage_raise_plan_rate = Column(Float, nullable=True, comment="賃上げ計画率（%）")
    wage_raise_plan_amount = Column(Float, nullable=True, comment="賃上げ計画額（円）")
    average_annual_salary = Column(Float, nullable=True, comment="平均年収")
    training_expenses = Column(Float, nullable=True, comment="研修教育費")
    overtime_hours_avg = Column(Float, nullable=True, comment="平均残業時間")
    female_manager_ratio = Column(Float, nullable=True, comment="女性管理職比率")
    average_age = Column(Float, nullable=True, comment="従業員平均年齢")
    paid_leave_ratio = Column(Float, nullable=True, comment="有給休暇消化率（%）")
    training_system = Column(Text, nullable=True, comment="研修・教育体制の詳細")

    company = relationship("Company", back_populates="hr_data")


# ============================================================
# Section 1.4: 事業実態・定性データ
# ============================================================
class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False, unique=True)
    business_summary = Column(Text, nullable=False, comment="事業内容(400字)")
    strengths = Column(JSON, nullable=True, default=list, comment="強み(SWOT-S)")
    weaknesses = Column(JSON, nullable=True, default=list, comment="弱み(SWOT-W)")
    opportunities = Column(JSON, nullable=True, default=list, comment="機会(SWOT-O)")
    threats = Column(JSON, nullable=True, default=list, comment="脅威(SWOT-T)")
    equipment_list = Column(JSON, nullable=True, default=list, comment="保有設備リスト")
    licenses = Column(JSON, nullable=True, default=list, comment="保有許認可")
    certifications = Column(JSON, nullable=True, default=list, comment="保有認定")
    major_customers = Column(JSON, nullable=True, default=list, comment="主要取引先")
    patents_trademarks = Column(JSON, nullable=True, default=list, comment="特許・商標等")
    
    # アドバンテージ項目 (採択率向上のための定性データ)
    dx_initiatives = Column(Text, nullable=True, comment="DX(デジタル化)への具体的な取組")
    gx_initiatives = Column(Text, nullable=True, comment="GX(脱炭素・グリーン化)への具体的な取組")
    market_competitiveness = Column(Text, nullable=True, comment="市場における優位性と差別化要因")
    future_rd_plan = Column(Text, nullable=True, comment="今後の研究開発・新商品開発計画")
    social_contribution = Column(Text, nullable=True, comment="地域貢献や社会課題解決への取組")

    company = relationship("Company", back_populates="business_profile")


# ============================================================
# Section 1.5: ファイル管理
# ============================================================
class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    doc_type = Column(String, nullable=False, comment="FINANCIAL_REPORT/REGISTRY_COPY/TAX_CERTIFICATE/OFFICIAL_SEAL/OTHER")
    file_name = Column(String, nullable=False, comment="元ファイル名")
    file_path = Column(String, nullable=False, comment="保存先パス")
    mime_type = Column(String, nullable=False, comment="MIMEタイプ")
    upload_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(Date, nullable=True, comment="有効期限")
    fiscal_year = Column(Integer, nullable=True, comment="対象年度")
    ocr_extracted = Column(Boolean, default=False, comment="OCR抽出済みフラグ")
    category = Column(String, default="COMMON", comment="COMMON / SUBSIDY_SPECIFIC")

    company = relationship("Company", back_populates="documents")


# ============================================================
# Section 2: 補助金データ
# ============================================================
class Subsidy(Base):
    __tablename__ = "subsidies"

    id = Column(String, primary_key=True, default=generate_uuid)
    subsidy_code = Column(String, unique=True, nullable=False, index=True, comment="補助金識別コード")
    title = Column(String, nullable=False, comment="補助金名称")
    administering_body = Column(String, nullable=False, comment="実施機関")
    source_url = Column(String, nullable=True, comment="公募要領URL")
    description = Column(Text, nullable=True, comment="概要説明")
    simple_summary = Column(Text, nullable=True, comment="わかりやすい概要説明")
    application_template = Column(JSON, nullable=True, default=list, comment="申請フォーマットテンプレート")
    exclusive_rule = Column(Text, nullable=True, comment="重複申請ルール")
    related_company_warning = Column(Text, nullable=True, comment="関連会社への注意事項")

    # 受給要件（動的ルール）
    requirements = Column(JSON, nullable=False, default=dict, comment="受給要件(JSON論理式)")
    bonus_points = Column(JSON, nullable=False, default=list, comment="加点項目リスト")

    # 補助内容
    subsidy_rate_numerator = Column(Integer, nullable=True, comment="補助率 分子")
    subsidy_rate_denominator = Column(Integer, nullable=True, comment="補助率 分母")
    max_amount = Column(Float, nullable=True, comment="補助上限額")
    eligible_costs = Column(JSON, nullable=True, default=list, comment="対象経費科目")

    # 期限
    announcement_date = Column(Date, nullable=True, comment="公表日")
    application_start = Column(Date, nullable=True, comment="公募開始日")
    application_end = Column(DateTime, nullable=True, comment="締切日時")
    result_announcement = Column(Date, nullable=True, comment="結果発表日")
    project_end = Column(Date, nullable=True, comment="事業完了期限")

    # 対象条件
    target_region = Column(String, default="ALL", comment="対象地域")
    target_industries = Column(String, default="ALL", comment="対象業種")
    max_capital = Column(Float, nullable=True, comment="資本金上限")
    max_employees = Column(Integer, nullable=True, comment="従業員上限")

    # 必要書類
    required_documents = Column(JSON, nullable=True, default=list, comment="必要書類リスト")

    # ステータス管理
    status = Column(String, default="PENDING_REVIEW", comment="PENDING_REVIEW/PUBLISHED/CLOSED/ARCHIVED")
    parser_confidence = Column(Float, nullable=True, comment="AI解析信頼度")
    approved_by = Column(String, nullable=True, comment="承認者")
    approved_at = Column(DateTime, nullable=True, comment="承認日時")
    parsed_at = Column(DateTime, nullable=True, comment="解析日時")
    created_at = Column(DateTime, default=datetime.utcnow)

    # リレーション
    application_cases = relationship("ApplicationCase", back_populates="subsidy")


# ============================================================
# Section 5 & 6.2: 申請事例（採択/不採択学習用）
# ============================================================
class ApplicationCase(Base):
    __tablename__ = "application_cases"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    subsidy_id = Column(String, ForeignKey("subsidies.id"), nullable=False)
    application_date = Column(Date, nullable=True, comment="申請日")
    result = Column(String, default="PENDING", comment="ADOPTED/REJECTED/PENDING")
    rejection_reason = Column(Text, nullable=True, comment="不採択理由")
    rejection_category = Column(JSON, nullable=True, default=list, comment="不採択分類タグ")
    business_plan_path = Column(String, nullable=True, comment="事業計画書パス")
    score_at_submission = Column(Integer, nullable=True, comment="提出時スコア")
    ai_quality_score = Column(JSON, nullable=True, comment="AI品質評価")
    lessons_learned = Column(Text, nullable=True, comment="学び・改善点メモ")
    is_anonymized = Column(Boolean, default=False, comment="匿名化済みフラグ")
    is_real_data = Column(Boolean, default=False, comment="実際の採択データかどうか")
    status_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="ステータス最終更新日時")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="application_cases")
    subsidy = relationship("Subsidy", back_populates="application_cases")
    reporting_progress = relationship("ReportingProgress", back_populates="application_case", cascade="all, delete-orphan")


# ============================================================
# Section 0.1: 監査ログ
# ============================================================
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    actor_type = Column(String, nullable=False, comment="AI/HUMAN/SYSTEM")
    actor_id = Column(String, nullable=False, comment="ユーザーIDまたはAIモデル名")
    action = Column(String, nullable=False, comment="GENERATE/APPROVE/REJECT/EDIT/ACCESS")
    target_entity = Column(String, nullable=False, comment="操作対象")
    content_hash = Column(String, nullable=True, comment="SHA-256ハッシュ")
    source_references = Column(JSON, nullable=True, comment="参照元情報")
    details = Column(JSON, nullable=True, comment="詳細情報")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# ============================================================
# Section 3.2: 用語辞書
# ============================================================
class TermDictionary(Base):
    __tablename__ = "term_dictionary"

    term = Column(String, primary_key=True, comment="専門用語")
    legal_definition = Column(Text, nullable=False, comment="法的定義")
    simplified_text = Column(Text, nullable=False, comment="平易な説明")
    illustration_path = Column(String, nullable=True, comment="図解SVGパス")
    example = Column(Text, nullable=True, comment="具体例")
    related_terms = Column(JSON, nullable=True, default=list, comment="関連用語")


# ============================================================
# Section 7: ユーザーアクティビティ・事後サポート管理
# ============================================================
class UserFavoriteSubsidy(Base):
    """ユーザーのお気に入り補助金"""
    __tablename__ = "user_favorite_subsidies"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    subsidy_id = Column(String, ForeignKey("subsidies.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('user_id', 'subsidy_id', name='_user_subsidy_uc'),)


class ReportingProgress(Base):
    """採択後の報告手続き進捗"""
    __tablename__ = "reporting_progress"

    id = Column(String, primary_key=True, default=generate_uuid)
    application_case_id = Column(String, ForeignKey("application_cases.id"), nullable=False)
    task_name = Column(String, nullable=False, comment="タスク名（例: 実績報告, 交付申請）")
    status = Column(String, default="NOT_STARTED", comment="NOT_STARTED/IN_PROGRESS/COMPLETED/OVERDUE")
    deadline = Column(Date, nullable=True, comment="提出期限")
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    required_documents = Column(JSON, nullable=True, default=list, comment="必要書類チェックリスト")

    application_case = relationship("ApplicationCase", back_populates="reporting_progress")


# ============================================================
# Section 6.0: 資金繰りシミュレーション
# ============================================================
class CashFlowSimulation(Base):
    """補助金受給までの資金繰りシミュレーション"""
    __tablename__ = "cash_flow_simulations"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False, index=True)
    subsidy_id = Column(String, ForeignKey("subsidies.id"), nullable=False)
    total_project_cost = Column(Integer, nullable=False, comment="事業費総額")
    subsidy_amount = Column(Integer, nullable=False, comment="補助金受給予定額")
    initial_outlay = Column(Integer, nullable=False, comment="自己資金（初期出し）")
    loan_amount = Column(Integer, default=0, comment="融資利用額")
    monthly_projections = Column(JSON, nullable=True, comment="月次キャッシュフロー予測（JSON）")
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company")
    subsidy = relationship("Subsidy")
