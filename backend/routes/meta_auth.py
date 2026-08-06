"""
Meta OAuth scaffolding (Week 1 of feasibility timeline).
Complete token exchange once META_APP_ID and META_APP_SECRET are set.
"""

from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from config import get_settings

router = APIRouter(prefix="/auth/meta", tags=["meta-auth"])

META_OAUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth"
META_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token"


@router.get("/login")
async def meta_login():
    settings = get_settings()
    if not settings.meta_app_id:
        raise HTTPException(
            status_code=503,
            detail="Set META_APP_ID and META_APP_SECRET in .env to enable OAuth.",
        )
    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": settings.meta_redirect_uri,
        "scope": "pages_manage_metadata,instagram_manage_comments,pages_read_engagement",
        "response_type": "code",
    }
    return RedirectResponse(f"{META_OAUTH_URL}?{urlencode(params)}")


@router.get("/callback")
async def meta_callback(request: Request):
    settings = get_settings()
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    if not settings.meta_app_id or not settings.meta_app_secret:
        raise HTTPException(status_code=503, detail="Meta app credentials not configured")

    async with httpx.AsyncClient() as client:
        token_resp = await client.get(
            META_TOKEN_URL,
            params={
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "redirect_uri": settings.meta_redirect_uri,
                "code": code,
            },
        )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to exchange Meta OAuth code")

    return {
        "status": "success",
        "message": "OAuth completed. Persist page tokens via Graph API /me/accounts.",
        "token_preview": token_resp.json(),
    }
