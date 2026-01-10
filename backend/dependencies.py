"""FastAPI dependencies for authentication"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import User, TokenBlacklist
from auth import verify_token
from schemas import TokenData

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)  # For optional authentication


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    # Check if token is blacklisted
    blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.token == token).first()
    if blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    # Convert string user_id to integer
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user


def get_current_user_or_guest(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get current user (registered or guest).
    Returns a dict with user info and type.

    Returns:
        {
            "type": "user" | "guest" | "anonymous",
            "user": User object or None,
            "guest_id": str or None,
            "is_authenticated": bool
        }
    """
    from models import GuestSession

    # No credentials provided - anonymous
    if not credentials:
        return {
            "type": "anonymous",
            "user": None,
            "guest_id": None,
            "is_authenticated": False
        }

    token = credentials.credentials

    # Verify token
    payload = verify_token(token)
    if payload is None:
        return {
            "type": "anonymous",
            "user": None,
            "guest_id": None,
            "is_authenticated": False
        }

    token_type = payload.get("type")

    # Handle guest token
    if token_type == "guest":
        guest_id = payload.get("sub")
        guest_session = db.query(GuestSession).filter(GuestSession.guest_id == guest_id).first()

        if guest_session:
            return {
                "type": "guest",
                "user": None,
                "guest_id": guest_id,
                "is_authenticated": True,
                "session": guest_session
            }

    # Handle regular user token
    elif token_type == "access":
        user_id_str = payload.get("sub")
        if user_id_str:
            try:
                user_id = int(user_id_str)
                user = db.query(User).filter(User.id == user_id).first()
                if user and user.is_active:
                    return {
                        "type": "user",
                        "user": user,
                        "guest_id": None,
                        "is_authenticated": True
                    }
            except (ValueError, TypeError):
                pass

    # Invalid or expired token
    return {
        "type": "anonymous",
        "user": None,
        "guest_id": None,
        "is_authenticated": False
    }
