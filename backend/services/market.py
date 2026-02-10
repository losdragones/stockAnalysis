from __future__ import annotations

import math

import akshare as ak

from backend.services.cache import cache_get, cache_set
from backend.settings import get_settings


# 上证指数、深成指、创业板指在东方财富的代码
INDEX_CODES = [
    ("000001", "上证", "sh000001"),
    ("399001", "深成", "sz399001"),
    ("399006", "创业板", "sz399006"),
]


def market_overview(date: str | None):
    # 这里 date 仅用于 cache key，不直接参与 AkShare 实时指数查询
    key = f"akshare:market_overview:v1:{date or 'latest'}"
    cached = cache_get(key)
    if cached:
        return cached

    print("[market_overview] fetching indices via AkShare…")
    indices: list[dict] = []
    try:
        df = ak.stock_zh_index_spot_em()
        print(f"[market_overview] stock_zh_index_spot_em rows={len(df)}")
    except Exception as e:
        print(f"[market_overview] AkShare index fetch error: {e}")
        df = None

    if df is not None:
        # df 列通常包含: 代码, 名称, 最新价, 涨跌幅, 成交量, 成交额 等（列名为中文）
        code_col = "代码"
        name_col = "名称"
        latest_col = "最新价"
        pct_col = "涨跌幅"
        vol_col = "成交量"
        amount_col = "成交额"

        for base_code, cname, em_code in INDEX_CODES:
            row = df[df[code_col] == em_code]
            if row.empty:
                indices.append({"name": cname, "ts_code": base_code, "close": None, "pct_chg": None})
            else:
                r = row.iloc[0]
                indices.append(
                    {
                        "name": cname,
                        "ts_code": base_code,
                        "close": float(r[latest_col]),
                        "pct_chg": float(r[pct_col]),
                        "vol": float(r.get(vol_col, 0) or 0),
                        "amount": float(r.get(amount_col, 0) or 0),
                    }
                )

    # 若指数数据全部缺失，则退回到简单 mock（满足“不能获取的使用 mock”的需求）
    if not indices or not any(i.get("close") is not None for i in indices):
        indices = [
            {"name": "上证", "ts_code": "000001", "close": 3200.0, "pct_chg": 0.5, "vol": 0.0, "amount": 0.0},
            {"name": "深成", "ts_code": "399001", "close": 10500.0, "pct_chg": 0.8, "vol": 0.0, "amount": 0.0},
            {"name": "创业板", "ts_code": "399006", "close": 2100.0, "pct_chg": 1.2, "vol": 0.0, "amount": 0.0},
        ]

    turnover = sum(i.get("amount", 0) or 0 for i in indices) / 1e5
    vol_intensity = clamp_int(abs(indices[0].get("pct_chg") or 0) * 10 + abs(indices[2].get("pct_chg") or 0) * 8, 5, 95)

    payload = {
        "trade_date": date or "",
        "indices": indices,
        "turnover_yi": round(turnover, 1) if turnover else None,
        "sentiment": {
            "score": mock_sentiment_score(indices),
            "adv": None,
            "decl": None,
            "limit_up": None,
            "limit_down": None,
            "volume_change_pct": None,
        },
        "sectors": mock_sectors(indices),
        "vol_intensity": vol_intensity,
        "mock": df is None,
    }

    cache_set(key, payload, ttl_seconds=get_settings().cache_default_ttl_seconds)
    print(f"[market_overview] payload indices={len(indices)} mock={payload['mock']}")
    return payload


def clamp_int(x: float, a: int, b: int) -> int:
    return int(max(a, min(b, round(x))))


def mock_sentiment_score(indices: list[dict]) -> int:
    # 用指数涨跌近似情绪（demo阶段）
    vals = [i.get("pct_chg") for i in indices if isinstance(i.get("pct_chg"), (int, float))]
    if not vals:
        return 50
    avg = sum(vals) / len(vals)
    score = 50 + avg * 12
    return int(max(5, min(95, round(score))))


def mock_sectors(indices: list[dict]) -> list[dict]:
    # 先 mock；后续可接入 TuShare 行业/概念口径或其它公开源
    base = mock_sentiment_score(indices)
    return [
        {"name": "AI应用", "gain_pct": round((base - 45) / 12, 2), "money_yi": round((base - 50) / 1.8, 1)},
        {"name": "半导体", "gain_pct": round((base - 50) / 13, 2), "money_yi": round((base - 52) / 2.0, 1)},
        {"name": "医药", "gain_pct": round((55 - base) / 16, 2), "money_yi": round((50 - base) / 2.2, 1)},
        {"name": "新能源", "gain_pct": round((base - 54) / 15, 2), "money_yi": round((base - 58) / 2.0, 1)},
        {"name": "券商", "gain_pct": round((base - 48) / 10, 2), "money_yi": round((base - 50) / 1.6, 1)},
    ]

