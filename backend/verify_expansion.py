from database import SessionLocal
from models import UserFavoriteSubsidy, ReportingProgress, ApplicationCase, Subsidy, User
from schemas import UserFavoriteSubsidyCreate, ReportingProgressCreate
import uuid

db = SessionLocal()
try:
    # 1. テストデータの準備 (User, Subsidy, Case)
    test_user = db.query(User).first()
    if not test_user:
        test_user = User(id="test_user", email="test@example.com", name="Test User")
        db.add(test_user)
        db.commit()

    test_subsidy = db.query(Subsidy).first()
    if not test_subsidy:
        print("No subsidy found in DB. Please run seed data.")
        exit(1)

    test_case = db.query(ApplicationCase).filter(ApplicationCase.company_id != None).first()
    if not test_case:
        print("No cases found in DB. Please run seed cases.")
        exit(1)

    # 2. お気に入り登録テスト
    new_fav = UserFavoriteSubsidy(user_id=test_user.id, subsidy_id=test_subsidy.id)
    db.add(new_fav)
    db.commit()
    print(f"Added favorite: {new_fav.id}")

    # 3. 報告タスクテスト
    new_progress = ReportingProgress(
        application_case_id=test_case.id,
        task_name="テスト実績報告",
        status="IN_PROGRESS"
    )
    db.add(new_progress)
    db.commit()
    print(f"Added reporting task: {new_progress.id}")

    # 4. クエリテスト
    case_with_progress = db.query(ApplicationCase).filter(ApplicationCase.id == test_case.id).first()
    print(f"Case {case_with_progress.id} has {len(case_with_progress.reporting_progress)} reporting tasks.")

    # クリーンアップ
    db.delete(new_fav)
    db.delete(new_progress)
    db.commit()
    print("Cleanup successful.")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
