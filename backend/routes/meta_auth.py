"""
Complete Meta OAuth flow with token persistence and page management.
"""

from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import logging

from config import get_settings
from database import SessionLocal
from models import ConnectedPage
from schemas import ConnectedPageOut

router = APIRouter(prefix="/auth/meta", tags=["meta-auth"])

META_OAUTH_URL  = "https://www.facebook.com/v19.0/dialog/oauth"
META_TOKEN_URL  = "https://graph.facebook.com/v19.0/oauth/access_token"
META_GRAPH_URL  = "https://graph.facebook.com/v19.0"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

logger = logging.getLogger("sentiment_platform")

async def fetch_historical_comments(page_id: str, access_token: str):
    """
    Fetch the last 100 comments from a newly connected page via the Graph API and
    push them through the existing Redis worker queue so they are analyzed and
    persisted identically to live webhook events.

    Design decisions:
    - This function is gated by ConnectedPage.historical_fetch_done, so it only
      ever runs once per page (not on token refreshes or reconnects).
    - Deduplication: before queuing a comment we check whether its platform_id
      already exists in processed_comments, skipping any that were previously seen.
    - Pagination: we walk the Graph API cursor until we have collected up to
      TARGET_COMMENTS comments or there are no more pages.
    - On transient API errors we log and exit gracefully; the dashboard will still
      populate from any comments collected before the error.
    """
    from main import push_to_queue  # deferred to avoid circular import

    TARGET_COMMENTS = 100
    collected: list[dict] = []

    # ── 1. Collect comments via paginated feed endpoint ──────────────────────
    # We fetch post-level feed with nested comments expanded. Each page of results
    # may have multiple posts; we walk the cursor until we hit the target count.
    feed_url = f"{META_GRAPH_URL}/{page_id}/feed"
    params = {
        "access_token": access_token,
        # Fetch up to 100 comments per post in one call; limit=25 posts per page.
        "fields": "comments.limit(100){id,message,created_time,from}",
        "limit": 25,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            next_url: str | None = feed_url
            next_params: dict | None = params

            while next_url and len(collected) < TARGET_COMMENTS:
                if next_params:
                    resp = await client.get(next_url, params=next_params)
                else:
                    resp = await client.get(next_url)

                if resp.status_code != 200:
                    logger.warning(
                        f"[historical] Graph API returned {resp.status_code} for page {page_id}: {resp.text[:200]}"
                    )
                    break

                body = resp.json()
                posts = body.get("data", [])

                for post in posts:
                    for comment in post.get("comments", {}).get("data", []):
                        if len(collected) >= TARGET_COMMENTS:
                            break
                        msg = comment.get("message", "").strip()
                        if msg:
                            collected.append({
                                "comment_id": str(comment.get("id", "unknown")),
                                "message":    msg,
                                "created_time": comment.get("created_time"),
                            })
                    if len(collected) >= TARGET_COMMENTS:
                        break

                # Follow the pagination cursor if more posts exist
                paging = body.get("paging", {})
                next_url = paging.get("next")    # Graph API absolute URL
                next_params = None               # cursor is baked into next_url

    except httpx.HTTPError as exc:
        logger.error(f"[historical] HTTP error fetching history for page {page_id}: {exc}")
        return
    except Exception as exc:
        logger.error(f"[historical] Unexpected error for page {page_id}: {exc}")
        return

    if not collected:
        logger.info(f"[historical] No comments found for page {page_id}; skipping backfill.")
        return

    # ── 2. Deduplicate against existing DB records ────────────────────────────
    # Import here to avoid pulling heavy DB deps at module load time.
    from database import SessionLocal
    from models import ProcessedComment as PC

    db = SessionLocal()
    try:
        incoming_ids = [c["comment_id"] for c in collected]
        already_stored = {
            row[0]
            for row in db.query(PC.platform_id)
            .filter(PC.platform_id.in_(incoming_ids))
            .all()
        }
    finally:
        db.close()

    new_comments = [c for c in collected if c["comment_id"] not in already_stored]
    skipped = len(collected) - len(new_comments)
    logger.info(
        f"[historical] Page {page_id}: {len(collected)} fetched, "
        f"{skipped} already in DB, {len(new_comments)} will be queued."
    )

    # ── 3. Push new comments to the Redis worker queue ────────────────────────
    # We format each comment as a standard Meta webhook payload so the worker
    # processes it identically to a live event (same analysis, same DB schema).
    for comment in new_comments:
        payload = {
            "entry": [{
                "id": page_id,
                "changes": [{
                    "field": "feed",
                    "value": {
                        "message":    comment["message"],
                        "comment_id": comment["comment_id"],
                        "id":         comment["comment_id"],
                        # Tag as historical so the worker/DB can distinguish origin
                        "item":       "comment",
                        "historical": True,
                    },
                }],
            }]
        }
        push_to_queue(payload)

    logger.info(f"[historical] Backfill queued for page {page_id}.")



@router.get("/login")
async def meta_login():
    settings = get_settings()
    if not settings.meta_app_id:
        raise HTTPException(
            status_code=503,
            detail="Set META_APP_ID and META_APP_SECRET in .env to enable OAuth.",
        )
    params = {
        "client_id":     settings.meta_app_id,
        "redirect_uri":  settings.meta_redirect_uri,
        "scope":         "pages_manage_metadata,instagram_manage_comments,pages_read_engagement,pages_show_list",
        "response_type": "code",
        "state":         "csrf_protection_token",
    }
    return RedirectResponse(f"{META_OAUTH_URL}?{urlencode(params)}")


@router.get("/callback")
async def meta_callback(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    settings = get_settings()
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    if not settings.meta_app_id or not settings.meta_app_secret:
        raise HTTPException(status_code=503, detail="Meta app credentials not configured")

    # Exchange code for short-lived token
    async with httpx.AsyncClient() as client:
        token_resp = await client.get(
            META_TOKEN_URL,
            params={
                "client_id":     settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "redirect_uri":  settings.meta_redirect_uri,
                "code":          code,
            },
        )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to exchange Meta OAuth code")

    short_token = token_resp.json().get("access_token")
    if not short_token:
        raise HTTPException(status_code=502, detail="No access token in Meta response")

    # Exchange for long-lived page tokens via /me/accounts
    async with httpx.AsyncClient() as client:
        accounts_resp = await client.get(
            f"{META_GRAPH_URL}/me/accounts",
            params={"access_token": short_token, "fields": "id,name,access_token,category,fan_count"},
        )

    pages_saved = []
    if accounts_resp.status_code == 200:
        accounts_data = accounts_resp.json().get("data", [])
        for page in accounts_data:
            is_new_page = False
            existing = db.query(ConnectedPage).filter(
                ConnectedPage.page_id == str(page["id"])
            ).first()
            if existing:
                existing.access_token   = page.get("access_token", "")
                existing.page_name      = page.get("name", "")
                existing.category       = page.get("category")
                existing.follower_count = page.get("fan_count")
                existing.is_active      = True
            else:
                new_page = ConnectedPage(
                    page_id=str(page["id"]),
                    page_name=page.get("name", "Unnamed Page"),
                    access_token=page.get("access_token", ""),
                    platform="facebook",
                    category=page.get("category"),
                    follower_count=page.get("fan_count"),
                    historical_fetch_done=False,  # gate starts closed
                )
                db.add(new_page)
                is_new_page = True

            pages_saved.append(page.get("name"))

            # Only trigger the 100-comment historical backfill on the very first
            # connect. Token refreshes and reconnects do NOT re-run the backfill
            # (the historical_fetch_done flag guards this). We flush first so that
            # the flag write is visible to the background task.
            page_record = existing if not is_new_page else new_page
            if not page_record.historical_fetch_done:
                page_record.historical_fetch_done = True  # mark before committing
                background_tasks.add_task(
                    fetch_historical_comments,
                    str(page["id"]),
                    page.get("access_token", ""),
                )
                logger.info(
                    f"[historical] Scheduled backfill for new page: {page.get('name')} ({page['id']})"
                )

        db.commit()

    return RedirectResponse(f"{settings.frontend_url}/connect-pages?success=true")


@router.get("/pages", response_model=list[ConnectedPageOut])
async def list_connected_pages(db: Session = Depends(get_db)):
    return db.query(ConnectedPage).filter(ConnectedPage.is_active == True).all()


@router.delete("/pages/{page_id}")
async def disconnect_page(page_id: str, db: Session = Depends(get_db)):
    page = db.query(ConnectedPage).filter(ConnectedPage.page_id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page.is_active = False
    db.commit()
    return {"status": "success", "message": f"Page {page.page_name} disconnected"}


@router.post("/pages/{page_id}/refresh-token")
async def refresh_page_token(page_id: str, db: Session = Depends(get_db)):
    """Extend a page token's validity using the long-lived token exchange."""
    settings = get_settings()
    page = db.query(ConnectedPage).filter(
        ConnectedPage.page_id == page_id, ConnectedPage.is_active == True
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{META_GRAPH_URL}/oauth/access_token",
            params={
                "grant_type":        "fb_exchange_token",
                "client_id":         settings.meta_app_id,
                "client_secret":     settings.meta_app_secret,
                "fb_exchange_token": page.access_token,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to refresh token")

    new_token = resp.json().get("access_token")
    if new_token:
        page.access_token = new_token
        db.commit()
        return {"status": "success", "message": "Token refreshed"}

    raise HTTPException(status_code=502, detail="No token in refresh response")
