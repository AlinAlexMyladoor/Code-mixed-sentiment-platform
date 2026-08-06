from sqlalchemy import Column, DateTime, Float, Integer, String, JSON
import datetime

from database import Base


class ConnectedPage(Base):
    """Meta page / Instagram business account linked via OAuth."""

    __tablename__ = "connected_pages"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(String, unique=True, index=True)
    page_name = Column(String)
    access_token = Column(String)
    platform = Column(String, default="facebook")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ProcessedComment(Base):
    __tablename__ = "processed_comments"

    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(String, index=True)
    page_id = Column(String, index=True, nullable=True)
    parent_comment_id = Column(String, nullable=True)
    original_text = Column(String)
    extracted_entities = Column(JSON)
    sentiment = Column(String, index=True)
    english_ratio = Column(Float)
    language_switch_count = Column(Integer, default=0)
    confidence = Column(Float, nullable=True)
    raw_payload = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
