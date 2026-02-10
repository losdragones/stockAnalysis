from __future__ import annotations

import os
from dataclasses import dataclass


# 注意：这里硬编码了你的 TuShare token，只适合本地开发/小范围内测。
# 如果以后把代码推到公网仓库，请务必改回读取环境变量，并删除明文 token。
TUSHARE_TOKEN_HARDCODED = "cbc048eef469cf5f482bdb52d7b67bd0cf4c537cc74e4e7623bb1e5e"


@dataclass(frozen=True)
class Settings:
    tushare_token: str | None
    db_url: str
    cache_default_ttl_seconds: int


def get_settings() -> Settings:
    # 先看环境变量，没有再退回到硬编码 token
    token = os.environ.get("TUSHARE_TOKEN") or TUSHARE_TOKEN_HARDCODED
    # SQLite file in project root by default
    db_path = os.environ.get("STOCKANALYSIS_DB", "stockanalysis.sqlite3")
    db_url = f"sqlite:///{db_path}"
    ttl = int(os.environ.get("CACHE_TTL_SECONDS", "900"))
    return Settings(
        tushare_token=token.strip() if token else None,
        db_url=db_url,
        cache_default_ttl_seconds=ttl,
    )

