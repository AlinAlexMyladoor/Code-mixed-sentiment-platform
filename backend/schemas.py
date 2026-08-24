from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ─── Comment Schemas ────────────────────────────────────────────────────────

class ProcessedCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:                    int
    platform_id:           str
    original_text:         str
    extracted_entities:    Optional[dict[str, Any]]
    sentiment:             str
    english_ratio:         Optional[float]
    language_switch_count: Optional[int]
    confidence:            Optional[float]
    inference_source:      Optional[str]
    sarcasm_signals:       Optional[list[str]]
    regional_tokens_found: Optional[list[str]]
    aspect_sentiments:     Optional[dict[str, str]]
    intent_signal:         Optional[str]
    ticket_id:             Optional[str]
    ticket_status:         Optional[str]
    parent_comment_id:     Optional[str]
    page_id:               Optional[str]
    created_at:            datetime


# ─── Metrics / Dashboard Schemas ────────────────────────────────────────────

class MetricsSummary(BaseModel):
    total_comments:    int
    positive:          int
    negative:          int
    neutral:           int
    sarcastic:         int
    avg_english_ratio: float
    urgent_alerts:     int


class DashboardMetrics(BaseModel):
    status:  str
    summary: MetricsSummary
    trend:   list[dict[str, Any]]
    data:    list[ProcessedCommentOut]


# ─── Auth Schemas ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email:     EmailStr
    password:  str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=255)


class UserLogin(BaseModel):
    email:    EmailStr
    password: str = Field(..., max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         int
    email:      str
    full_name:  Optional[str]
    role:       str
    is_active:  bool
    created_at: datetime


class Token(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email:   Optional[str] = None


# ─── Connected Page Schemas ───────────────────────────────────────────────────

class ConnectedPageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             int
    page_id:        str
    page_name:      str
    platform:       str
    category:       Optional[str]
    follower_count: Optional[int]
    is_active:      bool
    created_at:     datetime


# ─── Analytics Schemas ───────────────────────────────────────────────────────

class LanguageSwitchPoint(BaseModel):
    hour:           str
    avg_en_ratio:   float
    avg_switches:   float
    comment_count:  int


class HeatmapCell(BaseModel):
    day_of_week: int    # 0=Mon … 6=Sun
    hour:        int    # 0-23
    count:       int


class BrandMention(BaseModel):
    brand:   str
    count:   int
    sentiment_breakdown: dict[str, int]


class AnalyticsResponse(BaseModel):
    language_switching: list[LanguageSwitchPoint]
    heatmap:            list[HeatmapCell]
    top_brands:         list[BrandMention]
    inference_sources:  dict[str, int]
