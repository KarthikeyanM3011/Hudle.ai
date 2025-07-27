import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.core.config import settings
except ImportError:
    print("Error: Could not import settings. Make sure you're running this from the correct directory.")
    print("Run this script from: huddle-ai/backend/")
    sys.exit(1)

def check_database():
    """Check current gender values in the database"""
    try:
        # Create database connection
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("🔍 Checking current gender values in database...\n")
        
        # Check if ai_profiles table exists
        table_check = db.execute(text("SHOW TABLES LIKE 'ai_profiles'")).fetchone()
        if not table_check:
            print("❌ ai_profiles table does not exist!")
            print("   Please run the application first to create tables.")
            db.close()
            return
        
        # Get all distinct gender values
        gender_values = db.execute(text("SELECT DISTINCT gender, COUNT(*) as count FROM ai_profiles GROUP BY gender")).fetchall()
        
        if not gender_values:
            print("✅ No AI profiles found in database")
            db.close()
            return
        
        print("📊 Current gender values:")
        print("-" * 30)
        total_records = 0
        needs_fix = False
        
        for gender, count in gender_values:
            total_records += count
            status = "✅" if gender in ['MALE', 'FEMALE'] else "❌"
            print(f"{status} '{gender}': {count} records")
            if gender not in ['MALE', 'FEMALE']:
                needs_fix = True
        
        print(f"\n📈 Total AI profiles: {total_records}")
        
        if needs_fix:
            print("\n⚠️  Some gender values need normalization!")
            fix = input("\n🔧 Would you like to fix these values now? (y/N): ").lower().strip()
            
            if fix in ['y', 'yes']:
                fix_gender_values(db)
            else:
                print("\n💡 To fix later, run this script again or use the migration script.")
        else:
            print("\n✅ All gender values are properly normalized!")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        if 'db' in locals():
            db.close()

def fix_gender_values(db):
    """Fix gender values in the database"""
    try:
        print("\n🔧 Fixing gender values...")
        
        # Update variations to MALE
        male_updates = db.execute(
            text("UPDATE ai_profiles SET gender = 'MALE' WHERE LOWER(gender) IN ('male', 'm', 'man') AND gender != 'MALE'")
        )
        
        # Update variations to FEMALE
        female_updates = db.execute(
            text("UPDATE ai_profiles SET gender = 'FEMALE' WHERE LOWER(gender) IN ('female', 'f', 'woman') AND gender != 'FEMALE'")
        )
        
        # Set any NULL or empty values to 'MALE'
        null_updates = db.execute(
            text("UPDATE ai_profiles SET gender = 'MALE' WHERE gender IS NULL OR gender = ''")
        )
        
        # Handle any other non-standard values
        other_updates = db.execute(
            text("UPDATE ai_profiles SET gender = 'MALE' WHERE gender NOT IN ('MALE', 'FEMALE')")
        )
        
        total_updates = male_updates.rowcount + female_updates.rowcount + null_updates.rowcount + other_updates.rowcount
        
        if total_updates > 0:
            db.commit()
            print(f"✅ Updated {total_updates} records successfully!")
            
            # Show final results
            print("\n📊 Final gender distribution:")
            print("-" * 30)
            final_values = db.execute(text("SELECT DISTINCT gender, COUNT(*) as count FROM ai_profiles GROUP BY gender")).fetchall()
            for gender, count in final_values:
                status = "✅" if gender in ['MALE', 'FEMALE'] else "❌"
                print(f"{status} '{gender}': {count} records")
        else:
            print("✅ No updates needed - all values are already correct!")
        
    except Exception as e:
        print(f"❌ Fix failed: {e}")
        db.rollback()
        raise

def main():
    print("🏥 Huddle.ai Database Gender Check Tool")
    print("=" * 40)
    
    # Check if we can connect to database
    try:
        engine = create_engine(settings.DATABASE_URL)
        engine.connect()
        print("✅ Database connection successful\n")
    except Exception as e:
        print(f"❌ Cannot connect to database: {e}")
        print(f"   Connection string: {settings.DATABASE_URL}")
        return 1
    
    check_database()
    return 0

if __name__ == "__main__":
    sys.exit(main())