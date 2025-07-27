import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def migrate_gender_values():
    """Update all gender values to uppercase"""
    try:
        # Create database connection
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Starting gender migration...")
        
        # Update lowercase 'male' to 'MALE'
        result1 = db.execute(
            text("UPDATE ai_profiles SET gender = 'MALE' WHERE LOWER(gender) = 'male'")
        )
        print(f"Updated {result1.rowcount} records from 'male' to 'MALE'")
        
        # Update lowercase 'female' to 'FEMALE'  
        result2 = db.execute(
            text("UPDATE ai_profiles SET gender = 'FEMALE' WHERE LOWER(gender) = 'female'")
        )
        print(f"Updated {result2.rowcount} records from 'female' to 'FEMALE'")
        
        # Update any other variations
        result3 = db.execute(
            text("UPDATE ai_profiles SET gender = 'MALE' WHERE LOWER(gender) IN ('m', 'man')")
        )
        print(f"Updated {result3.rowcount} records from variations to 'MALE'")
        
        result4 = db.execute(
            text("UPDATE ai_profiles SET gender = 'FEMALE' WHERE LOWER(gender) IN ('f', 'woman')")
        )
        print(f"Updated {result4.rowcount} records from variations to 'FEMALE'")
        
        # Set any NULL or empty values to 'MALE'
        result5 = db.execute(
            text("UPDATE ai_profiles SET gender = 'MALE' WHERE gender IS NULL OR gender = ''")
        )
        print(f"Updated {result5.rowcount} NULL/empty records to 'MALE'")
        
        # Commit changes
        db.commit()
        print("Migration completed successfully!")
        
        # Verify results
        male_count = db.execute(text("SELECT COUNT(*) FROM ai_profiles WHERE gender = 'MALE'")).scalar()
        female_count = db.execute(text("SELECT COUNT(*) FROM ai_profiles WHERE gender = 'FEMALE'")).scalar()
        other_count = db.execute(text("SELECT COUNT(*) FROM ai_profiles WHERE gender NOT IN ('MALE', 'FEMALE')")).scalar()
        
        print(f"\nFinal counts:")
        print(f"MALE: {male_count}")
        print(f"FEMALE: {female_count}")
        print(f"Other: {other_count}")
        
        if other_count > 0:
            print(f"\nWarning: {other_count} records still have non-standard gender values")
            # Show what those values are
            other_values = db.execute(text("SELECT DISTINCT gender FROM ai_profiles WHERE gender NOT IN ('MALE', 'FEMALE')")).fetchall()
            print(f"Non-standard values: {[row[0] for row in other_values]}")
        
        db.close()
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()
        raise

if __name__ == "__main__":
    migrate_gender_values()