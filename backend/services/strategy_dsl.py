from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


TechTrigger = Literal["", "ma_up_5", "break_20d", "rsi_oversold"]
ExitPattern = Literal["", "close_below_ma10", "bearish_engulfing", "volume_breakdown"]


class StrategyFilters(BaseModel):
    peMax: float | None = None
    mcapMaxYi: float | None = None
    turnMinPct: float | None = None
    tech: TechTrigger = ""
    note: str = ""


class StrategyExits(BaseModel):
    takeProfitPct: float | None = None
    stopLossPct: float | None = None
    exitPattern: ExitPattern = ""


class StrategyDSL(BaseModel):
    version: int = 1
    universe: str = "A"
    filters: StrategyFilters = Field(default_factory=StrategyFilters)
    exits: StrategyExits = Field(default_factory=StrategyExits)


class StrategyNLParseRequest(BaseModel):
    text: str


class StrategyCreateRequest(BaseModel):
    name: str
    dsl: StrategyDSL

