"""Pydantic schemas for request/response validation"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema"""

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    """Schema for user registration"""

    password: str = Field(..., min_length=8, max_length=72, description="Password must be between 8 and 72 characters (bcrypt limitation)")

    @field_validator('password')
    @classmethod
    def validate_password_bytes(cls, v: str) -> str:
        """Ensure password is under 72 bytes (bcrypt limitation)"""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password cannot be longer than 72 bytes when encoded in UTF-8')
        return v


class UserLogin(BaseModel):
    """Schema for user login"""

    username_or_email: str
    password: str


class UserResponse(UserBase):
    """Schema for user response"""

    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for token response"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token data"""

    user_id: Optional[int] = None
    username: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request"""

    refresh_token: str


class MessageResponse(BaseModel):
    """Schema for generic message response"""

    message: str


class GuestTokenResponse(BaseModel):
    """Schema for guest token response"""

    guest_token: str
    guest_id: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class GuestSessionResponse(BaseModel):
    """Schema for guest session information"""

    guest_id: str
    created_at: datetime
    last_active_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True
