from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CashFlowSimulation, Company, Subsidy

router = APIRouter(prefix="/api/simulation", tags=["資金繰りシミュレーション"])

@router.get("/cashflow/{company_id}")
def get_cashflow_simulation(company_id: str, subsidy_id: str, db: Session = Depends(get_db)):
    """資金繰りシミュレーション結果を取得・生成する"""
    # 補助金情報を取得
    subsidy = db.query(Subsidy).filter(Subsidy.id == subsidy_id).first()
    if not subsidy:
        # フォールバック: subsidy-001 を試す
        subsidy = db.query(Subsidy).filter(Subsidy.id == "subsidy-001").first()
        if not subsidy:
            raise HTTPException(status_code=404, detail="補助金が見つかりません")

    # 企業の最新財務データを取得
    from models import FinancialStatement
    latest_fin = db.query(FinancialStatement).filter(
        FinancialStatement.company_id == company_id
    ).order_by(FinancialStatement.fiscal_year.desc()).first()
    
    current_cash = latest_fin.cash_on_hand if latest_fin and latest_fin.cash_on_hand else 5000000 # デフォルト500万
    
    # 補助上限と補助率
    max_amt = subsidy.max_amount or 1000000
    rate_num = subsidy.subsidy_rate_numerator or 1
    rate_den = subsidy.subsidy_rate_denominator or 2
    
    # 想定事業費
    project_cost = max_amt * (rate_den / rate_num)
    
    # シミュレーション生成
    mock_projections = [
        {"month": "プロジェクト開始", "out": int(project_cost * 0.8), "in": 0, "balance": int(current_cash - (project_cost * 0.8)), "note": "初期導入・設備購入費用"},
        {"month": "3ヶ月後", "out": int(project_cost * 0.1), "in": 0, "balance": int(current_cash - (project_cost * 0.9)), "note": "運用・調整費用"},
        {"month": "6ヶ月後", "out": int(project_cost * 0.1), "in": 0, "balance": int(current_cash - project_cost), "note": "実績報告完了"},
        {"month": "12ヶ月後", "out": 0, "in": int(max_amt), "balance": int(current_cash - project_cost + max_amt), "note": "補助金交付予定"},
    ]
    
    # 既存のシミュレーションを更新または新規作成
    sim = db.query(CashFlowSimulation).filter(
        CashFlowSimulation.company_id == company_id, 
        CashFlowSimulation.subsidy_id == subsidy.id
    ).first()
    
    if sim:
        sim.total_project_cost = int(project_cost)
        sim.subsidy_amount = int(max_amt)
        sim.initial_outlay = int(project_cost)
        sim.monthly_projections = mock_projections
    else:
        sim = CashFlowSimulation(
            company_id=company_id,
            subsidy_id=subsidy.id,
            total_project_cost=int(project_cost),
            subsidy_amount=int(max_amt),
            initial_outlay=int(project_cost),
            monthly_projections=mock_projections
        )
        db.add(sim)
    
    db.commit()
    db.refresh(sim)
    
    return sim
