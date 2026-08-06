from sqlalchemy import Column, DateTime, Float, Integer, String, JSON, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import datetime

from config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
