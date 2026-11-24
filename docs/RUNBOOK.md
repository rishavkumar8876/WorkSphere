# WorkSphere Operational Runbook & Execution Guide

## 1. Prerequisites
- **Node.js**: v20+ or v22 LTS (`node -v`)
- **Python**: 3.12+ (`python --version`)
- **Docker & Docker Compose**: Docker 26+ (`docker --version`, `docker-compose version`)
- **Git**: 2.40+

---

## 2. Environment Setup

Copy the master environment template:
```bash
cp .env.example .env
```

---

## 3. Running Services Locally

### Step 1: Start PostgreSQL and Redis Containers
```bash
docker-compose -f docker/docker-compose.yml up -d
```

### Step 2: Install Monorepo Dependencies
```bash
npm install
```

### Step 3: Compile Shared Packages & Prisma Client
```bash
npm run build --workspace=packages/shared-types
npx prisma generate --schema=apps/api/prisma/schema.prisma
```

### Step 4: Run Migrations & Seed Database
```bash
npm run prisma:migrate --workspace=apps/api
npm run prisma:seed --workspace=apps/api
```

### Step 5: Start All Application Services
In separate terminal windows:
```bash
# Terminal 1: Express Core API (Port 5000)
npm run dev:api

# Terminal 2: FastAPI Analytics Service (Port 8000)
cd apps/analytics
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Next.js Frontend (Port 3000)
npm run dev:web
```

Visit **http://localhost:3000** in your web browser.

---

## 4. Running the Complete Automated Test Suite

```bash
# 1. Run all Backend API, RBAC, OCC Concurrency & Webhook Tests
npm test --workspace=apps/api

# 2. Run Python FastAPI Analytics & Streaming Export Tests
cd apps/analytics
pytest -v

# 3. Build Next.js Production Web Bundle
npm run build --workspace=apps/web
```

---

## 5. Seeded Test Accounts for Evaluation

| Role | Email | Password | Primary Capability |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | `admin@worksphere.io` | `Password123!` | System-wide oversight |
| **Organization Owner** | `owner@acme.com` | `Password123!` | Tenant settings, invite members |
| **Project Manager** | `pm@acme.com` | `Password123!` | Create projects, milestones, tasks |
| **Team Member** | `dev@acme.com` | `Password123!` | Update tasks (OCC), comments |
| **Auditor** | `auditor@acme.com` | `Password123!` | Read-only compliance audit trail |
| **Cross-Tenant Test** | `owner@beta.com` | `Password123!` | Proves Tenant B cannot access Tenant A |
