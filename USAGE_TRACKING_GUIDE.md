# Usage Statistics Tracking Implementation Guide

This guide shows you how to integrate usage tracking for both authenticated users and guests in Whazz Audio.

## What's Been Done

✅ Created `UserUsageStats` database model
✅ Created `usage_tracking.py` service with tracking functions
✅ Applied database migration

## What Gets Tracked

### File Statistics
- Total files uploaded
- Total files processed (successfully)
- Total files failed
- Total files downloaded

### Storage Statistics
- Total input file size (MB)
- Total output file size (MB)
- Average file size

### Processing Statistics
- Total processing time (minutes)
- Average processing time per file
- Processing type breakdown (speech_enhancement, noise_reduction, etc.)
- Success rate percentage

### Activity Timestamps
- First upload timestamp
- Last upload timestamp
- Last download timestamp
- Last API call timestamp

### API Usage
- Total API calls made
- Rate limiting data

## Implementation Steps

### Step 1: Update Audio Upload Endpoint

Modify `backend/routers/audio.py` to track uploads:

```python
from usage_tracking import track_file_upload, track_api_call
from fastapi import Request

@router.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: User = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Upload audio file for processing"""

    # Get user/guest identification
    user_id = current_user.id if current_user else None
    guest_id = request.headers.get("X-Guest-ID") if not current_user else None

    # Track API call
    track_api_call(db, user_id=user_id, guest_id=guest_id)

    # Validate file
    if not file.filename.endswith(tuple(settings.allowed_audio_formats)):
        raise HTTPException(status_code=400, detail="Invalid audio format")

    # Save file
    file_path = os.path.join(settings.upload_dir, f"{job_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        file_size = len(content)

    # Create job record
    job = AudioProcessingJob(
        job_id=job_id,
        user_id=user_id,
        guest_id=guest_id,
        filename=file.filename,
        original_filename=file.filename,
        file_size=file_size,
        input_file_path=file_path,
        # ... other fields
    )
    db.add(job)
    db.commit()

    # Track file upload in usage stats
    track_file_upload(
        db,
        user_id=user_id,
        guest_id=guest_id,
        file_size=file_size,
        processing_type="speech_enhancement"  # or get from request
    )

    # Queue Celery task
    task = process_audio_task.delay(job.job_id)

    return {"job_id": job.job_id, "status": "pending"}
```

### Step 2: Update Celery Task to Track Processing

Modify `backend/tasks.py` to track processing completion:

```python
from datetime import datetime
from usage_tracking import track_processing_complete
import os

@celery_app.task(base=DatabaseTask, bind=True, name='tasks.process_audio_task')
def process_audio_task(self, job_id: str):
    db = self.db
    job = db.query(AudioProcessingJob).filter(AudioProcessingJob.job_id == job_id).first()

    if not job:
        raise ValueError(f"Job {job_id} not found")

    start_time = datetime.utcnow()

    try:
        job.status = "processing"
        job.started_at = start_time
        db.commit()

        # Process audio (your existing code)
        cv = ClearVoice(task='speech_enhancement', model_names=[settings.clearvoice_model_name])
        cv(input_path=job.input_file_path, online_write=True, output_path=settings.output_dir)

        # Get output file size
        output_file_size = os.path.getsize(job.output_file_path) if os.path.exists(job.output_file_path) else 0

        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()

        # Update job
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        job.progress = 100.0
        db.commit()

        # Track successful processing
        track_processing_complete(
            db,
            user_id=job.user_id,
            guest_id=job.guest_id,
            processing_time=processing_time,
            output_file_size=output_file_size,
            success=True
        )

        return {"status": "completed", "job_id": job_id}

    except Exception as e:
        # Calculate processing time even for failures
        processing_time = (datetime.utcnow() - start_time).total_seconds()

        # Update job as failed
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()

        # Track failed processing
        track_processing_complete(
            db,
            user_id=job.user_id,
            guest_id=job.guest_id,
            processing_time=processing_time,
            output_file_size=0,
            success=False
        )

        raise
```

### Step 3: Update Download Endpoint

Modify download endpoint in `backend/routers/audio.py`:

```python
from usage_tracking import track_file_download, track_api_call

@router.get("/download/{job_id}")
async def download_processed_audio(
    job_id: str,
    request: Request,
    current_user: User = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Download processed audio file"""

    # Get job
    job = db.query(AudioProcessingJob).filter(AudioProcessingJob.job_id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Authorization checks
    user_id = current_user.id if current_user else None
    guest_id = request.headers.get("X-Guest-ID") if not current_user else None

    if user_id and job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if guest_id and job.guest_id != guest_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Track API call
    track_api_call(db, user_id=user_id, guest_id=guest_id)

    # Validate job status
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed: {job.status}")

    if not os.path.exists(job.output_file_path):
        raise HTTPException(status_code=500, detail="Processed file not found")

    # Track download
    track_file_download(db, user_id=user_id, guest_id=guest_id)

    return FileResponse(
        path=job.output_file_path,
        filename=f"processed_{job.original_filename}",
        media_type="audio/wav"
    )
```

### Step 4: Create Usage Statistics Endpoint

Add new router for usage statistics in `backend/routers/usage_stats.py`:

```python
"""Usage statistics endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from auth import get_optional_current_user, get_current_user
from models import User
from usage_tracking import get_usage_stats, check_usage_limit

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/me")
async def get_my_usage_stats(
    request: Request,
    current_user: User = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Get usage statistics for current user or guest"""

    user_id = current_user.id if current_user else None
    guest_id = request.headers.get("X-Guest-ID") if not current_user else None

    if not user_id and not guest_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    stats = get_usage_stats(db, user_id=user_id, guest_id=guest_id)
    return stats


@router.get("/limits")
async def check_my_usage_limits(
    request: Request,
    current_user: User = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Check if user/guest is within usage limits"""

    user_id = current_user.id if current_user else None
    guest_id = request.headers.get("X-Guest-ID") if not current_user else None

    if not user_id and not guest_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Define limits (different for users vs guests)
    if user_id:
        limits = {
            "files_per_day": 100,
            "storage_mb": 1000,
            "processing_minutes": 60
        }
    else:
        limits = {
            "files_per_day": 5,
            "storage_mb": 50,
            "processing_minutes": 10
        }

    results = {}
    for limit_type, limit_value in limits.items():
        within_limit, message = check_usage_limit(
            db,
            user_id=user_id,
            guest_id=guest_id,
            limit_type=limit_type,
            limit_value=limit_value
        )
        results[limit_type] = {
            "within_limit": within_limit,
            "limit": limit_value,
            "message": message
        }

    return results


@router.get("/admin/user/{user_id}")
async def get_user_usage_stats_admin(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint: Get usage stats for any user"""

    # Add admin check here
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")

    stats = get_usage_stats(db, user_id=user_id)
    return stats
```

### Step 5: Register Usage Router

In `backend/main.py`, add:

```python
from routers import usage_stats

app.include_router(usage_stats.router)
```

### Step 6: Create Frontend Usage Dashboard Component

Create `frontend/src/components/UsageStatsDashboard.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, FileAudio, HardDrive, TrendingUp } from 'lucide-react';

interface UsageStats {
  total_files_uploaded: number;
  total_files_processed: number;
  total_files_failed: number;
  total_files_downloaded: number;
  total_input_size_mb: number;
  total_output_size_mb: number;
  average_file_size_mb: number;
  total_processing_time_minutes: number;
  average_processing_time_seconds: number;
  processing_types_breakdown: Record<string, number>;
  success_rate_percent: number;
  first_upload_at: string | null;
  last_upload_at: string | null;
  api_calls_count: number;
  user_type: string;
}

export default function UsageStatsDashboard() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const headers: Record<string, string> = {};

      if (isAuthenticated) {
        const token = localStorage.getItem('access_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } else {
        const guestId = localStorage.getItem('guestId');
        if (guestId) headers['X-Guest-ID'] = guestId;
      }

      const response = await fetch('http://localhost:8000/usage/me', { headers });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Files Processed */}
      <Card className="bg-white/80 backdrop-blur-xl border border-teal-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <FileAudio className="w-4 h-4 text-teal-600" />
            Files Processed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            {stats.total_files_processed}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {stats.total_files_failed} failed • {stats.success_rate_percent}% success
          </p>
        </CardContent>
      </Card>

      {/* Storage Used */}
      <Card className="bg-white/80 backdrop-blur-xl border border-teal-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-600" />
            Storage Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            {stats.total_input_size_mb.toFixed(1)} MB
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Avg: {stats.average_file_size_mb.toFixed(2)} MB per file
          </p>
        </CardContent>
      </Card>

      {/* Processing Time */}
      <Card className="bg-white/80 backdrop-blur-xl border border-teal-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Processing Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            {stats.total_processing_time_minutes.toFixed(1)} min
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Avg: {stats.average_processing_time_seconds.toFixed(1)}s per file
          </p>
        </CardContent>
      </Card>

      {/* API Calls */}
      <Card className="bg-white/80 backdrop-blur-xl border border-teal-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            API Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            {stats.api_calls_count}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {stats.user_type === 'authenticated' ? 'Authenticated' : 'Guest'} user
          </p>
        </CardContent>
      </Card>

      {/* Processing Types Breakdown */}
      {Object.keys(stats.processing_types_breakdown).length > 0 && (
        <Card className="bg-white/80 backdrop-blur-xl border border-teal-100 md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              Processing Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.processing_types_breakdown).map(([type, count]) => (
                <div key={type} className="text-center">
                  <div className="text-xl font-bold text-slate-800">{count}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    {type.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Usage Limits Implementation

You can enforce usage limits before allowing uploads:

```python
from usage_tracking import check_usage_limit

@router.post("/upload")
async def upload_audio(...):
    # Check limits before processing
    if not current_user:  # Guest user
        within_limit, message = check_usage_limit(
            db,
            guest_id=guest_id,
            limit_type="files_per_day",
            limit_value=5
        )
        if not within_limit:
            raise HTTPException(status_code=429, detail=message)

    # Proceed with upload...
```

## Analytics Dashboard (Admin)

For admin analytics, you can query aggregated statistics:

```python
@router.get("/admin/analytics")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get platform-wide analytics"""

    # Total users
    total_users = db.query(User).count()

    # Total guests
    total_guests = db.query(UserUsageStats).filter(
        UserUsageStats.guest_id.isnot(None)
    ).count()

    # Total files processed
    all_stats = db.query(UserUsageStats).all()
    total_files = sum(s.total_files_processed for s in all_stats)
    total_storage_mb = sum(s.total_input_size for s in all_stats) / (1024 * 1024)
    total_processing_minutes = sum(s.total_processing_time for s in all_stats) / 60

    # Processing types breakdown
    processing_breakdown = {}
    for stats in all_stats:
        if stats.processing_types_count:
            for ptype, count in stats.processing_types_count.items():
                processing_breakdown[ptype] = processing_breakdown.get(ptype, 0) + count

    return {
        "total_users": total_users,
        "total_guests": total_guests,
        "total_files_processed": total_files,
        "total_storage_mb": round(total_storage_mb, 2),
        "total_processing_minutes": round(total_processing_minutes, 2),
        "processing_types_breakdown": processing_breakdown
    }
```

## Testing

1. **Upload a file** → Check that `total_files_uploaded` increments
2. **Complete processing** → Check that `total_files_processed` increments
3. **Download file** → Check that `total_files_downloaded` increments
4. **Call `/usage/me`** → Get your usage statistics
5. **Call `/usage/limits`** → Check your usage limits

## Future Enhancements

1. **Daily/Monthly Aggregations**: Store daily summaries for better analytics
2. **Usage Notifications**: Alert users when approaching limits
3. **Billing Integration**: Use usage data for subscription billing
4. **Rate Limiting**: Implement API rate limiting based on usage
5. **Export Data**: Allow users to export their usage data
6. **Comparison Charts**: Show usage trends over time

## Summary

This implementation provides:
- ✅ Comprehensive usage tracking for all users and guests
- ✅ Real-time statistics
- ✅ Usage limit checking
- ✅ Admin analytics
- ✅ Frontend dashboard component
- ✅ Foundation for future features (billing, rate limiting, etc.)

All tracking happens automatically as users interact with your application!
