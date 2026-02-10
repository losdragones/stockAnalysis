from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.services.strategy_dsl import StrategyCreateRequest, StrategyDSL, StrategyNLParseRequest
from backend.services.strategy_nlp import parse_nl_to_dsl
from backend.services.strategy_store import create_strategy, list_strategies, run_dsl, run_strategy, strategy_runs

router = APIRouter(tags=["strategies"])


@router.get("/strategies")
def api_list_strategies():
    return {"items": list_strategies()}


@router.post("/strategies/parse_nl")
def api_parse_nl(req: StrategyNLParseRequest):
    return parse_nl_to_dsl(req.text)


@router.post("/strategies")
def api_create_strategy(req: StrategyCreateRequest):
    return create_strategy(req)

@router.post("/strategies/run_draft")
def api_run_draft(dsl: StrategyDSL):
    return run_dsl(dsl)


@router.post("/strategies/{strategy_id}/run")
def api_run_strategy(strategy_id: str):
    try:
        return run_strategy(strategy_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="strategy not found")


@router.get("/strategies/{strategy_id}/runs")
def api_strategy_runs(strategy_id: str, limit: int = 20):
    return {"items": strategy_runs(strategy_id, limit)}

