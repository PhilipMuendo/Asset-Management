from datetime import UTC, datetime, timedelta
from secrets import choice
from string import ascii_letters, digits, punctuation
from typing import NamedTuple

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


class TokenClaims(NamedTuple):
    user_id: int
    branch_id: int | None


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(subject: str, branch_id: int | None = None) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "branch_id": branch_id, "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> TokenClaims | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
    subject = payload.get("sub")
    if not isinstance(subject, str):
        return None
    try:
        user_id = int(subject)
    except ValueError:
        return None
    branch_id = payload.get("branch_id")
    return TokenClaims(user_id=user_id, branch_id=branch_id if isinstance(branch_id, int) else None)


def generate_temporary_password(length: int = 16) -> str:
    alphabet = ascii_letters + digits + "!@#$%^&*"
    return "".join(choice(alphabet) for _ in range(length))

