# Whazz Audio Authentication API

A FastAPI-based authentication system with JWT tokens for user management.

## Features

- User registration (signup)
- User login with JWT tokens
- Token refresh mechanism
- User logout with token blacklisting
- Password hashing with bcrypt
- SQLAlchemy ORM with PostgreSQL database
- CORS enabled
- Input validation with Pydantic

## Prerequisites

### PostgreSQL Database

This application uses PostgreSQL as its database. You need to have PostgreSQL installed and running.

#### Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [PostgreSQL Official Website](https://www.postgresql.org/download/windows/)

#### Create Database

Once PostgreSQL is installed, create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql, create the database
CREATE DATABASE whazz_audio;

# Create a user (optional, if not using default postgres user)
CREATE USER whazz_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE whazz_audio TO whazz_user;

# Exit psql
\q
```

Or use a one-liner:
```bash
createdb -U postgres whazz_audio
```

**Quick Database Setup (Recommended):**

We provide a script to automate database creation:
```bash
cd backend
./init_db.sh
```

This script will:
- Check if PostgreSQL is installed
- Create the `whazz_audio` database
- Provide connection details for your `.env` file

## Installation

### Quick Setup (Recommended)

```bash
cd backend
./setup.sh
```

This will:
- Create a virtual environment
- Install all dependencies
- Create `.env` file from template

### Manual Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file from the example:
```bash
cp .env.example .env
```

5. Edit `.env` and configure your database connection and security settings.

## Configuration

### Database Configuration

Edit your `.env` file to configure the PostgreSQL connection:

```bash
# PostgreSQL connection string format:
DATABASE_URL=postgresql://username:password@host:port/database_name

# Example with default PostgreSQL settings:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whazz_audio

# Or configure individual settings:
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=whazz_audio
```

**Important:** Make sure to:
1. Replace `postgres:postgres` with your actual PostgreSQL username and password
2. Ensure the database `whazz_audio` exists (created in Prerequisites step)
3. Set a strong `SECRET_KEY` (generate using: `openssl rand -hex 32`)

### Using SQLite (Development Only)

If you prefer to use SQLite for development/testing, uncomment this line in `.env`:

```bash
DATABASE_URL=sqlite:///./whazz_audio.db
```

And comment out the PostgreSQL `DATABASE_URL`.

## Database Migrations with Alembic

This project uses Alembic for database schema migrations. Migrations allow you to version control your database schema and safely apply changes.

### Initial Setup

#### Quick Setup (Recommended)

```bash
cd backend
./init_alembic.sh
```

This will:
- Install Alembic
- Initialize Alembic configuration
- Configure `env.py` to use your database settings

#### Manual Setup

```bash
# Install alembic
pip install alembic

# Initialize alembic
alembic init alembic

# Then manually configure alembic/env.py (see init_alembic.sh for reference)
```

### Creating and Applying Migrations

#### Using the Helper Script (Recommended)

```bash
# Create initial migration
./migrate.sh init

# Apply migrations
./migrate.sh upgrade

# Create new migration after model changes
./migrate.sh create "Add user profile fields"

# Show current migration version
./migrate.sh current

# Show migration history
./migrate.sh history

# Rollback one migration
./migrate.sh downgrade

# Reset database (rollback all)
./migrate.sh reset
```

#### Using Alembic Commands Directly

```bash
# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply all pending migrations
alembic upgrade head

# Create new migration after changing models
alembic revision --autogenerate -m "Add new field to User"

# Rollback one migration
alembic downgrade -1

# Rollback all migrations
alembic downgrade base

# Show current version
alembic current

# Show migration history
alembic history --verbose
```

### Migration Workflow

1. **Make changes to your models** (e.g., add a field to `User` in `models.py`)

2. **Create a migration:**
   ```bash
   ./migrate.sh create "Description of changes"
   # or
   alembic revision --autogenerate -m "Description of changes"
   ```

3. **Review the generated migration** in `alembic/versions/`

4. **Apply the migration:**
   ```bash
   ./migrate.sh upgrade
   # or
   alembic upgrade head
   ```

### Important Notes

- **Always review autogenerated migrations** before applying them
- Alembic detects most schema changes but may miss some (like column renames)
- Migrations are applied in order based on revision history
- Keep migrations in version control
- Test migrations on development database before production

### Common Migration Scenarios

**Add a new field:**
```python
# In models.py
class User(Base):
    # ... existing fields ...
    phone_number = Column(String, nullable=True)
```
```bash
./migrate.sh create "Add phone number to User"
./migrate.sh upgrade
```

**Remove a field:**
```python
# Remove the field from models.py
```
```bash
./migrate.sh create "Remove deprecated field"
./migrate.sh upgrade
```

**Rename a field (requires manual migration):**
```python
# Create migration manually
alembic revision -m "Rename username to user_name"
# Edit the generated migration file to use op.alter_column()
```

## Running the Application

### Quick Start

```bash
cd backend
./run.sh
```

### Manual Start

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

The API will be available at: `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Register a new user | No |
| POST | `/auth/login` | Login and get tokens | No |
| POST | `/auth/logout` | Logout (blacklist token) | Yes |
| POST | `/auth/refresh` | Refresh access token | No |
| GET | `/auth/me` | Get current user info | Yes |

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root endpoint |
| GET | `/health` | Health check |

## Usage Examples

### 1. Signup

```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "securepassword123"
  }'
```

### 2. Login

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "testuser",
    "password": "securepassword123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 3. Get Current User

```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer <your_access_token>"
```

### 4. Logout

```bash
curl -X POST "http://localhost:8000/auth/logout" \
  -H "Authorization: Bearer <your_access_token>"
```

### 5. Refresh Token

```bash
curl -X POST "http://localhost:8000/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<your_refresh_token>"
  }'
```

## Project Structure

```
backend/
├── __init__.py
├── main.py              # FastAPI application entry point
├── config.py            # Configuration settings
├── database.py          # Database setup and session management
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
├── auth.py              # Authentication utilities (JWT, password hashing)
├── dependencies.py      # FastAPI dependencies
├── routers/
│   ├── __init__.py
│   └── auth.py          # Authentication routes
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variables example
└── README.md            # This file
```

## Security Notes

1. **Change the SECRET_KEY**: Never use the default secret key in production. Generate a secure random key:
   ```bash
   openssl rand -hex 32
   ```

2. **Use HTTPS**: In production, always use HTTPS to protect tokens in transit.

3. **Database**: For production, use PostgreSQL or MySQL instead of SQLite.

4. **Token Expiration**: Adjust token expiration times based on your security requirements.

5. **Password Requirements**: Consider adding more password validation rules (uppercase, numbers, special chars, etc.).

## Database Migration

The application automatically creates tables on startup. For production, consider using Alembic for database migrations:

```bash
pip install alembic
alembic init alembic
# Configure alembic.ini and create migrations
```

## Future Enhancements

- Email verification
- Password reset functionality
- Rate limiting
- User roles and permissions
- OAuth2 integration (Google, GitHub, etc.)
- 2FA (Two-Factor Authentication)
- Account lockout after failed attempts

## License

MIT
