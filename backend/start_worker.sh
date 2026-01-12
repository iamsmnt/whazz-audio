#!/bin/bash
# Start Celery worker for audio processing
# This script handles macOS-specific issues

set -e

echo "Starting Celery worker for Whazz Audio..."

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Detect OS
OS="$(uname -s)"

if [ "$OS" = "Darwin" ]; then
    echo "Detected macOS - using solo pool to avoid fork() issues"
    # On macOS, use solo pool to avoid fork() issues with Metal/PyTorch
    exec celery -A celery_app worker \
        --loglevel=info \
        -Q audio_processing \
        --pool=solo \
        --hostname=audio_worker@%h
else
    echo "Detected $OS - using prefork pool"
    # On Linux, use default prefork pool for better performance
    exec celery -A celery_app worker \
        --loglevel=info \
        -Q audio_processing \
        --concurrency=1 \
        --hostname=audio_worker@%h
fi
