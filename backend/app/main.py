from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.workers.scheduler import scheduler

# Import API routers
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.workspaces import router as workspaces_router
from backend.app.api.v1.icps import router as icps_router
from backend.app.api.v1.leads import router as leads_router
from backend.app.api.v1.enrichment import router as enrichment_router
from backend.app.api.v1.conversations import router as conversations_router
from backend.app.api.v1.sequences import router as sequences_router
from backend.app.api.v1.calendar import router as calendar_router
from backend.app.api.v1.integrations import router as integrations_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.audit import router as audit_router
from backend.app.api.v1.search import router as search_router
from backend.app.api.v1.setup import router as setup_router
from backend.app.api.v1.webhooks import router as webhooks_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    await init_db()
    # Start background automation worker
    scheduler.start()
    yield
    # Shutdown
    scheduler.stop()

app = FastAPI(
    title="THREADLINE — AI Lead Generation & Outreach Automation Platform",
    description="Production-Grade Revenue Operations & Outbound Outreach Engine. Grounded AI Qualification, Real Integration Adapters, Conflict-Free Scheduling, and Explainable Decision Tracing.",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(workspaces_router, prefix=settings.API_V1_STR)
app.include_router(icps_router, prefix=settings.API_V1_STR)
app.include_router(leads_router, prefix=settings.API_V1_STR)
app.include_router(enrichment_router, prefix=settings.API_V1_STR)
app.include_router(conversations_router, prefix=settings.API_V1_STR)
app.include_router(sequences_router, prefix=settings.API_V1_STR)
app.include_router(calendar_router, prefix=settings.API_V1_STR)
app.include_router(integrations_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(setup_router, prefix=settings.API_V1_STR)
app.include_router(webhooks_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/", tags=["Health"])
async def root():
    return {
        "project": "THREADLINE",
        "tagline": "From first signal to booked conversation.",
        "status": "operational",
        "docs": f"{settings.API_V1_STR}/docs"
    }
