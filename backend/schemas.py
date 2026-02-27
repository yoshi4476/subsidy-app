# Pydantic入出力スキーマ定義
# FastAPI のリクエスト/レスポンス型バリデーション

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


# ============================================================
# ユーザー (User)
# ============================================================
class UserCreate(BaseModel):
    id: Optional[str] = None
    email: str
    name: Optional[str] = None
    model_config = {"from_attributes": True}

class UserResponse(UserCreate):
    id: str
    role: str
    is_approved: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class LoginRequest(BaseModel):
    email: str
    password: str

class PasswordSetRequest(BaseModel):
    email: str
    password: str


# ============================================================
# 招待 (Invitation)
# ============================================================
class InvitationCreate(BaseModel):
    email: str

class InvitationResponse(InvitationCreate):
    id: str
    invited_by: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ============================================================
# 企業 (Company)
# ============================================================
class ExecutiveSchema(BaseModel):
    name: str
    title: str
    birthdate: Optional[str] = None

class ShareholderSchema(BaseModel):
    name: str
    type: str = "corporation"  # corporation / individual
    ratio: float

class CompanyCreate(BaseModel):
    corporate_number: str = Field(..., min_length=13, max_length=13, description="法人番号13桁")
    legal_name: str = Field(..., description="正式商号")
    trade_name: Optional[str] = None
    head_office_address: str
    head_office_prefecture: str = Field(..., max_length=4, description="都道府県コード")
    establishment_date: date
    capital_stock: float = Field(..., gt=0, description="資本金（円）")
    industry_code: str = Field(..., max_length=4, description="産業分類コード")
    user_id: Optional[str] = None
    executives: Optional[list[ExecutiveSchema]] = []
    shareholders: Optional[list[ShareholderSchema]] = []

class CompanyResponse(CompanyCreate):
    id: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ============================================================
# 財務データ (FinancialStatement)
# ============================================================
class FinancialStatementCreate(BaseModel):
    fiscal_year: int
    fiscal_period_start: date
    fiscal_period_end: date
    sales: float
    operating_profit: float
    ordinary_profit: float
    depreciation: float
    labor_cost: float
    sga_expenses: Optional[float] = None
    total_assets: Optional[float] = None
    net_assets: Optional[float] = None
    cash_on_hand: Optional[float] = None
    accounts_receivable: Optional[float] = None
    inventory: Optional[float] = None
    accounts_payable: Optional[float] = None
    short_term_borrowings: Optional[float] = None
    long_term_borrowings: Optional[float] = None
    rd_expenses: Optional[float] = None

class FinancialStatementResponse(FinancialStatementCreate):
    id: str
    company_id: str
    value_added: float
    labor_productivity: Optional[float] = None
    model_config = {"from_attributes": True}


# ============================================================
# 人事・労務データ (HRData)
# ============================================================
class HRDataCreate(BaseModel):
    snapshot_date: date
    employee_count_regular: int = Field(..., ge=0)
    employee_count_part: int = Field(..., ge=0)
    min_wage_employees_count: int = Field(0, ge=0)
    lowest_wage: float = Field(..., gt=0, description="事業場内最低賃金（時給）")
    employment_insurance: bool = True
    social_insurance: bool = True
    wage_raise_declared: bool = False
    wage_raise_plan_rate: Optional[float] = None
    wage_raise_plan_amount: Optional[float] = None
    average_annual_salary: Optional[float] = None
    training_expenses: Optional[float] = None
    overtime_hours_avg: Optional[float] = None
    female_manager_ratio: Optional[float] = None
    average_age: Optional[float] = None
    paid_leave_ratio: Optional[float] = None
    training_system: Optional[str] = None

class HRDataResponse(HRDataCreate):
    id: str
    company_id: str
    employee_count_total: int
    model_config = {"from_attributes": True}


# ============================================================
# 事業プロフィール (BusinessProfile)
# ============================================================
class EquipmentSchema(BaseModel):
    name: str
    introduced_year: Optional[int] = None
    status: str = "稼働中"
    condition: Optional[str] = None
    replacement_plan: Optional[str] = None

class BusinessProfileCreate(BaseModel):
    business_summary: str = Field(..., max_length=400, description="事業内容(400字)")
    strengths: Optional[list[str]] = []
    weaknesses: Optional[list[str]] = []
    opportunities: Optional[list[str]] = []
    threats: Optional[list[str]] = []
    equipment_list: Optional[list[EquipmentSchema]] = []
    licenses: Optional[list[str]] = []
    certifications: Optional[list[str]] = []
    major_customers: Optional[list[str]] = []
    patents_trademarks: Optional[list[str]] = []
    dx_initiatives: Optional[str] = None
    gx_initiatives: Optional[str] = None
    market_competitiveness: Optional[str] = None
    future_rd_plan: Optional[str] = None
    social_contribution: Optional[str] = None

class BusinessProfileResponse(BusinessProfileCreate):
    id: str
    company_id: str
    model_config = {"from_attributes": True}


# ============================================================
# 補助金 (Subsidy)
# ============================================================
class SubsidyCondition(BaseModel):
    field: str
    operator: str
    value: float | str | list
    unit: Optional[str] = None
    description: Optional[str] = None
    source_page: Optional[int] = None
    verification_needed: bool = False

class SubsidyRequirements(BaseModel):
    logic: str = "AND"
    conditions: list[SubsidyCondition] = []

class BonusPoint(BaseModel):
    field: str
    operator: str
    value: str | float | list
    points: int
    description: Optional[str] = None
    difficulty: str = "MEDIUM"
    source_page: Optional[int] = None

class SubsidyCreate(BaseModel):
    subsidy_code: str
    title: str
    administering_body: str
    source_url: Optional[str] = None
    description: Optional[str] = None
    simple_summary: Optional[str] = None
    application_template: list[dict] = []
    exclusive_rule: Optional[str] = None
    related_company_warning: Optional[str] = None
    requirements: dict = {}
    bonus_points: list[dict] = []
    subsidy_rate_numerator: Optional[int] = None
    subsidy_rate_denominator: Optional[int] = None
    max_amount: Optional[float] = None
    eligible_costs: list[str] = []
    announcement_date: Optional[date] = None
    application_start: Optional[date] = None
    application_end: Optional[datetime] = None
    result_announcement: Optional[date] = None
    project_end: Optional[date] = None
    target_region: str = "ALL"
    target_industries: str = "ALL"
    max_capital: Optional[float] = None
    max_employees: Optional[int] = None
    required_documents: list[dict] = []

class SubsidyResponse(SubsidyCreate):
    id: str
    status: str
    parser_confidence: Optional[float] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ============================================================
# マッチング結果
# ============================================================
class RecommendationItem(BaseModel):
    action: str
    points_gain: int
    difficulty: str
    new_rank_if_fulfilled: str

class MatchingResult(BaseModel):
    subsidy: SubsidyResponse
    eligible: bool
    score: int
    max_score: int
    rank: str  # S/A/B/C
    fulfilled_items: list[str] = []
    recommendations: list[RecommendationItem] = []
    translated_requirements: list[dict] = []
    company_data: Optional[dict] = None  # NEW: 判定に使用した会社データ（売上等）
    matched_max_amount: Optional[float] = None
    matched_rate: Optional[str] = None
    applied_rate_description: Optional[str] = None
    
    # 最大化シミュレーション項目
    max_potential_amount: Optional[float] = None # NEW: すべての加点項目を達成した場合の上限
    max_potential_rate: Optional[str] = None # NEW: 理論上の最大補助率
    gap_analysis: list[dict] = [] # NEW: 最大化するために不足している条件リスト


# ============================================================
# 申請事例 (ApplicationCase)
# ============================================================
class ApplicationCaseCreate(BaseModel):
    company_id: str
    subsidy_id: str
    application_date: Optional[date] = None
    result: str = "PENDING"
    rejection_reason: Optional[str] = None
    rejection_category: list[str] = []
    score_at_submission: Optional[int] = None
    lessons_learned: Optional[str] = None

class ApplicationCaseResponse(ApplicationCaseCreate):
    id: str
    ai_quality_score: Optional[dict] = None
    is_anonymized: bool
    status_updated_at: datetime
    created_at: datetime
    updated_at: datetime
    reporting_progress: list["ReportingProgressResponse"] = []
    model_config = {"from_attributes": True}


# ============================================================
# お気に入り (UserFavoriteSubsidy)
# ============================================================
class UserFavoriteSubsidyCreate(BaseModel):
    subsidy_id: str

class UserFavoriteSubsidyResponse(BaseModel):
    id: str
    user_id: str
    subsidy_id: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ============================================================
# 事後サポート・報告進捗 (ReportingProgress)
# ============================================================
class ReportingProgressCreate(BaseModel):
    application_case_id: str
    task_name: str
    status: str = "NOT_STARTED"
    deadline: Optional[date] = None
    notes: Optional[str] = None
    required_documents: list[dict] = []

class ReportingProgressResponse(ReportingProgressCreate):
    id: str
    completed_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ============================================================
# 監査ログ (AuditLog)
# ============================================================
class AuditLogCreate(BaseModel):
    actor_type: str
    actor_id: str
    action: str
    target_entity: str
    content_hash: Optional[str] = None
    source_references: Optional[list[dict]] = None
    details: Optional[dict] = None

class AuditLogResponse(AuditLogCreate):
    id: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ============================================================
# 用語辞書 (TermDictionary)
# ============================================================
class TermDictionaryCreate(BaseModel):
    term: str
    legal_definition: str
    simplified_text: str
    illustration_path: Optional[str] = None
    example: Optional[str] = None
    related_terms: list[str] = []

class TermDictionaryResponse(TermDictionaryCreate):
    model_config = {"from_attributes": True}


# ============================================================
# Personalized Translator
# ============================================================
class TranslatedRequirement(BaseModel):
    original_text: str = Field(..., description="原文")
    translated_text: str = Field(..., description="翻訳後の文言")
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    gap: Optional[float] = None
    source_page: Optional[int] = None


# ============================================================
# 統合カルテ (Corporate DNA)
# ============================================================
class CorporateDNAUpsert(BaseModel):
    company: CompanyCreate
    financials: list[FinancialStatementCreate] = []
    hr: Optional[HRDataCreate] = None
    profile: Optional[BusinessProfileCreate] = None

class CorporateDNAResponse(BaseModel):
    company: CompanyResponse
    financials: list[FinancialStatementResponse] = []
    hr: Optional[HRDataResponse] = None
    profile: Optional[BusinessProfileResponse] = None
    model_config = {"from_attributes": True}
