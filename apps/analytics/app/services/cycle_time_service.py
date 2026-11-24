from typing import List
from datetime import timezone
from app.schemas.analytics import TaskDataPoint, CycleTimeResponse
import statistics

class CycleTimeService:
    @staticmethod
    def calculate(project_id: str, tasks: List[TaskDataPoint]) -> CycleTimeResponse:
        completed_tasks = [t for t in tasks if t.status == "DONE" and t.completed_at]
        
        if not completed_tasks:
            return CycleTimeResponse(
                project_id=project_id,
                sample_size=0,
                avg_cycle_time_days=0.0,
                median_cycle_time_days=0.0,
                p90_cycle_time_days=0.0,
                avg_lead_time_days=0.0,
                fastest_task_days=0.0,
                slowest_task_days=0.0
            )

        cycle_times = []
        lead_times = []

        for t in completed_tasks:
            comp_tz = t.completed_at if t.completed_at.tzinfo else t.completed_at.replace(tzinfo=timezone.utc)
            creat_tz = t.created_at if t.created_at.tzinfo else t.created_at.replace(tzinfo=timezone.utc)
            
            lead_days = (comp_tz - creat_tz).total_seconds() / 86400.0
            lead_times.append(max(0.01, lead_days))

            if t.started_at:
                start_tz = t.started_at if t.started_at.tzinfo else t.started_at.replace(tzinfo=timezone.utc)
                cycle_days = (comp_tz - start_tz).total_seconds() / 86400.0
                cycle_times.append(max(0.01, cycle_days))
            else:
                cycle_times.append(max(0.01, lead_days))

        cycle_times.sort()
        count = len(cycle_times)
        
        avg_cycle = statistics.mean(cycle_times)
        median_cycle = statistics.median(cycle_times)
        
        # 90th percentile
        p90_index = int(0.9 * count)
        p90_cycle = cycle_times[min(p90_index, count - 1)]
        
        avg_lead = statistics.mean(lead_times)
        fastest = min(cycle_times)
        slowest = max(cycle_times)

        return CycleTimeResponse(
            project_id=project_id,
            sample_size=count,
            avg_cycle_time_days=round(avg_cycle, 2),
            median_cycle_time_days=round(median_cycle, 2),
            p90_cycle_time_days=round(p90_cycle, 2),
            avg_lead_time_days=round(avg_lead, 2),
            fastest_task_days=round(fastest, 2),
            slowest_task_days=round(slowest, 2)
        )
