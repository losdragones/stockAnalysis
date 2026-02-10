from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

import pandas as pd

from backend.services.stocks import get_kline
from backend.services.strategy_dsl import StrategyDSL


def _yyyymmdd(d: datetime) -> str:
    return d.strftime("%Y%m%d")


def compute_strategy_events(ts_code: str, dsl: StrategyDSL, days: int) -> dict:
    """Compute simple buy/sell events from real kline.

    This is a demo-grade signal engine:
    - Buy: close crosses above MA5 and MA5 slope positive (or tech trigger override)
    - Sell: close crosses below MA10, or stop loss / take profit from last entry
    """
    days = max(20, min(400, int(days)))
    end = datetime.now()
    start = end - timedelta(days=int(days * 1.8))
    bars = get_kline(ts_code, _yyyymmdd(start), _yyyymmdd(end), adj="qfq")
    if not bars:
        return {"ts_code": ts_code, "events": []}

    df = pd.DataFrame(bars)
    df["date"] = pd.to_datetime(df["t"])
    df = df.sort_values("date")
    df["close"] = df["c"].astype(float)
    df["ma5"] = df["close"].rolling(5).mean()
    df["ma10"] = df["close"].rolling(10).mean()
    df["ma5_slope"] = df["ma5"].diff()

    events: list[dict] = []
    entry_price: float | None = None
    entry_date: datetime | None = None

    tp = dsl.exits.takeProfitPct
    sl = dsl.exits.stopLossPct

    for i in range(1, len(df)):
        r0 = df.iloc[i - 1]
        r1 = df.iloc[i]
        if pd.isna(r1["ma5"]) or pd.isna(r1["ma10"]):
            continue

        date = r1["date"]
        close0 = float(r0["close"])
        close1 = float(r1["close"])

        # Buy trigger
        cross_up_ma5 = close0 <= float(r0["ma5"]) and close1 > float(r1["ma5"])
        buy_ok = cross_up_ma5 and float(r1["ma5_slope"] or 0) > 0

        # Tech override: break_20d or rsi_oversold are approximated by price momentum
        if dsl.filters.tech == "break_20d":
            window = df.iloc[max(0, i - 20) : i]
            if len(window) >= 10 and close1 >= float(window["close"].max()):
                buy_ok = True
        if dsl.filters.tech == "rsi_oversold":
            # Approx: 3-day rebound after 10-day drawdown
            window = df.iloc[max(0, i - 10) : i]
            if len(window) >= 8 and close1 > close0 and close1 >= float(window["close"].min()) * 1.03:
                buy_ok = True

        if entry_price is None and buy_ok:
            entry_price = close1
            entry_date = date
            events.append(
                {
                    "type": "buy",
                    "date": date.strftime("%Y-%m-%d"),
                    "price": round(close1, 3),
                    "title": "买入触发",
                    "desc": "价格上穿MA5且MA5上行（或技术触发近似）。",
                }
            )
            continue

        if entry_price is not None:
            # Take profit / stop loss
            if tp is not None and close1 >= entry_price * (1 + float(tp) / 100.0):
                events.append(
                    {
                        "type": "sell",
                        "date": date.strftime("%Y-%m-%d"),
                        "price": round(close1, 3),
                        "title": "止盈触发",
                        "desc": f"达到止盈 {tp}%。",
                    }
                )
                entry_price = None
                entry_date = None
                continue
            if sl is not None and close1 <= entry_price * (1 + float(sl) / 100.0):
                events.append(
                    {
                        "type": "sell",
                        "date": date.strftime("%Y-%m-%d"),
                        "price": round(close1, 3),
                        "title": "止损触发",
                        "desc": f"达到止损 {sl}%。",
                    }
                )
                entry_price = None
                entry_date = None
                continue

            # Exit pattern: close below MA10
            exit_by_ma10 = close0 >= float(r0["ma10"]) and close1 < float(r1["ma10"])
            if dsl.exits.exitPattern == "close_below_ma10" and exit_by_ma10:
                events.append(
                    {
                        "type": "sell",
                        "date": date.strftime("%Y-%m-%d"),
                        "price": round(close1, 3),
                        "title": "形态退出",
                        "desc": "收盘跌破MA10。",
                    }
                )
                entry_price = None
                entry_date = None
                continue

            # Default light note
            if (date - (entry_date or date)).days >= 15:
                events.append(
                    {
                        "type": "note",
                        "date": date.strftime("%Y-%m-%d"),
                        "price": round(close1, 3),
                        "title": "持仓观察",
                        "desc": "持仓超过两周，关注趋势延续与量能。",
                    }
                )
                entry_date = date  # throttle notes

    # keep only last ~30 events
    events = events[-30:]
    return {"ts_code": ts_code, "events": events}

