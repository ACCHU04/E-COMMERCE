import base64
import hashlib
import hmac
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings
from models import AuthUser

_auth_scheme = HTTPBearer(auto_error=False)


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.auth_db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db() -> None:
    conn = _get_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _hash_password(password: str, salt: bytes | None = None) -> str:
    actual_salt = salt or os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), actual_salt, 120000)
    return f"{_b64url_encode(actual_salt)}:{_b64url_encode(derived)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_b64, hash_b64 = stored_hash.split(":", 1)
        salt = _b64url_decode(salt_b64)
        expected = _b64url_decode(hash_b64)
    except ValueError:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(actual, expected)


def _serialize_user(row: sqlite3.Row) -> AuthUser:
    return AuthUser(
        id=int(row["id"]),
        email=str(row["email"]),
        created_at=str(row["created_at"]),
    )


def create_user(email: str, password: str) -> AuthUser:
    normalized_email = email.strip().lower()
    if "@" not in normalized_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email address")
    if len(password.strip()) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters")

    conn = _get_conn()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (normalized_email,)).fetchone()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

        created_at = datetime.now(timezone.utc).isoformat()
        password_hash = _hash_password(password)
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (normalized_email, password_hash, created_at),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")
        return _serialize_user(row)
    finally:
        conn.close()


def authenticate_user(email: str, password: str) -> AuthUser:
    normalized_email = email.strip().lower()
    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (normalized_email,)).fetchone()
        if row is None or not verify_password(password, str(row["password_hash"])):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        return _serialize_user(row)
    finally:
        conn.close()


def get_or_create_oauth_user(email: str) -> AuthUser:
    normalized_email = email.strip().lower()
    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (normalized_email,)).fetchone()
        if row is not None:
            return _serialize_user(row)

        created_at = datetime.now(timezone.utc).isoformat()
        password_hash = _hash_password(f"oauth::{normalized_email}::{created_at}")
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (normalized_email, password_hash, created_at),
        )
        conn.commit()
        created_row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
        if created_row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create OAuth user")
        return _serialize_user(created_row)
    finally:
        conn.close()


async def verify_google_id_token(id_token: str) -> dict[str, Any]:
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth is not configured on server")

    token = (id_token or "").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="id_token is required")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": token})
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Google token verification failed") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    payload = response.json()
    aud = str(payload.get("aud", ""))
    email = str(payload.get("email", "")).strip().lower()
    email_verified = str(payload.get("email_verified", "false")).lower() == "true"

    if aud != settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token audience mismatch")
    if not email or not email_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account email is not verified")

    return payload


def create_access_token(user: AuthUser) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.auth_token_exp_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": int(exp.timestamp()),
    }

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(settings.auth_secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"


def verify_access_token(token: str) -> AuthUser:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_signature = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    provided_signature = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")

    payload: dict[str, Any] = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    if int(payload.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (payload.get("sub"),)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return _serialize_user(row)
    finally:
        conn.close()


def require_auth(credentials: HTTPAuthorizationCredentials | None) -> AuthUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return verify_access_token(credentials.credentials)


def auth_scheme() -> HTTPBearer:
    return _auth_scheme
