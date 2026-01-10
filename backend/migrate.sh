#!/bin/bash

# Database migration helper script for Alembic

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from backend directory
if [ ! -f "main.py" ]; then
    echo -e "${RED}❌ Error: Please run this script from the backend directory${NC}"
    exit 1
fi

# Check if alembic is initialized
if [ ! -d "alembic" ]; then
    echo -e "${RED}❌ Error: Alembic is not initialized${NC}"
    echo "Run: ./init_alembic.sh"
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Database Migration Helper"
    echo ""
    echo "Usage: ./migrate.sh [command]"
    echo ""
    echo "Commands:"
    echo "  init              - Create initial migration"
    echo "  create [message]  - Create a new migration"
    echo "  upgrade           - Apply all pending migrations"
    echo "  downgrade         - Rollback one migration"
    echo "  current           - Show current migration version"
    echo "  history           - Show migration history"
    echo "  reset             - Downgrade all migrations"
    echo "  help              - Show this help message"
    echo ""
}

# Parse command
case "$1" in
    init)
        echo -e "${GREEN}Creating initial migration...${NC}"
        alembic revision --autogenerate -m "Initial migration"
        echo ""
        echo -e "${GREEN}✓ Initial migration created${NC}"
        echo "Apply it with: ./migrate.sh upgrade"
        ;;

    create)
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Error: Migration message required${NC}"
            echo "Usage: ./migrate.sh create \"Your migration message\""
            exit 1
        fi
        echo -e "${GREEN}Creating new migration...${NC}"
        alembic revision --autogenerate -m "$2"
        echo ""
        echo -e "${GREEN}✓ Migration created${NC}"
        echo "Apply it with: ./migrate.sh upgrade"
        ;;

    upgrade)
        echo -e "${GREEN}Applying migrations...${NC}"
        alembic upgrade head
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ Migrations applied successfully${NC}"
        else
            echo ""
            echo -e "${RED}❌ Migration failed${NC}"
            exit 1
        fi
        ;;

    downgrade)
        echo -e "${YELLOW}⚠️  Rolling back one migration...${NC}"
        alembic downgrade -1
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ Rollback successful${NC}"
        else
            echo ""
            echo -e "${RED}❌ Rollback failed${NC}"
            exit 1
        fi
        ;;

    current)
        echo -e "${GREEN}Current migration version:${NC}"
        alembic current
        ;;

    history)
        echo -e "${GREEN}Migration history:${NC}"
        alembic history --verbose
        ;;

    reset)
        echo -e "${RED}⚠️  WARNING: This will rollback ALL migrations${NC}"
        read -p "Are you sure? (yes/N): " -r
        echo
        if [[ $REPLY == "yes" ]]; then
            echo -e "${YELLOW}Resetting database...${NC}"
            alembic downgrade base
            echo -e "${GREEN}✓ Database reset to base${NC}"
        else
            echo "Cancelled"
        fi
        ;;

    help|--help|-h)
        show_usage
        ;;

    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
