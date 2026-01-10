#!/bin/bash

# Script to initialize Alembic for database migrations

echo "Initializing Alembic for database migrations..."
echo ""

# Check if running from backend directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if alembic is installed
if ! python3 -c "import alembic" 2>/dev/null; then
    echo "Installing alembic..."
    pip install alembic==1.14.0
fi

# Check if alembic is already initialized
if [ -d "alembic" ]; then
    echo "⚠️  Alembic is already initialized"
    read -p "Do you want to reinitialize? This will remove existing migrations. (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing alembic directory..."
        rm -rf alembic
        rm -f alembic.ini
    else
        echo "Keeping existing configuration"
        exit 0
    fi
fi

# Initialize alembic
echo "Initializing alembic..."
alembic init alembic

# Update alembic.ini to use our database URL from config
echo "Configuring alembic.ini..."
sed -i.bak 's|sqlalchemy.url = driver://user:pass@localhost/dbname|# sqlalchemy.url is set in env.py from config.py|' alembic.ini
rm alembic.ini.bak 2>/dev/null || true

# Update env.py to import our models and config
echo "Configuring env.py..."
cat > alembic/env.py << 'EOF'
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import sys
from pathlib import Path

# Add parent directory to path to import our modules
sys.path.append(str(Path(__file__).parent.parent))

# Import our config and models
from config import get_settings
from database import Base
from models import User, TokenBlacklist  # Import all models

# this is the Alembic Config object
config = context.config

# Get database URL from our settings
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
EOF

echo "✓ Alembic initialized successfully!"
echo ""
echo "Next steps:"
echo "  1. Create initial migration:"
echo "     alembic revision --autogenerate -m \"Initial migration\""
echo ""
echo "  2. Apply migrations to database:"
echo "     alembic upgrade head"
echo ""
echo "  3. To create new migrations after model changes:"
echo "     alembic revision --autogenerate -m \"Description of changes\""
echo ""
