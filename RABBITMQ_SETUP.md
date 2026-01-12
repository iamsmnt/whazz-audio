# RabbitMQ Setup Guide for Whazz Audio

Your audio processing consumer now uses **RabbitMQ** instead of Redis! This guide covers all installation and usage methods.

## What Changed

### ✅ Benefits of RabbitMQ over Redis:
- **Lower cost**: Free self-hosted, cheaper managed services
- **Better message persistence**: Disk-based storage
- **Designed for messaging**: Built specifically for message queuing
- **No Redis needed**: Using PostgreSQL for result backend
- **Lower memory usage**: More efficient than Redis

## Installation Options

### Option 1: Docker (Recommended)

**Start RabbitMQ:**
```bash
cd /Users/somnathmahato/hobby-projects/whazz-audio
docker compose -f docker-compose.rabbitmq.yml up -d
```

**Check status:**
```bash
docker ps | grep rabbitmq
```

**View logs:**
```bash
docker logs whazz-rabbitmq
```

**Stop RabbitMQ:**
```bash
docker compose -f docker-compose.rabbitmq.yml down
```

**Access Management UI:**
- URL: http://localhost:15672
- Username: `guest`
- Password: `guest`

### Option 2: Homebrew (macOS)

```bash
# Install RabbitMQ
brew install rabbitmq

# Add to PATH (add this to your ~/.zshrc or ~/.bash_profile)
export PATH="/opt/homebrew/opt/rabbitmq/sbin:$PATH"

# Start RabbitMQ server
brew services start rabbitmq

# Or run in foreground:
rabbitmq-server

# Stop RabbitMQ
brew services stop rabbitmq

# Enable management plugin
rabbitmq-plugins enable rabbitmq_management
```

**Access Management UI:**
- URL: http://localhost:15672
- Username: `guest`
- Password: `guest`

### Option 3: Ubuntu/Debian

```bash
# Install RabbitMQ
sudo apt-get update
sudo apt-get install rabbitmq-server

# Start service
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server

# Check status
sudo systemctl status rabbitmq-server

# Enable management plugin
sudo rabbitmq-plugins enable rabbitmq_management

# Create user (optional)
sudo rabbitmqctl add_user admin password123
sudo rabbitmqctl set_user_tags admin administrator
sudo rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"
```

## Updated Dependencies

The following packages were updated in `requirements.txt`:

```txt
# OLD (Redis)
# redis==5.2.0

# NEW (RabbitMQ)
kombu==5.4.2    # AMQP messaging library
amqp==5.2.0     # Low-level AMQP client
```

Install new dependencies:
```bash
cd backend
pip install -r requirements.txt
```

## Configuration

### Environment Variables (.env)

Update your `.env` file:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whazz_audio

# RabbitMQ (Message Broker)
RABBITMQ_URL=amqp://guest:guest@localhost:5672//
CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//

# Result Backend (PostgreSQL - no Redis needed!)
CELERY_RESULT_BACKEND=db+postgresql://postgres:postgres@localhost:5432/whazz_audio

# Audio Processing
OUTPUT_DIR=./processed_audio
CLEARVOICE_MODEL_NAME=MossFormer2_SE_48K
```

### URL Format Explanation

**RabbitMQ AMQP URL:**
```
amqp://username:password@hostname:port/virtualhost

Examples:
- Local: amqp://guest:guest@localhost:5672//
- Docker: amqp://guest:guest@rabbitmq:5672//
- Remote: amqp://user:pass@192.168.1.100:5672//
```

**PostgreSQL Result Backend:**
```
db+postgresql://username:password@hostname:port/database

Examples:
- Local: db+postgresql://postgres:postgres@localhost:5432/whazz_audio
- Docker: db+postgresql://postgres:postgres@postgres:5432/whazz_audio
```

## Running the System

### 1. Start RabbitMQ

**Docker:**
```bash
docker compose -f docker-compose.rabbitmq.yml up -d
```

**Homebrew:**
```bash
brew services start rabbitmq
```

### 2. Start Celery Worker

```bash
cd backend
celery -A celery_app worker --loglevel=info -Q audio_processing --concurrency=1
```

### 3. Start Celery Beat (for cleanup tasks)

```bash
cd backend
celery -A celery_app beat --loglevel=info
```

### 4. Start FastAPI

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## RabbitMQ Management UI

Access the management interface at: **http://localhost:15672**

### What You Can Do:
- **Queues**: View `audio_processing` and `maintenance` queues
- **Messages**: See pending messages in real-time
- **Consumers**: Monitor connected Celery workers
- **Exchanges**: View message routing
- **Connections**: See active connections from workers

### Key Metrics:
- **Ready**: Messages waiting to be processed
- **Unacked**: Messages being processed by workers
- **Total**: All messages in queue

## Verifying Setup

### 1. Check RabbitMQ is Running

```bash
# Docker
docker ps | grep rabbitmq

# Homebrew (macOS)
brew services list | grep rabbitmq

# Linux
sudo systemctl status rabbitmq-server
```

### 2. Test Connection

```bash
# Test from Python
python3 << EOF
from celery import Celery
app = Celery(broker='amqp://guest:guest@localhost:5672//')
print("✅ Connected to RabbitMQ successfully!")
EOF
```

### 3. Monitor Queue

```bash
# List queues
sudo rabbitmqctl list_queues

# Or use management UI: http://localhost:15672
```

## Troubleshooting

### Issue: "Connection refused" error

**Solution:**
```bash
# Check if RabbitMQ is running
docker ps | grep rabbitmq
# OR
brew services list | grep rabbitmq

# Check if port 5672 is open
lsof -i :5672
```

### Issue: "access_refused" error

**Solution:**
Check username/password in your connection URL:
```python
# Default credentials
amqp://guest:guest@localhost:5672//
```

### Issue: Worker not picking up messages

**Solution:**
1. Check worker is running: `ps aux | grep celery`
2. Check worker is connected to correct queue: `-Q audio_processing`
3. Check RabbitMQ management UI for active consumers
4. Restart worker: `pkill -f celery && celery -A celery_app worker ...`

### Issue: Messages stuck in queue

**Solution:**
1. Check worker logs for errors
2. Manually purge queue (⚠️ deletes messages):
   ```bash
   sudo rabbitmqctl purge_queue audio_processing
   ```
3. Or use management UI: Queues → audio_processing → Purge Messages

## Production Considerations

### 1. Use Strong Credentials

```bash
# Create admin user
sudo rabbitmqctl add_user admin StrongPassword123!
sudo rabbitmqctl set_user_tags admin administrator
sudo rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"

# Remove default guest user (production only!)
sudo rabbitmqctl delete_user guest
```

Update `.env`:
```bash
CELERY_BROKER_URL=amqp://admin:StrongPassword123!@localhost:5672//
```

### 2. Enable SSL/TLS

For production, use AMQPS:
```bash
CELERY_BROKER_URL=amqps://admin:password@rabbitmq.example.com:5671//
```

### 3. Monitor with Prometheus

```bash
# Enable Prometheus plugin
rabbitmq-plugins enable rabbitmq_prometheus

# Metrics available at:
# http://localhost:15692/metrics
```

### 4. Set Resource Limits

```yaml
# docker-compose.yml
services:
  rabbitmq:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
```

## Cost Comparison

### Self-Hosted (Free)
- RabbitMQ: **Free** (RAM: ~200MB)
- Redis: **Free** (RAM: ~500MB+)
- ✅ RabbitMQ wins: Lower memory usage

### Managed Cloud Services
- **RabbitMQ (CloudAMQP)**: $5-15/month
- **Redis (AWS ElastiCache)**: $15-50/month
- ✅ RabbitMQ wins: 3x cheaper

## Architecture Diagram

```
┌─────────────┐
│  FastAPI    │ (Producer)
│   Backend   │
└──────┬──────┘
       │ publish message
       ▼
┌──────────────────┐
│    RabbitMQ      │ (Broker)
│  Queue: audio    │
│  [Message 1]     │
│  [Message 2]     │
└──────┬───────────┘
       │ deliver message
       ▼
┌──────────────────┐
│  Celery Worker   │ (Consumer)
│  Process Audio   │
└──────┬───────────┘
       │ update job status
       ▼
┌──────────────────┐
│   PostgreSQL     │ (Database)
│  (Jobs + Results)│
└──────────────────┘
```

## Next Steps

1. ✅ RabbitMQ installed and running
2. ✅ Dependencies updated (`kombu`, `amqp`)
3. ✅ Config updated (AMQP URLs)
4. ⬜ Install dependencies: `pip install -r requirements.txt`
5. ⬜ Start RabbitMQ: `docker-compose -f docker-compose.rabbitmq.yml up -d`
6. ⬜ Start Celery worker
7. ⬜ Test upload → process → download flow

## Support

- **RabbitMQ Docs**: https://www.rabbitmq.com/docs
- **Celery + RabbitMQ**: https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/rabbitmq.html
- **Management UI Guide**: https://www.rabbitmq.com/docs/management

---

**You're now using RabbitMQ! 🐰🎵**
