#!/bin/bash

# Run the FastAPI application

# Check if running from backend directory
if [ ! -f "main.py" ]; then
    echo "Error: Please run this script from the backend directory"
    echo "Usage: cd backend && ./run.sh"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

echo "Starting Whazz Audio Authentication API..."
echo "API will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
