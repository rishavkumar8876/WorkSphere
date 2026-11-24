import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from app.main import app
from app.core.config import settings

client = TestClient(app)

API_KEY_HEADER = {"X-API-Key": settings.INTERNAL_API_KEY}

def test_liveness_and_readiness_probes():
    """Verify health endpoints respond without authentication."""
    res_live = client.get("/healthz")
    assert res_live.status_code == 200
    assert res_live.json()["status"] == "healthy"

    res_ready = client.get("/readyz")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "ready"

def test_service_authentication_enforcement():
    """Verify endpoints reject requests missing or using invalid service keys."""
    # 1. Missing header -> 401
    res_no_key = client.post("/api/v1/analytics/project-health", json={
        "project_id": "proj-1",
        "project_name": "Test Project",
        "tasks": []
    })
    assert res_no_key.status_code == 401

    # 2. Invalid key -> 403
    res_bad_key = client.post(
        "/api/v1/analytics/project-health",
        headers={"X-API-Key": "invalid_wrong_secret_key"},
        json={
            "project_id": "proj-1",
            "project_name": "Test Project",
            "tasks": []
        }
    )
    assert res_bad_key.status_code == 403

def test_project_health_calculation():
    """Verify health score penalizes overdue tasks and rewards completed work."""
    now = datetime.now(timezone.utc)
    
    tasks = [
        # Completed task
        {
            "id": "t1",
            "title": "Task 1",
            "status": "DONE",
            "priority": "MEDIUM",
            "created_at": (now - timedelta(days=5)).isoformat(),
            "completed_at": (now - timedelta(days=1)).isoformat()
        },
        # Overdue urgent task
        {
            "id": "t2",
            "title": "Task 2 (Overdue Block)",
            "status": "IN_PROGRESS",
            "priority": "URGENT",
            "created_at": (now - timedelta(days=10)).isoformat(),
            "due_date": (now - timedelta(days=2)).isoformat()
        },
        # Open task
        {
            "id": "t3",
            "title": "Task 3",
            "status": "TODO",
            "priority": "LOW",
            "created_at": (now - timedelta(days=1)).isoformat(),
            "due_date": (now + timedelta(days=5)).isoformat()
        }
    ]

    res = client.post(
        "/api/v1/analytics/project-health",
        headers=API_KEY_HEADER,
        json={
            "project_id": "proj-101",
            "project_name": "Rollout Sprint",
            "tasks": tasks
        }
    )

    assert res.status_code == 200
    data = res.json()
    assert data["project_id"] == "proj-101"
    assert data["total_tasks"] == 3
    assert data["completed_tasks"] == 1
    assert data["overdue_tasks"] == 1
    assert data["health_score"] < 75.0 # Penalized by overdue urgent task
    assert "1 task(s) are currently past their due date." in data["risk_factors"]

def test_team_workload_bottleneck_detection():
    """Verify overloaded team members are correctly detected."""
    now = datetime.now(timezone.utc)
    
    # Assign 9 active tasks to user-1 (exceeding limit of 8)
    tasks = []
    for i in range(9):
        tasks.append({
            "id": f"task-{i}",
            "title": f"Feature {i}",
            "status": "IN_PROGRESS",
            "priority": "HIGH" if i < 3 else "MEDIUM",
            "created_at": now.isoformat(),
            "assignee_id": "user-overloaded-1",
            "assignee_name": "Alex Busy"
        })
    
    # 1 unassigned task
    tasks.append({
        "id": "task-unassigned",
        "title": "Unassigned Bug",
        "status": "TODO",
        "priority": "LOW",
        "created_at": now.isoformat()
    })

    res = client.post(
        "/api/v1/analytics/team-workload",
        headers=API_KEY_HEADER,
        json={
            "organization_id": "org-1",
            "tasks": tasks
        }
    )

    assert res.status_code == 200
    data = res.json()
    assert data["unassigned_tasks"] == 1
    assert data["overloaded_members_count"] == 1
    assert data["members"][0]["utilization_status"] == "OVERLOADED"

def test_cycle_time_metrics():
    """Verify lead and cycle time calculations."""
    now = datetime.now(timezone.utc)
    tasks = [
        {
            "id": "c1",
            "title": "Task C1",
            "status": "DONE",
            "priority": "MEDIUM",
            "created_at": (now - timedelta(days=10)).isoformat(),
            "started_at": (now - timedelta(days=4)).isoformat(),
            "completed_at": now.isoformat()
        },
        {
            "id": "c2",
            "title": "Task C2",
            "status": "DONE",
            "priority": "HIGH",
            "created_at": (now - timedelta(days=6)).isoformat(),
            "started_at": (now - timedelta(days=2)).isoformat(),
            "completed_at": now.isoformat()
        }
    ]

    res = client.post(
        "/api/v1/analytics/cycle-time",
        headers=API_KEY_HEADER,
        json={
            "project_id": "proj-cycle",
            "tasks": tasks
        }
    )

    assert res.status_code == 200
    data = res.json()
    assert data["sample_size"] == 2
    assert data["avg_cycle_time_days"] > 0
    assert data["median_cycle_time_days"] > 0

def test_streaming_csv_export():
    """Assessment 05: Verify chunked streaming CSV generation."""
    records = [
        {"id": "rec-1", "action": "CREATE", "user": "alice", "timestamp": "2026-11-24T10:00:00Z"},
        {"id": "rec-2", "action": "UPDATE", "user": "bob", "timestamp": "2026-11-24T11:00:00Z"},
    ]

    res = client.post(
        "/api/v1/analytics/export/csv?filename=activity.csv",
        headers=API_KEY_HEADER,
        json=records
    )

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    content = res.text
    assert "id,action,user,timestamp" in content
    assert "rec-1,CREATE,alice" in content
