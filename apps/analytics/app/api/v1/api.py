from fastapi import APIRouter
from app.api.v1.endpoints import health, project_health, workload, cycle_time, exports

api_router = APIRouter()

# Health & readiness
api_router.include_router(health.router)

# Analytics endpoints
api_router.include_router(project_health.router, prefix="/analytics")
api_router.include_router(workload.router, prefix="/analytics")
api_router.include_router(cycle_time.router, prefix="/analytics")
api_router.include_router(exports.router, prefix="/analytics")
