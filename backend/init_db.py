# Railwayの古い設定（init_db.py）が残っていても動くようにするための互換性用ファイルです。
# 実態は ensure_tables.py を実行します。

import sys
import os

# 現在のディレクトリをパスに追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from ensure_tables import main
    print("[COMPAT] init_db.py called. Redirecting to ensure_tables.py...")
    main()
except ImportError:
    print("[ERROR] ensure_tables.py not found.")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Database initialization failed: {e}")
    sys.exit(1)
