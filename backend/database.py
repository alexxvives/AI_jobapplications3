from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database configuration
# Use centralized database configuration to ensure consistency
from db_config import get_db_path, get_database_url

DB_PATH = get_db_path()
DATABASE_URL = os.getenv("DATABASE_URL", get_database_url())

# Job scraping database path (same as main database)
SCRAPING_DB_PATH = DB_PATH

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()