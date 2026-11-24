from typing import List, Optional
from datetime import datetime, timezone
from app.schemas.analytics import TaskDataPoint, ProjectHealthResponse

class HealthCalculator:
    @staticmethod
    def calculate(
        project_id: str,
        project_name: str,
        tasks: List[TaskDataPoint],
        target_date: Optional[datetime] = None
    ) -> ProjectHealthResponse:
        total_tasks = len(tasks)
        if total_tasks == 0:
            return ProjectHealthResponse(
                project_id=project_id,
                project_name=project_name,
                health_score=100.0,
                status="HEALTHY",
                total_tasks=0,
                completed_tasks=0,
                overdue_tasks=0,
                completion_rate_percentage=100.0,
                risk_factors=[],
                suggested_actions=["Create initial project milestones and tasks."]
            )

        now = datetime.now(timezone.utc)
        completed = 0
        overdue = 0
        urgent_open = 0
        risk_factors = []
        suggested_actions = []

        for task in tasks:
            is_done = task.status == "DONE"
            if is_done:
                completed += 1
            else:
                # Check overdue
                if task.due_date:
                    task_due = task.due_date if task.due_date.tzinfo else task.due_date.replace(tzinfo=timezone.utc)
                    if now > task_due:
                        overdue += 1
                if task.priority in ["HIGH", "URGENT"]:
                    urgent_open += 1

        completion_rate = (completed / total_tasks) * 100.0
        
        # Base score from completion
        score = completion_rate

        # Overdue penalty: each overdue task deducts 8 points
        overdue_penalty = (overdue / total_tasks) * 40.0
        score -= overdue_penalty

        # Urgent uncompleted tasks penalty
        urgent_penalty = (urgent_open / total_tasks) * 20.0
        score -= urgent_penalty

        # Target date schedule check
        if target_date:
            target_tz = target_date if target_date.tzinfo else target_date.replace(tzinfo=timezone.utc)
            if now > target_tz and completion_rate < 100:
                score -= 30.0
                risk_factors.append("Project has passed its designated target delivery date.")
                suggested_actions.append("Rebaseline delivery schedule and reprioritize pending scope.")

        # Add specific risk factors
        if overdue > 0:
            risk_factors.append(f"{overdue} task(s) are currently past their due date.")
            suggested_actions.append(f"Review and reassign the {overdue} overdue tasks.")

        if urgent_open > (total_tasks * 0.3):
            risk_factors.append("High proportion (>30%) of open tasks are marked High or Urgent priority.")
            suggested_actions.append("Hold a triage meeting to resolve blockers on urgent tasks.")

        # Clamp between 0.0 and 100.0
        final_score = max(0.0, min(100.0, round(score, 1)))

        if final_score >= 75.0:
            health_status = "HEALTHY"
        elif final_score >= 45.0:
            health_status = "AT_RISK"
        else:
            health_status = "CRITICAL"

        if not risk_factors:
            risk_factors.append("Tasks are progressing within healthy delivery velocity.")
            suggested_actions.append("Maintain current sprint velocity.")

        return ProjectHealthResponse(
            project_id=project_id,
            project_name=project_name,
            health_score=final_score,
            status=health_status,
            total_tasks=total_tasks,
            completed_tasks=completed,
            overdue_tasks=overdue,
            completion_rate_percentage=round(completion_rate, 1),
            risk_factors=risk_factors,
            suggested_actions=suggested_actions
        )
