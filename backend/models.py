from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.db import Base


class Strategy(Base):
    __tablename__ = "strategies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    dsl: Mapped[dict] = mapped_column(JSON, nullable=False)
    python_code: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class StrategyRun(Base):
    __tablename__ = "strategy_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    strategy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    params: Mapped[dict] = mapped_column(JSON, nullable=False)
    result: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class CacheEntry(Base):
    __tablename__ = "cache"

    key: Mapped[str] = mapped_column(String(240), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    expires_at: Mapped[int] = mapped_column(Integer, nullable=False)  # epoch seconds
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

