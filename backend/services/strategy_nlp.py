from __future__ import annotations

import re

from backend.services.strategy_dsl import StrategyDSL


def parse_nl_to_dsl(text: str) -> dict:
    t = (text or "").strip()
    dsl = StrategyDSL()
    if not t:
        return {"dsl": dsl.model_dump()}

    # 宽松解析，允许缺省
    m = re.search(r"(?:pe|市盈率)\s*(?:小于|低于|<=|≤|不超过|<)\s*([0-9]+(?:\.[0-9]+)?)", t, re.I)
    if m:
        dsl.filters.peMax = float(m.group(1))

    m = re.search(r"(?:市值)\s*(?:小于|低于|<=|≤|不超过|<)\s*([0-9]+(?:\.[0-9]+)?)\s*(亿|亿元)?", t)
    if m:
        dsl.filters.mcapMaxYi = float(m.group(1))

    m = re.search(r"(?:换手)\s*(?:大于|高于|>=|≥|不少于|>)\s*([0-9]+(?:\.[0-9]+)?)\s*%?", t)
    if m:
        dsl.filters.turnMinPct = float(m.group(1))

    if re.search(r"(5日|五日).*(均线|ma).*(向上|上行)", t):
        dsl.filters.tech = "ma_up_5"
    if re.search(r"(突破).*(20日|二十日).*(高点|新高)", t):
        dsl.filters.tech = "break_20d"
    if re.search(r"(rsi|超卖).*(回升|反弹)", t, re.I):
        dsl.filters.tech = "rsi_oversold"

    m = re.search(r"(?:止盈)\s*([+\\-]?\\d+(?:\\.\\d+)?)\\s*%?", t)
    if m:
        dsl.exits.takeProfitPct = float(m.group(1))

    m = re.search(r"(?:止损)\s*([+\\-]?\\d+(?:\\.\\d+)?)\\s*%?", t)
    if m:
        dsl.exits.stopLossPct = float(m.group(1))

    if re.search(r"(跌破).*(10日|十日).*(线|均线)", t):
        dsl.exits.exitPattern = "close_below_ma10"
    if re.search(r"(看跌吞没|吞没形态)", t):
        dsl.exits.exitPattern = "bearish_engulfing"
    if re.search(r"(放量).*(下破|破位)", t):
        dsl.exits.exitPattern = "volume_breakdown"

    return {"dsl": dsl.model_dump()}

