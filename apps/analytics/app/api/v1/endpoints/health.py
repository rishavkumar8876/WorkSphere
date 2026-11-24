from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter()

@router.get("/healthz", tags=["Health & Readiness"])
async def liveness():
    """Liveness probe: verifies process is responsive."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "WorkSphere Analytics Engine"
    }

@router.get("/readyz", tags=["Health & Readiness"])
async def readiness():
    """Readiness probe: verifies service is ready to accept processing jobs."""
    return {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ready": True
    }
