"""
Complete Meta OAuth flow with token persistence and page management.
"""

from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

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
async def meta_callback(request: Request, db: Session = Depends(get_db)):
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
            existing = db.query(ConnectedPage).filter(
                ConnectedPage.page_id == str(page["id"])
            ).first()
            if existing:
                existing.access_token = page.get("access_token", "")
                existing.page_name    = page.get("name", "")
                existing.category     = page.get("category")
                existing.follower_count = page.get("fan_count")
                existing.is_active    = True
            else:
                new_page = ConnectedPage(
                    page_id=str(page["id"]),
                    page_name=page.get("name", "Unnamed Page"),
                    access_token=page.get("access_token", ""),
                    platform="facebook",
                    category=page.get("category"),
                    follower_count=page.get("fan_count"),
                )
                db.add(new_page)
            pages_saved.append(page.get("name"))
        db.commit()

    return {
        "status":      "success",
        "message":     f"Connected {len(pages_saved)} page(s) successfully",
        "pages":       pages_saved,
    }


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
