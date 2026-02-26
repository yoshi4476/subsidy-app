# Database initialization script
from database import engine, Base
import models

def main():
    print("[INFO] Initializing database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Database tables created successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to create tables: {e}")

if __name__ == "__main__":
    main()
