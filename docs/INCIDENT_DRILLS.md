# WorkSphere Incident Drills & Disaster Recovery Playbook

This document details the 6 mandatory operational incident response drills for WorkSphere (**Assessment 15**), covering diagnosis, log analysis, mitigation, and post-mortem Root Cause Analysis (RCA).

---

## Incident Drill 1: Redis Outage During Notification Burst

### 1. Scenario
Redis service becomes unreachable or restarts while users are rapidly moving tasks on Kanban boards.

### 2. Failure Simulation
```bash
# Terminate Redis container to simulate unexpected outage
docker stop worksphere-redis
```

### 3. Observed Behavior & Error Signatures
- **Express Logs:**
  `[warn]: Redis connection status: connect ECONNREFUSED 127.0.0.1:6379`
- **Application Impact:**
  - REST API operations (task CRUD, auth) continue functioning via PostgreSQL.
  - Background notification queuing is gracefully logged as a non-fatal warning without crashing user requests.
  - Socket.IO gracefully degrades to in-memory room broadcast for single-instance setups.

### 4. Recovery & Verification
```bash
# Restore Redis container
docker start worksphere-redis
```
- **Recovery Log:**
  `[info]: Connected to Redis for background jobs and caching.`
- **Idempotency Proof:** BullMQ retries queued jobs without duplicating notifications due to deterministic `jobId` deduplication keys.

---

## Incident Drill 2: Simultaneous Task Updates (Optimistic Concurrency Control Collision)

### 1. Scenario
Two users (e.g. Alice and Bob) open the same task (`task-100` at `version: 1`). Alice moves the task to "In Progress", bumping the server version to `2`. Bob then submits an update from his stale screen.

### 2. Failure Simulation
```bash
# 1. Alice updates task at version 1 (Succeeds, returns version 2)
curl -X PATCH http://localhost:5000/api/v1/tasks/10000000-0000-0000-0000-000000000100 \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS", "version": 1}'

# 2. Bob simultaneously attempts update still referencing version 1
curl -X PATCH http://localhost:5000/api/v1/tasks/10000000-0000-0000-0000-000000000100 \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "DONE", "version": 1}'
```

### 3. Observed Behavior
- **HTTP Response to Bob:** `409 Conflict`
```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Concurrency Conflict: Task has been updated by another user (current version: 2).",
    "details": {
      "id": "10000000-0000-0000-0000-000000000100",
      "version": 2,
      "status": "IN_PROGRESS"
    }
  }
}
```
- **UI Resolution:** Next.js frontend automatically intercepts the 409 status code and displays the `OCCConflictModal`, allowing Bob to inspect the diff and merge without losing work.

---

## Incident Drill 3: Cross-Tenant Data Access Breach Simulation

### 1. Scenario
An attacker or malicious user belonging to **Tenant B** attempts to query or mutate tasks belonging to **Tenant A** by spoofing the `x-organization-id` header or URL parameters.

### 2. Failure Simulation
```bash
# User from Tenant B targets Tenant A's project
curl -X GET http://localhost:5000/api/v1/tasks/10000000-0000-0000-0000-000000000100 \
  -H "Authorization: Bearer $TENANT_B_TOKEN" \
  -H "x-organization-id: org-aaa-111"
```

### 3. Observed Behavior & Security Log
- **HTTP Response:** `403 Forbidden`
```json
{
  "success": false,
  "error": {
    "code": "CROSS_TENANT_FORBIDDEN",
    "message": "Cross-tenant access violation: You are not authorized to access this organization."
  }
}
```
- **Security Audit Alert Log:**
  `[warn]: Cross-tenant access attempt blocked { userId: 'user-b', userTenant: 'org-bbb-222', attemptedTenant: 'org-aaa-111', ip: '127.0.0.1' }`

---

## Incident Drill 4: Refresh Token Reuse Detection (Session Hijack Prevention)

### 1. Scenario
An attacker intercepts an old, already-used refresh token and attempts to replay it to generate a new access token.

### 2. Mitigation Behavior
- The `AuthService.refreshTokens` engine detects that `storedToken.isRevoked === true`.
- **Family Revocation:** The server revokes all tokens matching the `familyId`.
- **Response:** `401 Unauthorized` (`TOKEN_REUSE_DETECTED`).
- The legitimate user's compromised session is forcefully terminated, requiring re-login with credentials.

---

## Incident Drill 5: Duplicate Job Execution & Retry Storm Prevention

### 1. Scenario
A worker process crashes while processing a notification email, causing BullMQ to retry the job upon worker restart.

### 2. Mitigation Behavior
- Every enqueued job is assigned a deterministic `jobId`:
  `jobId = "notif-task-${taskId}-v${version}-${userId}"`
- BullMQ checks the Redis set; if the `jobId` already exists, duplicate enqueue is rejected.
- Workers record delivery state in Redis before sending external communications.

---

## Root Cause Analysis (RCA) Standard Form

| Field | Detail |
| :--- | :--- |
| **Incident Title** | [Title] |
| **Severity Level** | P1 (Critical) / P2 (High) / P3 (Moderate) |
| **Detection Time** | YYYY-MM-DD HH:MM UTC |
| **Resolution Time** | YYYY-MM-DD HH:MM UTC |
| **Root Cause** | Detailed description of the underlying system trigger |
| **Corrective Action** | Immediate architectural patch or configuration update |
| **Preventative Action** | Added automated regression test & alerting threshold |
