from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import UserCreate, UserOut, Token, LoginInput
from ..auth import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/users", tags=["users"])
oauth2 = OAuth2PasswordBearer(tokenUrl="/users/login")

# -------- Register --------
@router.post("/register", response_model=UserOut, status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(models.User.email == user.email).first()
    if exists:
        raise HTTPException(400, "Email already registered")
    db_user = models.User(
        email=user.email,
        password_hash=hash_password(user.password),
        first_name=user.first_name,
        last_name=user.last_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# -------- Login --------
@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 form uses 'username' field for email
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(sub=user.id, is_admin=user.is_admin)
    return {"access_token": token, "token_type": "bearer"}

# -------- Current user --------
def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> models.User:
    try:
        payload = decode_token(token)
        uid = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(401, "User not found")
    return user

@router.get("/me", response_model=UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- RBAC helper: require admin ---
def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
    return current_user