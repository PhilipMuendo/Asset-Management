# Feature 01: Foundation and Staff Accounts

## Architecture

The backend is organized by business capability instead of framework layer. Each module
owns its models, schemas, repository, service, and router where applicable.

- `auth`: login, logout, current session, password changes
- `users`: admin-managed staff accounts
- `departments`: department reference data used by staff profiles
- `audit`: immutable audit events
- `core`: configuration, security, shared dependencies
- `database`: SQLAlchemy session and metadata setup

The frontend uses route-level pages backed by typed API service modules. Shared UI
components live under `src/components/ui`, while layout-level components live under
`src/layouts`.

## Database Changes

This slice creates normalized tables for the account foundation:

- `departments`: company departments, archived rather than hard-deleted
- `users`: staff/admin accounts using company email as username
- `audit_logs`: immutable record of important actions

User records store role, status, job title, phone number, department, password hash, and
whether the user must change password on next login.

## API Endpoints

All endpoints are versioned under `/api/v1`.

- `POST /auth/login`: authenticate with email/password and set HTTP-only JWT cookie
- `POST /auth/logout`: clear the session cookie
- `GET /auth/me`: return the current authenticated user
- `POST /auth/change-password`: update password and clear first-login password change flag
- `GET /departments`: list active departments
- `POST /departments`: admin-only department creation
- `GET /users`: admin-only user listing
- `POST /users`: admin-only user creation with generated temporary password and welcome email
- `PATCH /users/{user_id}`: admin-only profile/status updates

## Frontend Pages

- `/login`: secure sign-in form
- `/`: dashboard landing with session summary
- `/users`: admin staff account management

The application shell keeps navigation restrained and enterprise-focused. Admin-only
navigation is rendered based on the current authenticated user's role.

## Component Hierarchy

```text
App
  QueryClientProvider
  BrowserRouter
    AuthProvider
      ProtectedRoute
        AppLayout
          Sidebar
          Header
          Outlet
            DashboardPage
            UsersPage
      LoginPage
```

## Implementation Notes

- There is no public registration endpoint.
- Users are archived or suspended, never permanently deleted.
- Important account actions write immutable audit log entries.
- JWTs are stored in HTTP-only cookies.
- Email delivery is environment-driven. SMTP can be enabled for production, while
  console delivery supports local development without changing application code.

