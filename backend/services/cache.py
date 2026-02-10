from __future__ import annotations

import time
from typing import Any

from sqlalchemy import select

from backend.db import SessionLocal
from backend.models import CacheEntry


def cache_get(key: str) -> dict | None:
    now = int(time.time())
    with SessionLocal() as db:
        row = db.execute(select(CacheEntry).where(CacheEntry.key == key)).scalar_one_or_none()
        if not row:
            return None
        if row.expires_at <= now:
            try:
                db.delete(row)
                db.commit()
            except Exception:
                db.rollback()
            return None
        return row.payload


def cache_set(key: str, payload: dict, ttl_seconds: int) -> None:
    now = int(time.time())
    exp = now + max(1, ttl_seconds)
    with SessionLocal() as db:
        existing = db.execute(select(CacheEntry).where(CacheEntry.key == key)).scalar_one_or_none()
        if existing:
            existing.payload = payload
            existing.expires_at = exp
        else:
            db.add(CacheEntry(key=key, payload=payload, expires_at=exp))
        db.commit()

