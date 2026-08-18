"""
EduAudit AI - Database Migrations & Auth Seeding Script
"""
import sys
import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Setup paths
scripts_dir = Path(__file__).resolve().parent
project_root = scripts_dir.parent
backend_path = project_root / "backend"
sys.path.insert(0, str(backend_path))

# Load environment
load_dotenv(backend_path / ".env")
load_dotenv(project_root / ".env")


async def main():
    # Database URL resolution
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_url = "postgresql+asyncpg://eduaudit:eduaudit_secure_2026@db:5432/eduaudit"
    elif "localhost:5432" in db_url:
        # Fallback for running from host connecting to Docker db
        db_url = db_url.replace("localhost:5432", "localhost:5433")

    print(f"Connecting to database to run migrations/seeds at: {db_url.split('@')[-1]}...")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with engine.begin() as conn:
            # 1. Modify users.role type from user_role enum to VARCHAR(20)
            # This allows flexible roles (citizen, auditor, admin) without enum limitations
            print("Altering user role column type to VARCHAR...")
            await conn.execute(text("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);"))
            # Drop the old enum if it exists
            await conn.execute(text("DROP TYPE IF EXISTS user_role CASCADE;"))

            # 2. Create auditors table
            print("Creating auditors table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS auditors (
                    id          UUID PRIMARY KEY,
                    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    employee_id VARCHAR(50) NOT NULL UNIQUE,
                    department  VARCHAR(100) NOT NULL,
                    district    VARCHAR(100) NOT NULL,
                    designation VARCHAR(100) NOT NULL
                );
            """))
        
        async with async_session() as session:
            # 3. Create Admin user
            admin_email = "admin@eduaudit.ai"
            res = await session.execute(text("SELECT id FROM users WHERE email = :email"), {"email": admin_email})
            admin_id = res.scalar()
            
            if not admin_id:
                print("Seeding Admin user account...")
                import uuid
                admin_uuid = uuid.uuid4()
                admin_pw_hash = bcrypt.hashpw("Admin@123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                await session.execute(
                    text("""
                        INSERT INTO users (id, name, email, phone, password_hash, role, is_verified, is_active, reputation_score)
                        VALUES (:id, :name, :email, :phone, :password_hash, :role, :is_verified, :is_active, :reputation_score)
                    """),
                    {
                        "id": admin_uuid,
                        "name": "System Admin",
                        "email": admin_email,
                        "phone": "+919999999999",
                        "password_hash": admin_pw_hash,
                        "role": "admin",
                        "is_verified": True,
                        "is_active": True,
                        "reputation_score": 100
                    }
                )
                print(f"Created Admin account: {admin_email} (Password: Admin@123)")
            else:
                print(f"Admin account already exists with ID: {admin_id}")

            # 4. Create Auditor user & profile
            auditor_email = "deo.vadodara@gov.in"
            res = await session.execute(text("SELECT id FROM users WHERE email = :email"), {"email": auditor_email})
            auditor_user_id = res.scalar()
            
            if not auditor_user_id:
                print("Seeding Auditor user account...")
                import uuid
                auditor_user_uuid = uuid.uuid4()
                auditor_pw_hash = bcrypt.hashpw("Auditor@123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                await session.execute(
                    text("""
                        INSERT INTO users (id, name, email, phone, password_hash, role, is_verified, is_active, reputation_score)
                        VALUES (:id, :name, :email, :phone, :password_hash, :role, :is_verified, :is_active, :reputation_score)
                    """),
                    {
                        "id": auditor_user_uuid,
                        "name": "DEO Vadodara",
                        "email": auditor_email,
                        "phone": "+918888888888",
                        "password_hash": auditor_pw_hash,
                        "role": "auditor",
                        "is_verified": True,
                        "is_active": True,
                        "reputation_score": 100
                    }
                )
                auditor_user_id = auditor_user_uuid
                print(f"Created Auditor account: {auditor_email} (Password: Auditor@123)")
            else:
                print(f"Auditor account already exists with ID: {auditor_user_id}")

            # Create auditor profile
            res = await session.execute(text("SELECT id FROM auditors WHERE user_id = :user_id"), {"user_id": auditor_user_id})
            auditor_profile_id = res.scalar()
            
            if not auditor_profile_id:
                print("Seeding Auditor profile...")
                import uuid
                await session.execute(
                    text("""
                        INSERT INTO auditors (id, user_id, employee_id, department, district, designation)
                        VALUES (:id, :user_id, :employee_id, :department, :district, :designation)
                    """),
                    {
                        "id": uuid.uuid4(),
                        "user_id": auditor_user_id,
                        "employee_id": "DEO-VAD-001",
                        "department": "Education Department",
                        "district": "Vadodara",
                        "designation": "District Education Officer"
                    }
                )
                print("Created Auditor profile for DEO-VAD-001 (Vadodara, Education Department)")
            else:
                print(f"Auditor profile already exists with ID: {auditor_profile_id}")

            await session.commit()
            print("Successfully completed migration and seeding database operations!")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
