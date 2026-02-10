from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.services.signals import compute_strategy_events
from backend.services.stocks import get_kline, search_stocks, stock_profile
from backend.services.strategy_dsl import StrategyDSL

router = APIRouter(tags=["stocks"])


@router.get("/stocks/search")
def api_search_stocks(q: str = Query("", min_length=0, max_length=40)):
    return {"items": search_stocks(q)}


@router.get("/stocks/{ts_code}/profile")
def api_stock_profile(ts_code: str):
    p = stock_profile(ts_code)
    if not p:
        raise HTTPException(status_code=404, detail="stock not found")
    return p


@router.get("/stocks/{ts_code}/kline")
def api_kline(
    ts_code: str,
    start: str = Query(..., description="YYYYMMDD"),
    end: str = Query(..., description="YYYYMMDD"),
    adj: str = Query("qfq", pattern="^(qfq|none)$"),
):
    return {"ts_code": ts_code, "adj": adj, "bars": get_kline(ts_code, start, end, adj)}


@router.post("/stocks/{ts_code}/signals")
def api_stock_signals(ts_code: str, dsl: StrategyDSL, days: int = 120):
    return compute_strategy_events(ts_code, dsl, days)

