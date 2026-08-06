from sqlalchemy import Column, Integer, String, Float, JSON, DateTime
from database import Base
import datetime

class ProcessedComment(Base):
    __tablename__ = "processed_comments"

    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(String, index=True) # Meta's comment ID
    original_text = Column(String)
    extracted_entities = Column(JSON) # To handle boundary-optimized extraction outputs
    sentiment = Column(String, index=True) # Positive, Negative, Neutral, Sarcastic
    english_ratio = Column(Float) # Sociolinguistic metric (0.0 to 1.0)
    raw_payload = Column(JSON) # Keep the original webhook just in case
    created_at = Column(DateTime, default=datetime.datetime.utcnow)