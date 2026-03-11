"""
database.py — PostgreSQL Database Connection
=============================================
SQLAlchemy async engine + session setup.
Reads DATABASE_URL from .env file.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
# Load environment variables from .env
load_dotenv()
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://hydration_user:hydration123@localhost:5432/hydration_db"
)
# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Reconnect on dropped connections
    pool_size=10,             # Max 10 connections
    max_overflow=20,          # Extra 20 overflow connections
    echo=False,               # Set True to log all SQL queries
)
# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
# Base class for all ORM models
Base = declarative_base()
# ─────────────────────────────────────────────
# Dependency — used in FastAPI routes
# ─────────────────────────────────────────────
def get_db():
    """
    FastAPI dependency that yields a DB session.
    Automatically closes after request is done.
    Usage in route:
        def my_route(db: Session = Depends(get_db)):
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# ─────────────────────────────────────────────
# Create all tables
# ─────────────────────────────────────────────
def init_db():
    """Create all tables in the database."""
    from models import Base  # import here to avoid circular imports
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully.")