from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.core.bootstrap import ensure_first_admin
from app.core.config import settings
from app.departments.router import router as departments_router
from app.users.router import router as users_router
from app.assets.router import router as assets_router
from app.borrowing.router import router as borrowing_router
from app.reports.router import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_first_admin()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(departments_router, prefix="/api/v1/departments", tags=["Departments"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(assets_router, prefix="/api/v1/assets", tags=["Assets"])
app.include_router(borrowing_router, prefix="/api/v1/borrowing", tags=["Borrowing"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Reports"])


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
