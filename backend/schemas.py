from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ProcessedCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform_id: str
    original_text: str
    extracted_entities: dict[str, Any] | None
    sentiment: str
    english_ratio: float | None
    language_switch_count: int | None
    confidence: float | None
    parent_comment_id: str | None
    page_id: str | None
    created_at: datetime


class MetricsSummary(BaseModel):
    total_comments: int
    positive: int
    negative: int
    neutral: int
    sarcastic: int
    avg_english_ratio: float
    urgent_alerts: int


class DashboardMetrics(BaseModel):
    status: str
    summary: MetricsSummary
    trend: list[dict[str, Any]]
    data: list[ProcessedCommentOut]
