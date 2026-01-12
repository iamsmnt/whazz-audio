# Testing Celery + RabbitMQ Setup

This guide shows you how to test your audio processing system end-to-end.

## Prerequisites

Make sure these are running:

```bash
# 1. Check RabbitMQ is running
docker ps | grep rabbitmq

# 2. Check PostgreSQL is running (if using Docker)
docker ps | grep postgres
# OR if local:
psql -U postgres -c "SELECT version();"

# 3. Check you're in the virtual environment
which python  # Should show: .../backend/venv/bin/python
```

---

## Method 1: Automated Test Script

The easiest way to test everything at once:

```bash
cd backend
source venv/bin/activate
python test_celery.py
```

This will test:
- ✅ RabbitMQ connection
- ✅ PostgreSQL connection
- ✅ Task queueing
- ✅ Celery worker detection

---

## Method 2: Manual Step-by-Step Testing

### Step 1: Start RabbitMQ

```bash
# If using Docker:
docker compose -f docker-compose.rabbitmq.yml up -d

# If using Homebrew:
brew services start rabbitmq
```

**Verify:**
```bash
docker logs whazz-rabbitmq | tail -20
# Should see: "Server startup complete"
```

### Step 2: Start Celery Worker

Open a new terminal:

```bash
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info -Q audio_processing --concurrency=1
```

**Expected output:**
```
 -------------- celery@hostname v5.4.0
---- **** -----
--- * ***  * -- Darwin-25.2.0-arm64-arm-64bit 2026-01-11 20:00:00
-- * - **** ---
- ** ---------- [config]
- ** ---------- .> app:         whazz_audio_worker:0x...
- ** ---------- .> transport:   amqp://guest:**@localhost:5672//
- ** ---------- .> results:     postgresql://postgres:**@localhost/whazz_audio
- *** --- * --- .> concurrency: 1 (prefork)
-- ******* ---- .> task events: OFF (enable -E to monitor)
--- ***** -----
 -------------- [queues]
                .> audio_processing exchange=audio_processing(direct) key=audio_processing

[tasks]
  . tasks.cleanup_expired_files
  . tasks.process_audio_task

[2026-01-11 20:00:00,000: INFO/MainProcess] Connected to amqp://guest:**@localhost:5672//
[2026-01-11 20:00:00,000: INFO/MainProcess] mingle: searching for neighbors
[2026-01-11 20:00:00,000: INFO/MainProcess] mingle: all alone
[2026-01-11 20:00:00,000: INFO/MainProcess] celery@hostname ready.
```

### Step 3: Test Task Queueing (Python Console)

Open another terminal:

```bash
cd backend
source venv/bin/activate
python
```

In Python console:

```python
from tasks import process_audio_task
from celery_app import celery_app

# Test 1: Check broker connection
inspect = celery_app.control.inspect()
print("Active workers:", inspect.active())
print("Registered tasks:", inspect.registered())

# Test 2: Queue a dummy task
task = process_audio_task.delay("test-job-id")
print(f"Task ID: {task.id}")
print(f"Task state: {task.state}")

# Note: This will fail because test-job-id doesn't exist in DB
# But you should see the worker pick it up!
```

**Check worker terminal** - you should see:
```
[2026-01-11 20:00:00,000: INFO/MainProcess] Task tasks.process_audio_task[xxx] received
[2026-01-11 20:00:00,000: ERROR/ForkPoolWorker-1] Task tasks.process_audio_task[xxx] raised unexpected: ValueError('Job test-job-id not found')
```

### Step 4: Test with Real Audio File

Start FastAPI in another terminal:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Upload a test audio file:**

```bash
# Create a dummy WAV file for testing (or use a real one)
curl -X POST "http://localhost:8000/audio/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/audio.wav"
```

**Response:**
```json
{
  "job_id": "abc-123-def-456",
  "status": "pending",
  "filename": "uuid.wav",
  "original_filename": "audio.wav",
  "message": "File uploaded successfully. Processing will begin shortly."
}
```

**Check status:**
```bash
curl "http://localhost:8000/audio/status/abc-123-def-456"
```

**Watch the worker terminal** - you should see:
```
[2026-01-11 20:00:01,000: INFO/MainProcess] Task tasks.process_audio_task[xxx] received
[2026-01-11 20:00:01,000: INFO/ForkPoolWorker-1] Processing job abc-123-def-456
[2026-01-11 20:00:05,000: INFO/ForkPoolWorker-1] Task tasks.process_audio_task[xxx] succeeded in 4.0s
```

**Download processed file:**
```bash
curl "http://localhost:8000/audio/download/abc-123-def-456" \
  -o processed_audio.wav
```

---

## Method 3: RabbitMQ Management UI

### Access the UI

Open in browser: **http://localhost:15672**

**Login:**
- Username: `guest`
- Password: `guest`

### What to Check

**1. Overview Tab:**
- Message rate should increase when you upload files
- Connections should show 1+ active connections (Celery worker)

**2. Queues Tab:**
- Click on `audio_processing` queue
- **Ready**: Number of pending messages
- **Unacked**: Number of messages being processed
- **Total**: All messages

**3. Connections Tab:**
- Should show connection from Celery worker
- Protocol: AMQP 0-9-1
- State: running

**4. Channels Tab:**
- Should show active channels from worker
- Prefetch count: 1 (as configured)

---

## Method 4: Monitor with Flower (Optional)

Flower is a web-based monitoring tool for Celery.

**Install:**
```bash
pip install flower
```

**Run:**
```bash
celery -A celery_app flower --port=5555
```

**Access:** http://localhost:5555

**Features:**
- Real-time task monitoring
- Worker status and statistics
- Task history and details
- Task execution graphs

---

## Troubleshooting

### Issue: Worker can't connect to RabbitMQ

**Error:**
```
consumer: Cannot connect to amqp://guest:**@localhost:5672//
```

**Solution:**
```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check RabbitMQ logs
docker logs whazz-rabbitmq

# Restart RabbitMQ
docker compose -f docker-compose.rabbitmq.yml restart
```

### Issue: Worker can't connect to PostgreSQL

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -U postgres -h localhost -d whazz_audio -c "SELECT 1;"

# Check credentials in backend/.env
cat .env | grep DATABASE_URL
```

### Issue: Tasks stuck in "pending"

**Check:**
1. Worker is running and connected
2. Worker is listening to correct queue (`audio_processing`)
3. RabbitMQ Management UI shows messages in queue

**Solution:**
```bash
# Restart worker
# Kill existing worker (Ctrl+C)
celery -A celery_app worker --loglevel=info -Q audio_processing --concurrency=1
```

### Issue: Import errors (ModuleNotFoundError)

**Error:**
```
ModuleNotFoundError: No module named 'clearvoice'
```

**Solution:**
```bash
# Make sure you're in virtual environment
source venv/bin/activate

# Install missing dependencies
pip install clearvoice-pytorch  # or whatever package is missing
```

---

## Quick Test Commands

### 1. Test RabbitMQ is running:
```bash
docker exec whazz-rabbitmq rabbitmqctl status
```

### 2. List RabbitMQ queues:
```bash
docker exec whazz-rabbitmq rabbitmqctl list_queues
```

### 3. Purge queue (delete all messages):
```bash
docker exec whazz-rabbitmq rabbitmqctl purge_queue audio_processing
```

### 4. Check Celery worker status:
```bash
celery -A celery_app inspect active
celery -A celery_app inspect registered
celery -A celery_app inspect stats
```

### 5. Test database connection:
```bash
python -c "from database import SessionLocal; db = SessionLocal(); print('✅ DB connected'); db.close()"
```

---

## Expected Flow

```
1. Client uploads audio file
   ↓
2. FastAPI creates job in DB (status="pending")
   ↓
3. FastAPI queues Celery task → RabbitMQ
   ↓
4. RabbitMQ stores message in "audio_processing" queue
   ↓
5. Celery Worker polls queue and receives message
   ↓
6. Worker updates DB (status="processing", progress=5%)
   ↓
7. Worker initializes ClearVoice model (progress=20%)
   ↓
8. Worker processes audio (progress=50% → 90%)
   ↓
9. Worker saves output file (progress=100%)
   ↓
10. Worker updates DB (status="completed")
    ↓
11. Client downloads processed file
```

---

## Success Indicators

✅ **RabbitMQ Management UI shows:**
- 1+ connections (Celery worker)
- `audio_processing` queue exists
- Messages flow through queue

✅ **Celery Worker logs show:**
- "Connected to amqp://..."
- "celery@hostname ready"
- Tasks being received and completed

✅ **Database shows:**
- Job status changes: pending → processing → completed
- Progress updates: 0% → 5% → 20% → 50% → 90% → 100%

✅ **File system shows:**
- Input files in `./uploads/`
- Output files in `./processed_audio/`

---

## Performance Testing

### Test with multiple files:

```bash
# Upload 10 files concurrently
for i in {1..10}; do
  curl -X POST "http://localhost:8000/audio/upload" \
    -F "file=@test_audio.wav" &
done
wait
```

**Watch RabbitMQ Management UI:**
- Queue depth should spike then decrease
- Message rate should increase
- Worker should process them one by one (concurrency=1)

---

## Next Steps

Once all tests pass:

1. **Production Setup:**
   - Use strong RabbitMQ credentials
   - Enable SSL/TLS for RabbitMQ
   - Set up monitoring (Prometheus + Grafana)
   - Configure log aggregation

2. **Scaling:**
   - Run multiple workers: `--concurrency=2`
   - Run workers on different machines
   - Use shared storage for files (NFS/S3)

3. **Optimization:**
   - Add GPU support for ClearVoice
   - Implement task retries
   - Add progress callbacks
   - Optimize model loading
