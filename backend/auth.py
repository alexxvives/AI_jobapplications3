from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import get_db
from models import User

# Security
SECRET_KEY = "your-secret-key-here"  # Change this in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        print(f"🔍 BACKEND AUTH DEBUG - Token received: {token[:50]}...")
        print(f"🔍 BACKEND AUTH DEBUG - SECRET_KEY: {SECRET_KEY}")
        print(f"🔍 BACKEND AUTH DEBUG - ALGORITHM: {ALGORITHM}")
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"🔍 BACKEND AUTH DEBUG - Payload decoded: {payload}")
        
        user_id: str = payload.get("sub")
        print(f"🔍 BACKEND AUTH DEBUG - User ID from token: {user_id}")
        
        if user_id is None:
            print("❌ BACKEND AUTH DEBUG - No user_id in payload")
            raise credentials_exception
            
    except JWTError as e:
        print(f"❌ BACKEND AUTH DEBUG - JWTError: {e}")
        print(f"❌ BACKEND AUTH DEBUG - JWTError type: {type(e)}")
        raise credentials_exception
    except Exception as e:
        print(f"❌ BACKEND AUTH DEBUG - Unexpected error: {e}")
        print(f"❌ BACKEND AUTH DEBUG - Error type: {type(e)}")
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user