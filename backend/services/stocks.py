from __future__ import annotations

import akshare as ak
import pandas as pd

from backend.services.cache import cache_get, cache_set
from backend.settings import get_settings


def _cache_ttl() -> int:
    return get_settings().cache_default_ttl_seconds


def _spot_cached() -> pd.DataFrame:
    """缓存 AkShare 实时行情，用于搜索和基础信息。"""
    key = "akshare:stock_zh_a_spot_em:v1"
    cached = cache_get(key)
    if cached and "rows" in cached:
        return pd.DataFrame(cached["rows"])

    try:
        df = ak.stock_zh_a_spot_em()
        print(f"[stocks._spot_cached] fetched rows={len(df)}")
    except Exception as e:
        print(f"[stocks._spot_cached] AkShare spot error: {e}")
        return pd.DataFrame(
            columns=["代码", "名称", "最新价", "涨跌幅", "成交量", "成交额", "换手率", "市盈率-动态", "总市值"]
        )
    rows = df.to_dict(orient="records")
    cache_set(key, {"rows": rows}, ttl_seconds=30)
    return df


def _code_to_ts(code: str) -> str:
    code = str(code)
    if len(code) == 6 and code.startswith("6"):
        return f"{code}.SH"
    if len(code) == 6 and (code.startswith("0") or code.startswith("3")):
        return f"{code}.SZ"
    return code


def search_stocks(q: str) -> list[dict]:
    q = (q or "").strip().lower()
    df = _spot_cached()
    if df.empty:
        return []
    df = df.rename(columns={"代码": "code", "名称": "name", "最新价": "price", "涨跌幅": "pct_chg"})
    df["ts_code"] = df["code"].apply(_code_to_ts)
    if q:
        mask = (
            df["ts_code"].str.lower().str.contains(q)
            | df["code"].astype(str).str.lower().str.contains(q)
            | df["name"].astype(str).str.lower().str.contains(q)
        )
        df = df[mask]
    df = df.head(50)
    return df[["ts_code", "code", "name", "price", "pct_chg"]].to_dict(orient="records")


def stock_profile(ts_code: str) -> dict | None:
    try:
        symbol = ts_code.split(".")[0]
    except Exception:
        symbol = ts_code
    try:
        info = ak.stock_individual_info_em(symbol=symbol)
    except Exception:
        info = None
    base = {"ts_code": ts_code, "code": symbol, "name": "", "industry": "", "area": "", "market": ""}
    if info is not None and not info.empty:
        mapping = {row["item"]: row["value"] for _, row in info.iterrows()}
        base["name"] = mapping.get("股票简称", "") or mapping.get("名称", "")
        base["industry"] = mapping.get("行业", "") or ""
    return base


def get_kline(ts_code: str, start: str, end: str, adj: str) -> list[dict]:
    key = f"akshare:kline:v1:{ts_code}:{start}:{end}:{adj}"
    cached = cache_get(key)
    if cached and "bars" in cached:
        return cached["bars"]

    symbol = ts_code.split(".")[0]
    adjust = "qfq" if adj == "qfq" else ""
    try:
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start, end_date=end, adjust=adjust)
        print(f"[stocks.get_kline] {ts_code} hist rows={len(df)}")
    except Exception as e:
        print(f"[stocks.get_kline] AkShare hist error: {e}")
        df = None
    if df is None or df.empty:
        bars: list[dict] = []
        cache_set(key, {"bars": bars}, ttl_seconds=60)
        return bars

    df = df.sort_values("日期")
    bars = [
        {
            "t": row["日期"].replace("-", ""),
            "o": float(row["开盘"]),
            "h": float(row["最高"]),
            "l": float(row["最低"]),
            "c": float(row["收盘"]),
            "v": float(row.get("成交量", 0) or 0.0),
            "a": float(row.get("成交额", 0) or 0.0),
        }
        for _, row in df.iterrows()
    ]
    cache_set(key, {"bars": bars}, ttl_seconds=_cache_ttl())
    return bars

