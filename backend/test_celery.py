"""
Test script to verify Celery + RabbitMQ setup

This script tests:
1. Connection to RabbitMQ broker
2. Task queueing and execution
3. Database integration

Usage:
    python test_celery.py
"""

import os
import sys
from datetime import datetime, timedelta
from celery import Celery
from database import SessionLocal
from models import AudioProcessingJob
from config import get_settings

settings = get_settings()

def test_rabbitmq_connection():
    """Test 1: Verify RabbitMQ connection"""
    print("\n" + "="*60)
    print("TEST 1: Testing RabbitMQ Connection")
    print("="*60)

    try:
        app = Celery(broker=settings.celery_broker_url)
        # Try to inspect active queues
        inspect = app.control.inspect()
        stats = inspect.stats()

        if stats is None:
            print("❌ FAILED: No workers are running")
            print("   Start a worker with:")
            print("   celery -A celery_app worker --loglevel=info -Q audio_processing")
            return False
        else:
            print("✅ SUCCESS: Connected to RabbitMQ")
            print(f"   Broker: {settings.celery_broker_url}")
            print(f"   Active workers: {len(stats)}")
            return True
    except Exception as e:
        print(f"❌ FAILED: Could not connect to RabbitMQ")
        print(f"   Error: {str(e)}")
        print("   Make sure RabbitMQ is running:")
        print("   docker ps | grep rabbitmq")
        return False


def test_database_connection():
    """Test 2: Verify PostgreSQL connection"""
    print("\n" + "="*60)
    print("TEST 2: Testing PostgreSQL Connection")
    print("="*60)

    try:
        db = SessionLocal()
        # Try a simple query
        job_count = db.query(AudioProcessingJob).count()
        db.close()

        print("✅ SUCCESS: Connected to PostgreSQL")
        print(f"   Database: whazz_audio")
        print(f"   Total jobs in database: {job_count}")
        return True
    except Exception as e:
        print(f"❌ FAILED: Could not connect to PostgreSQL")
        print(f"   Error: {str(e)}")
        return False


def test_task_queueing():
    """Test 3: Test task queueing (without execution)"""
    print("\n" + "="*60)
    print("TEST 3: Testing Task Queueing")
    print("="*60)

    try:
        # Import the task
        from tasks import process_audio_task

        # Create a dummy job in database
        db = SessionLocal()

        test_job = AudioProcessingJob(
            filename="test_audio.wav",
            original_filename="test_audio.wav",
            file_size=1024,
            file_format="wav",
            input_file_path="./test_audio.wav",
            status="pending",
            progress=0.0,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )

        db.add(test_job)
        db.commit()
        db.refresh(test_job)

        job_id = test_job.job_id
        print(f"   Created test job: {job_id}")

        # Queue the task (don't wait for result)
        task = process_audio_task.delay(job_id)

        print(f"✅ SUCCESS: Task queued successfully")
        print(f"   Task ID: {task.id}")
        print(f"   Job ID: {job_id}")
        print(f"   Queue: audio_processing")
        print("\n   NOTE: This task will fail because test_audio.wav doesn't exist.")
        print("   Check worker logs to see the task being picked up.")

        # Clean up test job
        db.delete(test_job)
        db.commit()
        db.close()

        return True
    except Exception as e:
        print(f"❌ FAILED: Could not queue task")
        print(f"   Error: {str(e)}")
        return False


def test_rabbitmq_management_ui():
    """Test 4: Check RabbitMQ Management UI"""
    print("\n" + "="*60)
    print("TEST 4: RabbitMQ Management UI")
    print("="*60)

    print("   Access the management UI at: http://localhost:15672")
    print("   Username: guest")
    print("   Password: guest")
    print("\n   You should see:")
    print("   - Queues tab → 'audio_processing' queue")
    print("   - Connections tab → Active worker connections")
    print("   - Overview tab → Message rates")


def main():
    print("\n" + "="*60)
    print("CELERY + RABBITMQ TESTING SUITE")
    print("="*60)

    results = []

    # Run tests
    results.append(("RabbitMQ Connection", test_rabbitmq_connection()))
    results.append(("PostgreSQL Connection", test_database_connection()))
    results.append(("Task Queueing", test_task_queueing()))

    test_rabbitmq_management_ui()

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")

    total_passed = sum(1 for _, passed in results if passed)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")

    if total_passed == len(results):
        print("\n🎉 All tests passed! Your setup is working correctly.")
        print("\nNext steps:")
        print("1. Start FastAPI: uvicorn main:app --reload")
        print("2. Upload a real audio file via /audio/upload endpoint")
        print("3. Monitor progress via /audio/status/{job_id}")
        print("4. Download processed file via /audio/download/{job_id}")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")

    return total_passed == len(results)


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
