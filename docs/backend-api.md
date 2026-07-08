# Backend API Documentation

The FastAPI backend exposes its API under the `/api/v1` prefix.  
All endpoints require CORS (`http://localhost:5173`) and, except for authentication, a valid `cea_access_token` cookie.

## Authentication

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| **POST** | `/auth/login` | Validate credentials, set auth cookie. | `{ "email": "...", "password": "..." }` | `{ "user": <UserRead>, "must_change_password": bool }` |
| **POST** | `/auth/logout` | Delete auth cookie. | – | 204 No Content |
| **GET** | `/auth/me` | Return the current authenticated user. | – | `<UserRead>` |

> The cookie name is defined in `settings.cookie_name` (`cea_access_token`).  

## Users

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/users` | List all users (admin only). |
| **POST** | `/users` | Create a new user (admin only). |
| **GET** | `/users/{id}` | Retrieve a single user (admin or self). |
| **PATCH** | `/users/{id}` | Update user fields (admin or self). |
| **DELETE** | `/users/{id}` | Soft‑delete a user (admin only). |

## Assets

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/assets` | List assets (filterable by status). |
| **POST** | `/assets` | Create a new asset (admin). |
| **GET** | `/assets/{id}` | Retrieve asset details. |
| **PATCH** | `/assets/{id}` | Update asset fields (admin). |
| **DELETE** | `/assets/{id}` | Archive an asset (admin). |

## Borrowing Workflow

| Method | Path | Description |
|--------|------|-------------|
| **POST** | `/borrowing/requests` | Staff creates a borrow request (status = `pending_approval`). |
| **GET** | `/borrowing/requests` | Admin lists **all** requests. |
| **GET** | `/borrowing/my-requests` | Staff lists **their own** requests. |
| **POST** | `/borrowing/requests/{id}/approve` | Admin approves a pending request → assets become `RESERVED`. |
| **POST** | `/borrowing/requests/{id}/reject` | Admin rejects a pending request. |
| **POST** | `/borrowing/requests/{id}/cancel` | Staff (own) or admin cancels a request (releases assets if reserved). |
| **POST** | `/borrowing/requests/{id}/issue` | Admin issues assets → status `BORROWED`. |
| **POST** | `/borrowing/requests/{id}/return` | Admin records return, updates asset condition, status → `AVAILABLE`. |

## Reporting

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/reports/dashboard` | Aggregated counts (assets, requests, etc.). |
| **GET** | `/reports/audit-logs` | Chronological list of audit events. |

---

### Error handling

All endpoints raise `HTTPException` with appropriate status codes (`401`, `403`, `404`, `400`).  
The frontend wraps errors in `ApiError` (see `frontend/src/services/api.ts`).

---

### Extending the API

1. Add a new router in `backend/app/<module>/router.py`.  
2. Include it in `backend/app/main.py` with a prefix (`/api/v1/<module>`).  
3. Define Pydantic schemas in `<module>/schemas.py` and SQLAlchemy models in `<module>/models.py`.  
