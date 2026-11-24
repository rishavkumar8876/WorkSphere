from fastapi import APIRouter, Depends
from app.schemas.analytics import CycleTimeRequest, CycleTimeResponse
from app.services.cycle_time_service import CycleTimeService
from app.core.security import verify_service_api_key

router = APIRouter()

@router.post(
    "/cycle-time",
    response_model=CycleTimeResponse,
    dependencies=[Depends(verify_service_api_key)],
    summary="Compute Lead & Cycle-Time Metrics"
)
async def compute_cycle_time(payload: CycleTimeRequest):
    return CycleTimeService.calculate(
        project_id=payload.project_id,
        tasks=payload.tasks
    )
