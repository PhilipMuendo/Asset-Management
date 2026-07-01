# Collective Energy Africa Asset Management System

Production-oriented internal asset management system for Collective Energy Africa.

This repository is intentionally built feature by feature. The first slice establishes
the platform foundation and the staff account/authentication workflow that later asset,
borrowing, maintenance, and reporting modules will depend on.

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL, Pydantic, JWT in HTTP-only cookies
- Frontend: React, Vite, TypeScript, TailwindCSS, React Router, TanStack Query, React Hook Form, Zod
- Infrastructure: Docker Compose, environment-based configuration

## Current Feature Slice

See [docs/feature-01-foundation-and-accounts.md](docs/feature-01-foundation-and-accounts.md).

## Local Development

1. Copy environment files:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

2. Start services:

```powershell
docker compose up --build
```

3. Apply migrations:

```powershell
docker compose exec backend alembic upgrade head
```

4. Open:

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs

If `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` are set, the backend creates the
first admin account at startup when it does not already exist.

