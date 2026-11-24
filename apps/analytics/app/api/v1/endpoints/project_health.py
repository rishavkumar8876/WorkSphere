from fastapi import APIRouter, Depends
from app.schemas.analytics import ProjectHealthRequest, ProjectHealthResponse
from app.services.health_calculator import HealthCalculator
from app.core.security import verify_service_api_key

router = APIRouter()

@router.post(
    "/project-health",
    response_model=ProjectHealthResponse,
    dependencies=[Depends(verify_service_api_key)],
    summary="Compute Project Delivery Health & Risk Analysis"
)
async def compute_project_health(payload: ProjectHealthRequest):
    """
    Computes a 0-100 project health score, velocity rate, overdue risk penalties,
    and returns actionable triage suggestions for project managers.
    """
    return HealthCalculator.calculate(
        project_id=payload.project_id,
        project_name=payload.project_name,
        tasks=payload.tasks,
        target_date=payload.target_date
    )
