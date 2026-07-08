# System Overview

This repository implements a **Solar Asset Management** system consisting of three main components:

1. **Backend (FastAPI)** – Provides a RESTful API for authentication, user management, asset catalog, borrowing workflow, and reporting. The API lives under the `/api/v1` namespace.
2. **Frontend (React + Vite)** – A single‑page application that consumes the API. It includes pages for login, dashboard, asset catalog, borrowing requests, audit logs, and configuration.
3. **Database (PostgreSQL)** – Stores users, assets, categories, locations, suppliers, borrowing requests, and audit history.

The services are containerised and orchestrated with **docker‑compose**.  The `docker-compose.yml` defines three services:
- `postgres` – the relational database.
- `backend` – the FastAPI server (exposed on port **8000**).
- `frontend` – the Vite development server (exposed on port **5173**).

All services share a common network, allowing the frontend to call the backend via the `VITE_API_BASE_URL` environment variable (`http://localhost:8000/api/v1`).

---

## High‑level data flow

1. **User logs in** – credentials are posted to `/api/v1/auth/login`.  A signed JWT is set as an HTTP‑only cookie (`cea_access_token`).
2. **Frontend stores the cookie** (automatically via `credentials: "include"`). Subsequent API calls include the cookie for authentication.
3. **Borrow request** – a staff user selects assets and posts to `/api/v1/borrowing/requests`. The backend creates a `BorrowRequest` with status `pending_approval` and returns the full object (including related assets).
4. **Admin actions** – admins can approve, reject, issue, or cancel requests via dedicated endpoints. Status transitions update the `Asset` status and create `AssetHistory` entries.
5. **Reporting** – the `/api/v1/reports` endpoints aggregate audit logs and dashboard metrics.

---

## Quick start

```bash
# Build and start all containers
docker compose up --build

# Backend API docs
open http://localhost:8000/docs

# Frontend dev server
open http://localhost:5173
```

---
