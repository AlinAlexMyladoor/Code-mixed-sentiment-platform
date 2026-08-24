import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, JSON, Boolean, Text

from database import Base


class User(Base):
    """Platform user account."""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name     = Column(String, nullable=True)
    role          = Column(String, default="user")      # user | admin
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Organization(Base):
    """SaaS multi-tenancy: organizations own pages and users."""
    __tablename__ = "organizations"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    slug       = Column(String, unique=True, index=True)
    plan       = Column(String, default="free")        # free | pro | enterprise
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class APIKey(Base):
    """Programmatic API access keys."""
    __tablename__ = "api_keys"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, index=True, nullable=False)
    key_hash   = Column(String, unique=True, nullable=False)
    name       = Column(String, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used  = Column(DateTime, nullable=True)


class ConnectedPage(Base):
    """Meta page / Instagram business account linked via OAuth."""
    __tablename__ = "connected_pages"

    id           = Column(Integer, primary_key=True, index=True)
    page_id      = Column(String, unique=True, index=True)
    page_name    = Column(String)
    access_token = Column(Text)
    platform     = Column(String, default="facebook")  # facebook | instagram
    category     = Column(String, nullable=True)
    follower_count = Column(Integer, nullable=True)
    is_active    = Column(Boolean, default=True)
    user_id      = Column(Integer, nullable=True)
    created_at   = Column(DateTime, default=datetime.datetime.utcnow)
    token_expires_at = Column(DateTime, nullable=True)
    # Tracks whether the one-time historical backfill has already run for this page.
    # Prevents duplicate ingestion when the page is reconnected or its token is refreshed.
    historical_fetch_done = Column(Boolean, default=False, nullable=False)


class StripeEvent(Base):
    """Tracks processed Stripe webhook event IDs to enforce idempotency."""
    __tablename__ = "stripe_events"

    id         = Column(String, primary_key=True, index=True)
    type       = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ProcessedComment(Base):
    __tablename__ = "processed_comments"

    id                    = Column(Integer, primary_key=True, index=True)
    platform_id           = Column(String, index=True)
    page_id               = Column(String, index=True, nullable=True)
    parent_comment_id     = Column(String, nullable=True)
    original_text         = Column(Text)
    extracted_entities    = Column(JSON)
    sentiment             = Column(String, index=True)
    english_ratio         = Column(Float)
    language_switch_count = Column(Integer, default=0)
    confidence            = Column(Float, nullable=True)
    inference_source      = Column(String, nullable=True)  # heuristic_mvp | roberta_cpu | llama_lora
    sarcasm_score         = Column(Float, nullable=True)   # continuous 0.0–1.0 sarcasm confidence
    sarcasm_signals       = Column(JSON, nullable=True)
    regional_tokens_found = Column(JSON, nullable=True)
    aspect_sentiments     = Column(JSON, nullable=True)
    intent_signal         = Column(String, nullable=True)  # complaint | inquiry | buying_intent | praise | general
    ticket_id             = Column(String, nullable=True)
    ticket_status         = Column(String, nullable=True, default="Open") # Open | In Progress | Resolved
    draft_reply           = Column(String, nullable=True)
    raw_payload           = Column(JSON)
    created_at            = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class AlertRule(Base):
    __tablename__ = "alert_rules"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, index=True)
    keyword       = Column(String, nullable=True)     # e.g., "delivery", "refund"
    intent        = Column(String, nullable=True)     # e.g., "complaint"
    sentiment     = Column(String, nullable=True)     # e.g., "negative"
    channel       = Column(String, default="Telegram") # Telegram, Slack, Email
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)
