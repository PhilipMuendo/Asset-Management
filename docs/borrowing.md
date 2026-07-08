The borrowing subsystem enables staff members to request assets and admins to manage those requests.

## Core data model (SQLAlchemy)

* `BorrowRequest` – top‑level request record (status, purpose, dates).  
* `BorrowRequestItem` – many‑to‑one link between a request and each requested `Asset`.  
* `BorrowTransaction` – records the issuance and return of assets (condition in/out, timestamps).  
* `BorrowRequestStatus` (enum) – possible states:
  - `pending_approval`
  - `approved`
  - `rejected`
  - `issued`
  - `returned`
  - `overdue`
  - `cancelled`

## State transitions

| Current → New | Trigger (API) | Side‑effects |
|---------------|--------------|--------------|
| `pending_approval` → `approved` | `POST /borrowing/requests/{id}/approve` (admin) | Asset status → `RESERVED`; audit log entry `borrow.approved`. |
| `pending_approval` → `rejected` | `POST /borrowing/requests/{id}/reject` (admin) | Audit log entry `borrow.rejected`. |
| `approved` → `issued` | `POST /borrowing/requests/{id}/issue` (admin) | Asset status → `BORROWED`; `BorrowTransaction` created. |
| `issued` → `returned` | `POST /borrowing/requests/{id}/return` (admin) | Asset status → `AVAILABLE`; condition recorded; possible `condition_alert`. |
| Any of (`pending_approval`, `approved`) → `cancelled` | `POST /borrowing/requests/{id}/cancel` (staff or admin) | If already `approved`, assets are released back to `AVAILABLE`. |
| Any → `overdue` | **Background job** (not yet implemented) – checks `expected_return_date` vs. today. |

## API contract (frontend)

| Frontend function | Backend endpoint | Returned type |
|-------------------|------------------|---------------|
| `submitBorrowRequest` | `POST /borrowing/requests` | `BorrowRequest` (includes populated `items` and `user`). |
| `listBorrowRequests` | `GET /borrowing/requests` | `BorrowRequest[]` (admin view). |
| `listMyBorrowRequests` | `GET /borrowing/my-requests` | `BorrowRequest[]` (staff view). |
| `approveBorrowRequest` | `POST /borrowing/requests/{id}/approve` | Updated `BorrowRequest`. |
| `rejectBorrowRequest` | `POST /borrowing/requests/{id}/reject` | Updated `BorrowRequest`. |
| `cancelBorrowRequest` | `POST /borrowing/requests/{id}/cancel` | Updated `BorrowRequest`. |
| `issueAssets` | `POST /borrowing/requests/{id}/issue` | Updated `BorrowRequest`. |
| `returnAssets` | `POST /borrowing/requests/{id}/return` | Updated `BorrowRequest`. |

## Frontend UI flow (`BorrowingPage.tsx`)

1. **Staff** opens the “Request Assets” form → `submitBorrowRequest`.  
2. After a successful submit, React Query invalidates `["requests", isAdmin]` (where `isAdmin` is `false`), causing `listMyBorrowRequests` to refetch and display the new request under **Active Requests**.  
3. **Admin** sees all requests (`listBorrowRequests`). Approve/Reject/Issue actions trigger mutations that also invalidate the same query key, ensuring the UI stays in sync.

## Auditing

Every state change calls `AuditService.record(...)`, producing entries like:

- `borrow.requested`
- `borrow.approved`
- `borrow.rejected`
- `borrow.issued`
- `borrow.returned`
- `borrow.return_alert` (when returned condition is worse than issued condition)

These entries are exposed via `/api/v1/reports/audit-logs` and displayed in the **Audit Logs** page.

---

### Extending the workflow

* **Overdue detection** – a scheduled background task could scan for requests where `expected_return_date < now()` and set status to `overdue`.  
* **Email notifications** – hook into `AuditService` or create a separate notification service to email users when their request is approved, issued, or overdue.  
* **Bulk actions** – add endpoints to approve/reject multiple requests in one call (useful for admin dashboards).
