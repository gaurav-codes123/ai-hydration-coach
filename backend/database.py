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
# Neon PostgreSQL requires SSL — fix the URL scheme if needed
# Render / Neon gives "postgres://" but SQLAlchemy needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
# Check if SSL is needed (Neon always needs it)
connect_args = {}
if "neon.tech" in DATABASE_URL or "sslmode=require" in DATABASE_URL:
    connect_args = {"sslmode": "require"}
# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Reconnect on dropped connections
    pool_size=5,              # Neon free tier — keep lower
    max_overflow=10,
    echo=False,               # Set True to log all SQL queries
    connect_args=connect_args,
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