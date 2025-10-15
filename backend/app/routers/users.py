from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import UserCreate, UserOut, Token
from ..auth import hash_password, verify_password, create_access_token, decode_token, ACCESS_MIN

router = APIRouter(prefix="/users", tags=["users"])
oauth2 = OAuth2PasswordBearer(tokenUrl="/users/login")

# -------- Register --------
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please log in instead."
        )

    db_user = models.User(
        email=user.email,
        password_hash=hash_password(user.password),
        first_name=user.first_name.strip() if user.first_name else None,
        last_name=user.last_name.strip() if user.last_name else None,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# -------- Login --------
@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT access token.
    Note: OAuth2PasswordRequestForm expects 'username' instead of 'email'.
    """
    user = db.query(models.User).filter(models.User.email == form.username.strip().lower()).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(sub=user.id, is_admin=user.is_admin)
    return {"access_token": token, "token_type": "bearer", "expires_in_minutes": ACCESS_MIN}


# -------- Current user --------
def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> models.User:
    """Decode and return the current user from the access token."""
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type. Please reauthenticate."
            )
        uid = int(payload.get("sub"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again."
        )

    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


# -------- Get current user profile --------
@router.get("/me", response_model=UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    """Return the current user's profile."""
    return current_user


# -------- Require admin (RBAC) --------
def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Ensure the user has admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user