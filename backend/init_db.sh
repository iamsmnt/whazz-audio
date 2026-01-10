#!/bin/bash

# Script to initialize PostgreSQL database for Whazz Audio API

echo "Initializing PostgreSQL database for Whazz Audio..."
echo ""

# Default values
DB_NAME="whazz_audio"
DB_USER="postgres"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed or not in PATH"
    echo ""
    echo "Install PostgreSQL:"
    echo "  macOS: brew install postgresql@16"
    echo "  Ubuntu: sudo apt install postgresql"
    exit 1
fi

echo "✓ PostgreSQL found"
echo ""

# Check if database already exists
if psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "⚠️  Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb -U $DB_USER $DB_NAME
        echo "✓ Database dropped"
    else
        echo "Keeping existing database"
        exit 0
    fi
fi

# Create database
echo "Creating database '$DB_NAME'..."
createdb -U $DB_USER $DB_NAME

if [ $? -eq 0 ]; then
    echo "✓ Database '$DB_NAME' created successfully"
    echo ""
    echo "Database connection details:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo ""
    echo "Update your .env file with:"
    echo "  DATABASE_URL=postgresql://$DB_USER:your_password@localhost:5432/$DB_NAME"
    echo ""
    echo "✓ Database initialization complete!"
else
    echo "❌ Failed to create database"
    echo ""
    echo "Common issues:"
    echo "  1. PostgreSQL service not running:"
    echo "     macOS: brew services start postgresql@16"
    echo "     Ubuntu: sudo systemctl start postgresql"
    echo ""
    echo "  2. Authentication failed:"
    echo "     - Check your PostgreSQL user credentials"
    echo "     - You may need to run: sudo -u postgres createdb $DB_NAME"
    exit 1
fi
