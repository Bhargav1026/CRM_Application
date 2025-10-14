import os, datetime as dt
from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext
from passlib.context import CryptContext

load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
ALGO = "HS256"
ACCESS_MIN = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))

pwd = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(pw: str) -> str:
    return pwd.hash(pw)

def verify_password(pw: str, pw_hash: str) -> bool:
    return pwd.verify(pw, pw_hash)

def create_access_token(sub: str | int, is_admin: bool | None = None, extra: dict | None = None) -> str:
    """Create a signed JWT access token.
    - `sub`: the subject (user id)
    - `is_admin`: include admin claim if provided
    - `extra`: optional extra claims to merge into the payload
    """
    now = dt.datetime.utcnow()
    payload: dict = {
        "sub": str(sub),
        "type": "access",
        "iat": now,
        "exp": now + dt.timedelta(minutes=ACCESS_MIN),
    }
    if is_admin is not None:
        payload["is_admin"] = bool(is_admin)
        payload["role"] = "admin" if is_admin else "user"
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGO)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGO])