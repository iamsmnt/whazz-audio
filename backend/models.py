"""Database models"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, Float, ForeignKey
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
    is_admin = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True, index=True)
    verification_token_expires = Column(DateTime(timezone=True), nullable=True)
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


class UserUsageStats(Base):
    """Track usage statistics for users and guests"""

    __tablename__ = "user_usage_stats"

    id = Column(Integer, primary_key=True, index=True)

    # User identification (one of these will be set)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)
    guest_id = Column(String, nullable=True, unique=True)

    # Audio processing statistics
    total_files_uploaded = Column(Integer, default=0)
    total_files_processed = Column(Integer, default=0)
    total_files_failed = Column(Integer, default=0)
    total_files_downloaded = Column(Integer, default=0)

    # Storage statistics (in bytes)
    total_input_size = Column(Float, default=0.0)
    total_output_size = Column(Float, default=0.0)

    # Processing time statistics (in seconds)
    total_processing_time = Column(Float, default=0.0)

    # Processing type breakdown (JSON object)
    processing_types_count = Column(JSON, default={})  # e.g., {"speech_enhancement": 5, "noise_reduction": 3}

    # Activity statistics
    first_upload_at = Column(DateTime(timezone=True), nullable=True)
    last_upload_at = Column(DateTime(timezone=True), nullable=True)
    last_download_at = Column(DateTime(timezone=True), nullable=True)

    # API usage
    api_calls_count = Column(Integer, default=0)
    last_api_call_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AudioProcessingJob(Base):
    """Audio processing job tracking"""

    __tablename__ = "audio_processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    # User/Guest tracking
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    guest_id = Column(String, nullable=True)  # For guest users

    # File information
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Float, nullable=False)  # Size in bytes
    file_format = Column(String, nullable=True)  # e.g., 'wav', 'mp3'
    duration = Column(Float, nullable=True)  # Duration in seconds
    sample_rate = Column(Integer, nullable=True)
    channels = Column(Integer, nullable=True)

    # File paths
    input_file_path = Column(String, nullable=False)
    output_file_path = Column(String, nullable=True)

    # Processing information
    status = Column(String, nullable=False, default="pending")  # pending, processing, completed, failed
    progress = Column(Float, default=0.0)  # 0-100
    processing_type = Column(String, nullable=True)  # e.g., 'noise_reduction', 'enhancement'
    error_message = Column(Text, nullable=True)

    # Additional metadata
    job_metadata = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)  # Auto-cleanup after expiry
