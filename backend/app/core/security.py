import base64
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from cryptography.fernet import Fernet
from backend.app.config import settings

# Password hashing using direct bcrypt for robust 72-byte safe handling
def get_password_hash(password: str) -> str:
    # Truncate password to 72 bytes if needed (standard bcrypt maximum)
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

# JWT Tokens
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

# Fernet symmetric encryption for sensitive provider credentials & tokens
def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        padded = base64.urlsafe_b64encode((key[:32].ljust(32, "x")).encode())
        return Fernet(padded)

def encrypt_secret(secret: str) -> str:
    if not secret:
        return ""
    f = _get_fernet()
    return f.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted_secret: str) -> str:
    if not encrypted_secret:
        return ""
    try:
        f = _get_fernet()
        return f.decrypt(encrypted_secret.encode()).decode()
    except Exception:
        return ""
