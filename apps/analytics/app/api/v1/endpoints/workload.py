from fastapi import APIRouter, Depends
from app.schemas.analytics import TeamWorkloadRequest, TeamWorkloadResponse, MemberWorkloadDetail
from app.core.security import verify_service_api_key
from collections import defaultdict
from datetime import datetime, timezone
import statistics

router = APIRouter()

@router.post(
    "/team-workload",
    response_model=TeamWorkloadResponse,
    dependencies=[Depends(verify_service_api_key)],
    summary="Compute Team Workload & Bottleneck Distribution"
)
async def compute_team_workload(payload: TeamWorkloadRequest):
    now = datetime.now(timezone.utc)
    members_map = defaultdict(lambda: {"name": "Unassigned", "total": 0, "in_progress": 0, "overdue": 0, "urgent": 0})
    unassigned = 0

    for task in payload.tasks:
        if task.status == "DONE":
            continue
            
        if not task.assignee_id:
            unassigned += 1
            continue

        m = members_map[task.assignee_id]
        if task.assignee_name:
            m["name"] = task.assignee_name
        m["total"] += 1
        if task.status == "IN_PROGRESS":
            m["in_progress"] += 1
        if task.priority in ["HIGH", "URGENT"]:
            m["urgent"] += 1
        if task.due_date:
            due_tz = task.due_date if task.due_date.tzinfo else task.due_date.replace(tzinfo=timezone.utc)
            if now > due_tz:
                m["overdue"] += 1

    details: list[MemberWorkloadDetail] = []
    totals = []
    overloaded = 0

    for aid, data in members_map.items():
        total = data["total"]
        totals.append(total)
        
        # Determine status: overloaded if > 8 active tasks or > 3 urgent
        if total > 8 or data["urgent"] >= 3:
            status = "OVERLOADED"
            overloaded += 1
        elif total < 2:
            status = "UNDERUTILIZED"
        else:
            status = "BALANCED"

        details.append(
            MemberWorkloadDetail(
                assignee_id=aid,
                assignee_name=data["name"],
                total_assigned=total,
                in_progress=data["in_progress"],
                overdue=data["overdue"],
                urgent_or_high=data["urgent"],
                utilization_status=status
            )
        )

    variance = round(statistics.variance(totals) if len(totals) > 1 else 0.0, 2)

    return TeamWorkloadResponse(
        organization_id=payload.organization_id,
        total_active_tasks=sum(totals) + unassigned,
        unassigned_tasks=unassigned,
        members=details,
        overloaded_members_count=overloaded,
        workload_distribution_variance=variance
    )
