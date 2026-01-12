# Admin Panel API Guide

Complete guide for admin functionality in Whazz Audio platform.

## Setup

### 1. Apply Database Migration

The `is_admin` field has been added to the users table. Apply the migration:

```bash
cd backend
python3 -m alembic upgrade head
```

### 2. Create Your First Admin User

Since you need to be an admin to access admin endpoints, you'll need to manually set the first admin user in the database:

**Option A: Using PostgreSQL CLI**
```bash
psql -U postgres -d whazz_audio
```

```sql
-- Find your user ID
SELECT id, username, email, is_admin FROM users;

-- Make yourself admin (replace 1 with your user ID)
UPDATE users SET is_admin = true WHERE id = 1;
```

**Option B: Using Python Script**
```python
# Create a file: backend/create_admin.py
from database import SessionLocal
from models import User

db = SessionLocal()
user = db.query(User).filter(User.email == "your-email@example.com").first()
if user:
    user.is_admin = True
    db.commit()
    print(f"User {user.username} is now an admin!")
else:
    print("User not found")
db.close()
```

Run it:
```bash
cd backend
python3 create_admin.py
```

## Admin Authentication

All admin endpoints require:
1. Valid JWT token (login first)
2. User must have `is_admin = true`

If you're not an admin, you'll get:
```json
{
  "detail": "Admin privileges required"
}
```

## API Endpoints

### Base URL: `/admin`

---

## 1. User Management

### List All Users
**GET** `/admin/users`

Query Parameters:
- `skip` (int, default: 0) - Pagination offset
- `limit` (int, default: 50, max: 100) - Number of users per page
- `search` (string, optional) - Search by email or username
- `is_active` (bool, optional) - Filter by active status
- `is_verified` (bool, optional) - Filter by verified status
- `is_admin` (bool, optional) - Filter by admin status

**Example:**
```bash
curl -X GET "http://localhost:8000/admin/users?skip=0&limit=10&is_active=true" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "username": "john_doe",
    "is_active": true,
    "is_verified": true,
    "is_admin": false,
    "created_at": "2026-01-10T10:00:00",
    "updated_at": "2026-01-11T15:30:00",
    "verification_token": null,
    "verification_token_expires": null
  }
]
```

---

### Get User Details
**GET** `/admin/users/{user_id}`

**Example:**
```bash
curl -X GET "http://localhost:8000/admin/users/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Create New User
**POST** `/admin/users`

Body:
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "SecurePass123!",
  "is_admin": false,
  "is_verified": true,
  "is_active": true
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/admin/users" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "password": "SecurePass123!",
    "is_verified": true
  }'
```

**Use Case:** Create pre-verified users, bulk import users, create test accounts

---

### Update User
**PATCH** `/admin/users/{user_id}`

Body (all fields optional):
```json
{
  "email": "newemail@example.com",
  "username": "newusername",
  "is_active": true,
  "is_verified": true,
  "is_admin": false
}
```

**Example:**
```bash
curl -X PATCH "http://localhost:8000/admin/users/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_verified": true}'
```

**Use Case:** Fix user issues, grant admin rights, change email/username

---

### Delete User
**DELETE** `/admin/users/{user_id}`

⚠️ **WARNING:** Permanent deletion. Removes:
- User account
- All audio processing jobs
- All uploaded/processed files
- Usage statistics

**Example:**
```bash
curl -X DELETE "http://localhost:8000/admin/users/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Safety:** Cannot delete your own admin account

---

### Update User Password
**POST** `/admin/users/{user_id}/password`

Body:
```json
{
  "new_password": "NewSecurePassword123!"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/admin/users/5/password" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_password": "NewPass123!"}'
```

**Use Case:** User forgot password, security breach recovery

---

### Verify User Email
**POST** `/admin/users/{user_id}/verify`

Manually verify a user's email (bypass email verification).

**Example:**
```bash
curl -X POST "http://localhost:8000/admin/users/5/verify" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Activate User
**POST** `/admin/users/{user_id}/activate`

Reactivate a deactivated user.

**Example:**
```bash
curl -X POST "http://localhost:8000/admin/users/5/activate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Deactivate User
**POST** `/admin/users/{user_id}/deactivate`

Soft-delete: disable access without deleting data.

**Example:**
```bash
curl -X POST "http://localhost:8000/admin/users/5/deactivate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Use Case:** Temporary ban, suspicious activity, payment issues

**Safety:** Cannot deactivate your own admin account

---

## 2. Guest Management

### List Guest Sessions
**GET** `/admin/guests`

Query Parameters:
- `skip` (int, default: 0)
- `limit` (int, default: 50, max: 100)
- `include_expired` (bool, default: false) - Show expired sessions

**Example:**
```bash
curl -X GET "http://localhost:8000/admin/guests?include_expired=true" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
[
  {
    "id": 1,
    "guest_id": "abc123-def456",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "session_metadata": {},
    "converted_to_user_id": null,
    "created_at": "2026-01-12T10:00:00",
    "last_active_at": "2026-01-12T11:30:00",
    "expires_at": "2026-01-19T10:00:00"
  }
]
```

---

### Delete Guest Session
**DELETE** `/admin/guests/{guest_id}`

⚠️ **WARNING:** Permanent deletion. Removes:
- Guest session
- All audio processing jobs
- All uploaded/processed files
- Usage statistics

**Example:**
```bash
curl -X DELETE "http://localhost:8000/admin/guests/abc123-def456" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 3. Job Management

### List All Jobs
**GET** `/admin/jobs`

Query Parameters:
- `skip` (int, default: 0)
- `limit` (int, default: 50, max: 100)
- `status_filter` (string, optional) - Filter by: pending, processing, completed, failed
- `user_id` (int, optional) - Filter by user
- `guest_id` (string, optional) - Filter by guest

**Example:**
```bash
curl -X GET "http://localhost:8000/admin/jobs?status_filter=failed&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
[
  {
    "id": 1,
    "job_id": "job-uuid-123",
    "user_id": 5,
    "guest_id": null,
    "filename": "unique-audio-123.wav",
    "original_filename": "recording.wav",
    "file_size": 5242880,
    "file_format": "wav",
    "duration": 30.5,
    "sample_rate": 48000,
    "channels": 2,
    "input_file_path": "/uploads/unique-audio-123.wav",
    "output_file_path": "/processed/processed-audio-123.wav",
    "status": "completed",
    "progress": 100.0,
    "processing_type": "speech_enhancement",
    "error_message": null,
    "created_at": "2026-01-12T10:00:00",
    "started_at": "2026-01-12T10:00:05",
    "completed_at": "2026-01-12T10:02:30",
    "expires_at": "2026-01-13T10:00:00"
  }
]
```

---

### Delete Job
**DELETE** `/admin/jobs/{job_id}`

Delete specific job and its files.

**Example:**
```bash
curl -X DELETE "http://localhost:8000/admin/jobs/job-uuid-123" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Use Case:** Clean up stuck jobs, free up disk space

---

## 4. System Statistics

### System Overview
**GET** `/admin/stats/overview`

Get comprehensive platform statistics.

**Example:**
```bash
curl -X GET "http://localhost:8000/admin/stats/overview" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "users": {
    "total": 150,
    "active": 140,
    "verified": 120,
    "admins": 3,
    "inactive": 10,
    "new_last_24h": 5
  },
  "guests": {
    "total": 300,
    "active": 250,
    "expired": 50
  },
  "jobs": {
    "total": 5000,
    "pending": 10,
    "processing": 5,
    "completed": 4800,
    "failed": 185,
    "success_rate_percent": 96.3,
    "new_last_24h": 120
  },
  "timestamp": "2026-01-12T15:30:00"
}
```

---

### Manual Cleanup
**POST** `/admin/cleanup/expired`

Manually trigger cleanup of expired files and sessions.

**Example:**
```bash
curl -X POST "http://localhost:8000/admin/cleanup/expired" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "message": "Cleanup completed: 25 jobs and 10 guest sessions removed"
}
```

**Use Case:** Free up disk space immediately, troubleshoot storage issues

---

## Common Admin Tasks

### 1. Make User an Admin
```bash
curl -X PATCH "http://localhost:8000/admin/users/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_admin": true}'
```

### 2. Reset User Password
```bash
curl -X POST "http://localhost:8000/admin/users/5/password" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_password": "TempPassword123!"}'
```

### 3. Search Users by Email
```bash
curl -X GET "http://localhost:8000/admin/users?search=john@example.com" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. View Failed Jobs
```bash
curl -X GET "http://localhost:8000/admin/jobs?status_filter=failed" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 5. Clean Up Disk Space
```bash
curl -X POST "http://localhost:8000/admin/cleanup/expired" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 6. Ban/Suspend User
```bash
curl -X POST "http://localhost:8000/admin/users/5/deactivate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 7. View Platform Stats
```bash
curl -X GET "http://localhost:8000/admin/stats/overview" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Usage Statistics Admin Endpoints

These are in the `/usage` router but require admin privileges:

### Platform-Wide Stats
**GET** `/usage/admin/stats`
```bash
curl -X GET "http://localhost:8000/usage/admin/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### User Usage Stats
**GET** `/usage/admin/user/{user_id}`
```bash
curl -X GET "http://localhost:8000/usage/admin/user/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Guest Usage Stats
**GET** `/usage/admin/guest/{guest_id}`
```bash
curl -X GET "http://localhost:8000/usage/admin/guest/abc123-def456" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Top Users
**GET** `/usage/admin/top-users?sort_by=files_processed&limit=10`
```bash
curl -X GET "http://localhost:8000/usage/admin/top-users?sort_by=storage&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Sort options: `files_processed`, `files_uploaded`, `storage`, `processing_time`, `api_calls`

---

## Security Best Practices

1. **Protect Admin Accounts**
   - Use strong passwords
   - Enable 2FA (if implemented)
   - Limit number of admins
   - Regularly audit admin actions

2. **User Deletion**
   - Always verify before deleting users
   - Consider deactivation instead of deletion
   - Backup important data before bulk deletions

3. **Password Changes**
   - Notify users when passwords are changed
   - Log all admin password changes
   - Use temporary passwords that must be changed

4. **Monitor Admin Activity**
   - Log all admin actions
   - Review admin logs regularly
   - Set up alerts for sensitive operations

---

## Error Handling

### Common Errors:

**403 Forbidden**
```json
{
  "detail": "Admin privileges required"
}
```
Solution: User is not an admin. Update `is_admin` field in database.

**404 Not Found**
```json
{
  "detail": "User not found"
}
```
Solution: Check user ID exists.

**400 Bad Request**
```json
{
  "detail": "Cannot delete your own account"
}
```
Solution: Admin safety checks prevent self-deletion/demotion.

**400 Bad Request**
```json
{
  "detail": "Email already in use"
}
```
Solution: Choose different email or username.

---

## Interactive API Documentation

Visit FastAPI's auto-generated docs:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

All admin endpoints are grouped under the "admin" tag.

---

## Monitoring & Maintenance

### Daily Tasks:
- Check system overview stats
- Review failed jobs
- Monitor disk space

### Weekly Tasks:
- Review new user registrations
- Check for suspicious activity
- Verify backup systems

### Monthly Tasks:
- Audit admin accounts
- Review usage patterns
- Update security policies
- Clean up old expired sessions manually

---

## Future Enhancements

Planned admin features:
- Email templates management
- Bulk user operations
- Advanced analytics dashboard
- Activity logging and audit trail
- Rate limit configuration
- Feature flags management
- System health monitoring
- Backup/restore functionality

---

## Support

For issues or questions:
- Check FastAPI logs: `docker logs` or console output
- Check PostgreSQL logs for database errors
- Review Celery worker logs for processing issues
- Contact system administrator
