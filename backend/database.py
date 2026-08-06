from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# In a production environment, this URI must be hidden in a .env file.
# We are using a local PostgreSQL setup for the MVP.
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:postgres@localhost/sentiment_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()