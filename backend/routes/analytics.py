"""
Deep analytics endpoints for language switching, heatmaps, brand mentions, and CSV export.
"""

import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import SessionLocal
from models import ProcessedComment
from schemas import AnalyticsResponse, BrandMention, HeatmapCell, LanguageSwitchPoint

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Language-switching over time ──────────────────────────────────────────
@router.get("/language-switching", response_model=list[LanguageSwitchPoint])
async def language_switching(
    hours: int = Query(48, ge=1, le=720, description="How many hours back to look"),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            func.date_trunc("hour", ProcessedComment.created_at).label("bucket"),
            func.avg(ProcessedComment.english_ratio).label("avg_en"),
            func.avg(ProcessedComment.language_switch_count).label("avg_sw"),
            func.count(ProcessedComment.id).label("cnt"),
        )
        .group_by("bucket")
        .order_by("bucket")
        .limit(hours)
        .all()
    )
    return [
        LanguageSwitchPoint(
            hour=str(r.bucket.isoformat()) if r.bucket else "unknown",
            avg_en_ratio=round(float(r.avg_en or 0), 3),
            avg_switches=round(float(r.avg_sw or 0), 2),
            comment_count=int(r.cnt),
        )
        for r in rows
    ]


# ─── Heatmap (hour × day_of_week) ──────────────────────────────────────────
@router.get("/heatmap", response_model=list[HeatmapCell])
async def heatmap(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    # PostgreSQL EXTRACT: dow 0=Sun…6=Sat, we remap 0=Mon…6=Sun
    rows = db.execute(
        text(
            """
            SELECT
                EXTRACT(DOW  FROM created_at)::int AS dow,
                EXTRACT(HOUR FROM created_at)::int AS hr,
                COUNT(*) AS cnt
            FROM processed_comments
            WHERE created_at >= NOW() - INTERVAL ':days days'
            GROUP BY dow, hr
            ORDER BY dow, hr
            """.replace(":days", str(days))
        )
    ).fetchall()

    return [
        HeatmapCell(
            day_of_week=int((r.dow - 1) % 7),
            hour=int(r.hr),
            count=int(r.cnt),
        )
        for r in rows
    ]


# ─── Top brand / entity mentions ───────────────────────────────────────────
@router.get("/brand-mentions", response_model=list[BrandMention])
async def brand_mentions(
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
):
    comments = db.query(ProcessedComment).filter(
        ProcessedComment.extracted_entities.isnot(None)
    ).all()

    brand_map: dict[str, dict] = {}
    for c in comments:
        brands = (c.extracted_entities or {}).get("brands_mentioned", [])
        for brand in brands:
            if brand not in brand_map:
                brand_map[brand] = {"count": 0, "positive": 0, "negative": 0, "neutral": 0, "sarcastic": 0}
            brand_map[brand]["count"] += 1
            sent = c.sentiment or "neutral"
            brand_map[brand][sent] = brand_map[brand].get(sent, 0) + 1

    sorted_brands = sorted(brand_map.items(), key=lambda x: x[1]["count"], reverse=True)[:limit]

    return [
        BrandMention(
            brand=name,
            count=data["count"],
            sentiment_breakdown={
                "positive": data.get("positive", 0),
                "negative": data.get("negative", 0),
                "neutral":  data.get("neutral", 0),
                "sarcastic": data.get("sarcastic", 0),
            },
        )
        for name, data in sorted_brands
    ]


# ─── Inference source breakdown ────────────────────────────────────────────
@router.get("/inference-sources")
async def inference_sources(db: Session = Depends(get_db)):
    rows = (
        db.query(ProcessedComment.inference_source, func.count(ProcessedComment.id))
        .group_by(ProcessedComment.inference_source)
        .all()
    )
    return {(r[0] or "unknown"): r[1] for r in rows}


# ─── Sentiment by english ratio band ───────────────────────────────────────
@router.get("/english-ratio-bands")
async def english_ratio_bands(db: Session = Depends(get_db)):
    """Show how sentiment distribution varies by English proportion band."""
    comments = db.query(
        ProcessedComment.english_ratio, ProcessedComment.sentiment
    ).filter(ProcessedComment.english_ratio.isnot(None)).all()

    bands = {
        "0-25%":   {"positive": 0, "negative": 0, "neutral": 0, "sarcastic": 0},
        "25-50%":  {"positive": 0, "negative": 0, "neutral": 0, "sarcastic": 0},
        "50-75%":  {"positive": 0, "negative": 0, "neutral": 0, "sarcastic": 0},
        "75-100%": {"positive": 0, "negative": 0, "neutral": 0, "sarcastic": 0},
    }
    for en_ratio, sentiment in comments:
        ratio = float(en_ratio or 0)
        if ratio < 0.25:
            key = "0-25%"
        elif ratio < 0.50:
            key = "25-50%"
        elif ratio < 0.75:
            key = "50-75%"
        else:
            key = "75-100%"
        bands[key][sentiment] = bands[key].get(sentiment, 0) + 1

    return bands


# ─── CSV Export ────────────────────────────────────────────────────────────
@router.get("/export")
async def export_comments(
    sentiment: Optional[str] = None,
    page_id:   Optional[str] = None,
    limit:     int = Query(1000, ge=1, le=10000),
    db:        Session = Depends(get_db),
):
    q = db.query(ProcessedComment)
    if sentiment:
        q = q.filter(ProcessedComment.sentiment == sentiment)
    if page_id:
        q = q.filter(ProcessedComment.page_id == page_id)
    comments = q.order_by(ProcessedComment.created_at.desc()).limit(limit).all()

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "id", "platform_id", "page_id", "sentiment", "confidence",
            "english_ratio", "language_switch_count", "inference_source",
            "original_text", "created_at",
        ])
        for c in comments:
            writer.writerow([
                c.id, c.platform_id, c.page_id, c.sentiment, c.confidence,
                c.english_ratio, c.language_switch_count, c.inference_source,
                c.original_text, c.created_at.isoformat() if c.created_at else "",
            ])
        yield buf.getvalue()

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=comments_export.csv"},
    )
