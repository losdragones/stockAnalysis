from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

import akshare as ak
import pandas as pd
from sqlalchemy import select

from backend.db import SessionLocal
from backend.models import Strategy, StrategyRun
from backend.services.strategy_codegen import generate_python_code
from backend.services.strategy_dsl import StrategyCreateRequest, StrategyDSL


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def list_strategies() -> list[dict]:
    with SessionLocal() as db:
        rows = db.execute(select(Strategy).order_by(Strategy.created_at.desc())).scalars().all()
        return [
            {"id": r.id, "name": r.name, "dsl": r.dsl, "python_code": r.python_code, "created_at": r.created_at.isoformat()}
            for r in rows
        ]


def create_strategy(req: StrategyCreateRequest) -> dict:
    strategy_id = _uid("stg")
    dsl: StrategyDSL = req.dsl
    py = generate_python_code(req.name, dsl)
    with SessionLocal() as db:
        db.add(Strategy(id=strategy_id, name=req.name, dsl=dsl.model_dump(), python_code=py))
        db.commit()
    return {"id": strategy_id, "name": req.name, "dsl": dsl.model_dump(), "python_code": py}


class StrategyContext:
    def __init__(self, trade_date: str):
        self.trade_date = trade_date
        # AkShare 实时接口无需显式客户端

    def universe(self) -> pd.DataFrame:
        try:
            df = ak.stock_zh_a_spot_em()
        except Exception:
            return pd.DataFrame(columns=["ts_code", "name", "industry", "market"])
        df = df.rename(columns={"代码": "code", "名称": "name"})
        df["ts_code"] = df["code"].apply(lambda c: f"{c}.SH" if str(c).startswith("6") else f"{c}.SZ")
        df["industry"] = ""
        df["market"] = ""
        return df[["ts_code", "name", "industry", "market"]]

    def latest_daily_basic(self, universe: pd.DataFrame) -> pd.DataFrame:
        """使用 AkShare 实时行情近似 daily_basic。"""
        try:
            spot = ak.stock_zh_a_spot_em()
        except Exception:
            spot = None
        if spot is None or spot.empty:
            return pd.DataFrame(columns=["ts_code", "pe", "total_mv", "turnover_rate", "close", "pct_chg", "mcap_yi"])
        spot = spot.rename(
            columns={
                "代码": "code",
                "名称": "name",
                "最新价": "close",
                "涨跌幅": "pct_chg",
                "换手率": "turnover_rate",
                "市盈率-动态": "pe",
                "总市值": "total_mv",
            }
        )
        spot["ts_code"] = spot["code"].apply(lambda c: f"{c}.SH" if str(c).startswith("6") else f"{c}.SZ")
        out = spot.merge(universe[["ts_code", "name", "industry", "market"]], on="ts_code", how="left", suffixes=("", "_u"))
        out["mcap_yi"] = out["total_mv"].astype(float) / 1e8
        return out

    def apply_tech_filter(self, df: pd.DataFrame, tech: str) -> pd.DataFrame:
        # Demo: 技术条件用简化近似（避免对全市场逐只拉K线，后续可加批量缓存/分层筛选）
        if df.empty:
            return df
        if tech == "ma_up_5":
            # 近似：当日涨幅为正且换手较高
            return df[(df["pct_chg"] > 0) & (df["turnover_rate"] >= df["turnover_rate"].median())]
        if tech == "break_20d":
            # 近似：涨幅较强
            return df[df["pct_chg"] >= df["pct_chg"].quantile(0.75)]
        if tech == "rsi_oversold":
            # 近似：跌后反弹（pct_chg 小幅为正但 close 偏低无法直接取；先用低涨幅）
            return df[(df["pct_chg"] > 0) & (df["pct_chg"] < 2)]
        return df


def run_strategy(strategy_id: str) -> dict:
    with SessionLocal() as db:
        stg = db.execute(select(Strategy).where(Strategy.id == strategy_id)).scalar_one_or_none()
        if not stg:
            raise KeyError("not found")

    from datetime import datetime

    trade_date = datetime.now().strftime("%Y%m%d")

    # Execute stored python code in controlled globals
    ctx = StrategyContext(trade_date=trade_date)
    g = {"__builtins__": {"__import__": __import__}}  # minimal; allow imports
    l: dict = {}
    exec(stg.python_code, g, l)
    if "screen" not in l:
        raise RuntimeError("strategy code missing screen()")
    screen_fn = l["screen"]
    df = screen_fn(ctx)
    if not isinstance(df, pd.DataFrame):
        raise RuntimeError("screen() must return DataFrame")

    df = df.head(100)
    items = df.fillna("").to_dict(orient="records")
    result = {"trade_date": trade_date, "count": len(items), "items": items}

    run_id = _uid("run")
    with SessionLocal() as db:
        db.add(
            StrategyRun(
                id=run_id,
                strategy_id=strategy_id,
                params={"trade_date": trade_date},
                result=result,
            )
        )
        db.commit()
    return {"run_id": run_id, "result": result}


def run_dsl(dsl: StrategyDSL) -> dict:
    from datetime import datetime

    trade_date = datetime.now().strftime("%Y%m%d")

    py = generate_python_code("(draft)", dsl)
    ctx = StrategyContext(trade_date=trade_date)
    g = {"__builtins__": {"__import__": __import__}}
    l: dict = {}
    exec(py, g, l)
    screen_fn = l["screen"]
    df = screen_fn(ctx)
    df = df.head(100)
    items = df.fillna("").to_dict(orient="records")
    return {"result": {"trade_date": trade_date, "count": len(items), "items": items}, "python_code": py}


def strategy_runs(strategy_id: str, limit: int) -> list[dict]:
    with SessionLocal() as db:
        rows = (
            db.execute(
                select(StrategyRun)
                .where(StrategyRun.strategy_id == strategy_id)
                .order_by(StrategyRun.created_at.desc())
                .limit(max(1, min(100, limit)))
            )
            .scalars()
            .all()
        )
        return [
            {"id": r.id, "strategy_id": r.strategy_id, "params": r.params, "result": r.result, "created_at": r.created_at.isoformat()}
            for r in rows
        ]

