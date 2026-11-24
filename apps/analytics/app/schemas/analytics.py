from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class TaskDataPoint(BaseModel):
    id: str
    title: str
    status: str # BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE
    priority: str # LOW, MEDIUM, HIGH, URGENT
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None

class ProjectHealthRequest(BaseModel):
    project_id: str
    project_name: str
    tasks: List[TaskDataPoint]
    target_date: Optional[datetime] = None

class ProjectHealthResponse(BaseModel):
    project_id: str
    project_name: str
    health_score: float = Field(..., ge=0, le=100, description="Health score 0 to 100")
    status: str = Field(..., description="HEALTHY, AT_RISK, or CRITICAL")
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int
    completion_rate_percentage: float
    risk_factors: List[str]
    suggested_actions: List[str]

class TeamWorkloadRequest(BaseModel):
    organization_id: str
    tasks: List[TaskDataPoint]

class MemberWorkloadDetail(BaseModel):
    assignee_id: str
    assignee_name: str
    total_assigned: int
    in_progress: int
    overdue: int
    urgent_or_high: int
    utilization_status: str # UNDERUTILIZED, BALANCED, OVERLOADED

class TeamWorkloadResponse(BaseModel):
    organization_id: str
    total_active_tasks: int
    unassigned_tasks: int
    members: List[MemberWorkloadDetail]
    overloaded_members_count: int
    workload_distribution_variance: float

class CycleTimeRequest(BaseModel):
    project_id: str
    tasks: List[TaskDataPoint]

class CycleTimeResponse(BaseModel):
    project_id: str
    sample_size: int
    avg_cycle_time_days: float
    median_cycle_time_days: float
    p90_cycle_time_days: float
    avg_lead_time_days: float
    fastest_task_days: float
    slowest_task_days: float
