from __future__ import annotations

from fastapi import APIRouter, Query

from backend.services.market import market_overview

router = APIRouter(tags=["market"])


@router.get("/market/overview")
def api_market_overview(date: str | None = Query(None, description="YYYYMMDD, default latest trade date")):
    return market_overview(date)

