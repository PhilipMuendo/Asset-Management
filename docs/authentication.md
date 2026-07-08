# Authentication Flow

The system uses **JWT‑based session cookies**. The flow is:

1. **Login** (`POST /api/v1/auth/login`)  
   * Payload: `{ email, password }`.  
   * Backend validates credentials, creates a JWT (`create_access_token`) and sets an HTTP‑only cookie named `cea_access_token`.  
   * The cookie attributes (`secure`, `samesite`, `httponly`) are defined in `app.core.config.Settings`.

2. **Subsequent requests**  
   * The browser automatically includes the cookie because the frontend fetches with `credentials: "include"`.  
   * FastAPI’s `get_current_user` dependency extracts the cookie, decodes the token (`decode_access_token`), and loads the user from the DB.  
   * If the token is missing or invalid, a `401 Unauthorized` is returned.

3. **Logout** (`POST /api/v1/auth/logout`)  
   * Backend deletes the cookie (`response.delete_cookie`).  
   * Frontend clears the React Query cache (`queryClient.clear()`).

### Security considerations

| Concern | Mitigation |
|---------|------------|
| **XSS** – stealing the token | Token is stored in an **HTTP‑only** cookie, inaccessible to JavaScript. |
| **CSRF** – cross‑site request forgery | CORS is configured with `allow_credentials=True` and the frontend runs on a trusted origin (`http://localhost:5173`). For production, consider SameSite=`strict` and CSRF tokens for state‑changing endpoints. |
| **Token expiration** | Tokens expire after `settings.access_token_expire_minutes` (default 720 min). After expiration the user receives a `401` and must log in again. |
| **Password storage** | Passwords are hashed with `hash_password` (bcrypt). The `must_change_password` flag forces a password change on first login. |

### Extending authentication

* **Refresh tokens** – add a `/auth/refresh` endpoint that issues a new JWT if the current one is still valid.  
* **OAuth / SSO** – replace the login endpoint with an external provider and map the returned user info to a local `User` record.
