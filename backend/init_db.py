"""Create PostgreSQL tables."""

from sqlalchemy import text

from database import Base, engine
from models import ConnectedPage, ProcessedComment  # noqa: F401


def _ensure_processed_comments_columns() -> None:
    """Backfill columns that may be missing from older local schemas."""
    with engine.begin() as conn:
        existing = {
            row[0]
            for row in conn.execute(
                text(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'processed_comments'
                    """
                )
            )
        }

        if "page_id" not in existing:
            conn.execute(text("ALTER TABLE processed_comments ADD COLUMN page_id VARCHAR"))
        if "parent_comment_id" not in existing:
            conn.execute(
                text("ALTER TABLE processed_comments ADD COLUMN parent_comment_id VARCHAR")
            )
        if "language_switch_count" not in existing:
            conn.execute(
                text(
                    "ALTER TABLE processed_comments ADD COLUMN language_switch_count INTEGER DEFAULT 0"
                )
            )
        if "confidence" not in existing:
            conn.execute(text("ALTER TABLE processed_comments ADD COLUMN confidence DOUBLE PRECISION"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_processed_comments_columns()
    print("Database tables ready.")


if __name__ == "__main__":
    init_db()
