import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from jose import jwt, JWTError
from app.core.config import settings

def create_access_token(subject: str, claims: Optional[Dict[str, Any]] = None, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "exp": int(expire.timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "jti": secrets.token_hex(16),
        "type": "access"
    }
    if claims:
        to_encode.update(claims)
        
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")

def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)

def generate_recovery_token() -> str:
    return secrets.token_urlsafe(32)

def generate_numeric_code(digits: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(digits))

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_step_up_token(user_id: str, action: str, resource: str, expires_minutes: int = 5) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": str(user_id),
        "act": str(action),
        "res": str(resource),
        "exp": int(expire.timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "jti": secrets.token_hex(16),
        "type": "step_up"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_step_up_token(token: str, expected_user_id: str, expected_action: str, expected_resource: str) -> bool:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "step_up":
            return False
        if str(payload.get("sub")) != str(expected_user_id):
            return False
        if str(payload.get("act")) != str(expected_action):
            return False
        if expected_resource != "*" and str(payload.get("res")) != str(expected_resource):
            return False
        return True
    except Exception:
        return False

def verify_token_hash(plain_token: str, hashed_token: str) -> bool:
    candidate_hash = hash_token(plain_token)
    return hmac.compare_digest(candidate_hash, hashed_token)

def create_registration_token(email: str, expires_minutes: int = 30) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": email.strip().lower(),
        "type": "registration",
        "email_verified": True,
        "exp": int(expire.timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "jti": secrets.token_hex(16),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_registration_token(token: str, expected_email: str) -> bool:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "registration":
            return False
        if not payload.get("email_verified"):
            return False
        if payload.get("sub") != expected_email.strip().lower():
            return False
        return True
    except Exception:
        return False
