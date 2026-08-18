"""
EduAudit AI - School Importer Script
Imports school data from UDISE CSV file into PostgreSQL.
"""
import sys
import os
import asyncio
import csv
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Setup paths
scripts_dir = Path(__file__).resolve().parent
project_root = scripts_dir.parent
backend_path = project_root / "backend"
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(project_root))

# Load environment
load_dotenv(backend_path / ".env")
load_dotenv(project_root / ".env")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models.category import State, District
from app.models.school import School

async def try_db_connection(db_url):
    """Try connecting to database with a URL"""
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with async_session() as session:
            await session.execute(select(1))
            return engine, async_session
    except Exception:
        await engine.dispose()
        return None, None

async def main():
    parser = argparse.ArgumentParser(description="Import schools from UDISE CSV")
    parser.add_argument("--file", type=str, default=str(project_root / "udise-schools-gujarat.csv"), help="Path to CSV file")
    parser.add_argument("--db-url", type=str, help="Database connection URL")
    args = parser.parse_args()

    csv_path = Path(args.file)
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)

    # Database URL resolution
    db_urls = []
    if args.db_url:
        db_urls.append(args.db_url)
    
    # Try from environment variable
    env_db_url = os.getenv("DATABASE_URL")
    if env_db_url:
        db_urls.append(env_db_url)
        # Add host fallback ports
        if "db:5432" in env_db_url:
            db_urls.append(env_db_url.replace("db:5432", "localhost:5433"))
        if "localhost:5432" in env_db_url:
            db_urls.append(env_db_url.replace("localhost:5432", "localhost:5433"))

    # Fallback defaults
    db_urls.append("postgresql+asyncpg://eduaudit:eduaudit_secure_2026@localhost:5433/eduaudit")
    db_urls.append("postgresql+asyncpg://eduaudit:eduaudit_secure_2026@db:5432/eduaudit")

    engine = None
    async_session = None
    connected_url = None

    for url in db_urls:
        print(f"Trying to connect to database at: {url.split('@')[-1]}...")
        engine, async_session = await try_db_connection(url)
        if engine:
            connected_url = url
            print("Successfully connected to database!")
            break

    if not engine:
        print("Error: Could not connect to database with any URL.")
        sys.exit(1)

    try:
        # Read CSV file
        print(f"Reading schools from {csv_path}...")
        schools_data = []
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                schools_data.append(row)

        print(f"Found {len(schools_data)} records in CSV.")

        async with async_session() as session:
            # 1. Ensure State (Gujarat) exists
            state_name = "Gujarat"
            state_code = "GJ"
            
            result = await session.execute(select(State).where(State.code == state_code))
            state_obj = result.scalar_one_or_none()
            if not state_obj:
                print(f"Creating State: {state_name} ({state_code})...")
                state_obj = State(name=state_name, code=state_code)
                session.add(state_obj)
                await session.flush()
            
            # 2. Get unique districts from CSV and ensure they exist
            districts_in_csv = set(row["District"].strip().title() for row in schools_data if row.get("District"))
            print(f"Districts to process: {districts_in_csv}")
            
            district_map = {} # name -> UUID
            for dist_name in districts_in_csv:
                result = await session.execute(
                    select(District).where(District.name.ilike(dist_name), District.state_id == state_obj.id)
                )
                dist_obj = result.scalar_one_or_none()
                if not dist_obj:
                    dist_code = f"{state_code}_{dist_name.upper().replace(' ', '_')}"[:10]
                    print(f"Creating District: {dist_name} under State {state_name}...")
                    dist_obj = District(name=dist_name, state_id=state_obj.id, code=dist_code)
                    session.add(dist_obj)
                    await session.flush()
                district_map[dist_name.lower()] = dist_obj.id

            # 3. Get existing schools' UDISE codes to prevent duplicates
            result = await session.execute(select(School.udise_code))
            existing_udise_codes = set(r[0] for r in result.all() if r[0])
            print(f"Preloaded {len(existing_udise_codes)} existing UDISE codes from database.")

            # 4. Process schools
            new_schools = []
            skipped_duplicates = 0
            skipped_missing = 0
            
            for row in schools_data:
                udise_code = row.get("UDISE Code", "").strip().strip('"')
                school_name = row.get("School Name", "").strip().strip('"')
                dist_name = row.get("District", "").strip().title()
                block = row.get("Block", "").strip()
                management = row.get("Management", "").strip()
                category = row.get("Category", "").strip()
                pin_code = row.get("PIN Code", "").strip()
                
                if not udise_code or not school_name:
                    skipped_missing += 1
                    continue
                    
                if udise_code in existing_udise_codes:
                    skipped_duplicates += 1
                    continue
                
                dist_id = district_map.get(dist_name.lower())
                if not dist_id:
                    print(f"Warning: District {dist_name} not found in map, skipping school {school_name}.")
                    continue

                address = f"{block}, {dist_name}, Gujarat, PIN: {pin_code}" if pin_code else f"{block}, {dist_name}, Gujarat"

                mgmt_type = "govt"
                if "aided" in management.lower():
                    mgmt_type = "govt_aided"
                elif "private" in management.lower():
                    mgmt_type = "private_aided"
                
                school_type = "primary"
                cat_lower = category.lower()
                if "secondary" in cat_lower or "high school" in cat_lower:
                    if "upper" in cat_lower or "primary" in cat_lower:
                        school_type = "upper_primary"
                    else:
                        school_type = "secondary"
                elif "higher secondary" in cat_lower or "sr_secondary" in cat_lower or "sr secondary" in cat_lower or "junior college" in cat_lower:
                    school_type = "sr_secondary"
                elif "upper primary" in cat_lower:
                    school_type = "upper_primary"

                health_score = 85
                health_grade = "A"

                school_obj = School(
                    udise_code=udise_code,
                    name=school_name,
                    district_id=dist_id,
                    address=address,
                    location=None,
                    block=block,
                    cluster=None,
                    enrollment=0,
                    school_type=school_type,
                    management_type=mgmt_type,
                    health_score=health_score,
                    health_grade=health_grade,
                    infrastructure_data={},
                    is_active=True
                )
                session.add(school_obj)
                existing_udise_codes.add(udise_code)
                new_schools.append(school_obj)

            print(f"Prepared {len(new_schools)} new schools for insertion. (Skipped duplicates: {skipped_duplicates}, Skipped empty: {skipped_missing})")
            
            if new_schools:
                await session.commit()
                print(f"Successfully committed {len(new_schools)} new schools to the database!")
            else:
                print("No new schools to insert.")

    except Exception as e:
        print(f"An error occurred during import: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
