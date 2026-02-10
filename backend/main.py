from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.db import init_db
from backend.routers import market, stocks, strategies


def create_app() -> FastAPI:
    init_db()

    app = FastAPI(title="stockAnalysis API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(market.router, prefix="/api")
    app.include_router(stocks.router, prefix="/api")
    app.include_router(strategies.router, prefix="/api")

    # Serve current project root as static (demo convenience)
    app.mount("/", StaticFiles(directory=".", html=True), name="static")
    return app


app = create_app()

