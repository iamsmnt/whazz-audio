"""Database models"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    """User model for authentication"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TokenBlacklist(Base):
    """Token blacklist for logout functionality"""

    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    blacklisted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)


class GuestSession(Base):
    """Guest user session tracking"""

    __tablename__ = "guest_sessions"

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    # Optional tracking fields
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    session_metadata = Column(JSON, nullable=True)  # Store additional tracking data

    # Conversion tracking
    converted_to_user_id = Column(Integer, nullable=True)  # If guest converts to registered user

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
