# AutoPhon Backend API

A modern RESTful API backend for the AutoPhon forced aligner web application, built with Flask-RESTful and SQLAlchemy.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [User Management](#user-management)
  - [Task Management](#task-management)
  - [Language & Engine Management](#language--engine-management)
  - [Dictionary Management](#dictionary-management)
  - [File Upload & Download](#file-upload--download)
  - [Aligner Operations](#aligner-operations)
  - [Admin Operations](#admin-operations)
  - [Configuration & Utilities](#configuration--utilities)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Development](#development)

## Overview

The AutoPhon Backend API provides a comprehensive set of endpoints for managing forced alignment tasks, user authentication, file uploads, dictionary management, and administrative operations. The API follows RESTful principles and uses JWT for authentication.

### Key Features

- **JWT Authentication** with refresh tokens and token blacklisting
- **File Upload & Processing** for audio alignment tasks
- **User Dictionary Management** with multi-language support
- **Task Management** with status tracking and cancellation
- **Admin Panel** with user management and site control
- **Anonymous User Support** with session-based limits
- **Site Status Management** with automatic user logout
- **Comprehensive Logging** and error handling

## Architecture

### Technology Stack

- **Framework**: Flask with Flask-RESTful
- **Database**: SQLAlchemy with SQL support
- **Authentication**: Flask-JWT-Extended
- **Validation**: Marshmallow schemas
- **File Processing**: Custom upload handlers
- **Logging**: Structured logging with request/response tracking

### Project Structure

```
backend/
├── app/
│   ├── __init__.py              # Application factory
│   ├── config.py                # Configuration settings
│   ├── extensions.py            # Flask extensions
│   ├── api/                     # API blueprints
│   │   ├── v1/                  # Version 1 API
│   │   └── admin/               # Admin API
│   ├── models/                  # SQLAlchemy models
│   ├── resources/               # Flask-RESTful resources
│   ├── schemas/                 # Marshmallow schemas
│   └── utils/                   # Utility functions
├── migrations/                  # Database migrations
└── run.py                      # Application entry point
```

## Setup & Installation

### Prerequisites

- Python 3.8+
- MySQL (or SQLite for development)
- Flask (for API development)

### Environment Variables

Create a `.env` file in the backend root:

```env
# Flask Configuration
FLASK_CONFIG=development
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=mysql://user:password@localhost/autophon

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# File Storage
UPLOADS=/path/to/uploads
CURRENT_DIR=/path/to/current
ADMIN=/path/to/admin-resources
```

### Installation

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Initialize database:**
   ```bash
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

4. **Run the application:**
   ```bash
   python run.py
   ```

The API will be available at `http://localhost:5000`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with the following features:

- **Access Tokens**: Short-lived (1 hour default) for API access
- **Refresh Tokens**: Long-lived (30 days default) for token renewal
- **Token Blacklisting**: Revoked tokens are tracked and blocked
- **Global Token Revocation**: Users can logout from all devices

### Authentication Flow

1. **Register/Login** to get access and refresh tokens
2. **Include access token** in all authenticated requests:
   ```
   Authorization: Bearer <access_token>
   ```
3. **Refresh tokens** when access token expires
4. **Logout** to blacklist current tokens

### Anonymous Users

The API supports anonymous users with session-based tracking:
- Daily task limits enforced via session cookies
- No account registration required
- Limited functionality compared to registered users

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "first_name": "John",
  "last_name": "Doe",
  "title": "Dr.",
  "org": "University",
  "industry": "Education"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "uuid": "abc123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "verified": false,
    "admin": false
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

#### Login User
```http
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "uuid": "abc123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

**Response (200):**
```json
{
  "access_token": "eyJ..."
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

#### Change Password
```http
PUT /api/v1/auth/change-password
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword"
}
```

#### Verify Token
```http
GET /api/v1/auth/verify
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

#### Logout All Devices
```http
POST /api/v1/auth/logout-all
Authorization: Bearer <access_token>
```

### User Management

#### Get User Profile
```http
GET /api/v1/profile
Authorization: Bearer <access_token>
```

#### Update User Profile
```http
PUT /api/v1/profile
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "org": "New Organization"
}
```

#### Get User Tasks
```http
GET /api/v1/users/{user_id}/tasks
Authorization: Bearer <access_token>
```

### Task Management

#### Create Task (File Upload)
```http
POST /api/v1/upload
Authorization: Bearer <access_token> (optional for anonymous)
Content-Type: multipart/form-data
```

**Form Data:**
- `files`: Audio files for alignment
- `transcription_mode`: `"batch"` or `"individual"`
- `language`: Language code (e.g., `"eng"`)
- `engine`: Engine code (e.g., `"mfa"`)

**Response (201):**
```json
{
  "message": "Files uploaded successfully",
  "task_id": "task_abc123",
  "files_processed": 2,
  "language": "English",
  "engine": "Montreal Forced Alignment"
}
```

#### Get Tasks List
```http
GET /api/v1/tasks
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 10)
- `status`: Filter by status (`pending`, `running`, `completed`, `failed`)

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "task_abc123",
      "status": "completed",
      "language": "English",
      "engine": "Montreal Forced Alignment",
      "files_count": 2,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 5,
    "pages": 1
  }
}
```

#### Get Task Details
```http
GET /api/v1/tasks/{task_id}
Authorization: Bearer <access_token>
```

#### Get Task Status
```http
GET /api/v1/tasks/{task_id}/status
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "task_id": "task_abc123",
  "status": "running",
  "progress": 75,
  "message": "Processing file 3 of 4",
  "estimated_completion": "2024-01-01T10:07:00Z"
}
```

#### Cancel Task
```http
PUT /api/v1/tasks/{task_id}/cancel
Authorization: Bearer <access_token>
```

#### Delete Tasks (Bulk)
```http
DELETE /api/v1/tasks/bulk-delete
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "task_ids": ["task_abc123", "task_def456"]
}
```

#### Get Task Files
```http
GET /api/v1/tasks/{task_id}/files
Authorization: Bearer <access_token>
```

#### Download Task Results
```http
GET /api/v1/tasks/{task_id}/download/{download_type}
Authorization: Bearer <access_token>
```

**Download Types:**
- `results`: Alignment results
- `audio`: Original audio files
- `transcripts`: Text transcripts

### Language & Engine Management

#### Get Languages
```http
GET /api/v1/languages
```

**Response (200):**
```json
{
  "languages": [
    {
      "id": 1,
      "name": "English",
      "code": "eng",
      "supported_engines": ["mfa", "gentle"]
    }
  ]
}
```

#### Get Language by Code
```http
GET /api/v1/languages/code/{code}
```

#### Get Engines
```http
GET /api/v1/engines
```

#### Get Engine by Code
```http
GET /api/v1/engines/code/{code}
```

### Dictionary Management

#### Upload User Dictionary
```http
POST /api/v1/dictionaries/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Dictionary file
- `language`: Language code

#### Get User Dictionaries
```http
GET /api/v1/dictionaries/user
Authorization: Bearer <access_token>
```

#### Delete User Dictionary
```http
DELETE /api/v1/dictionaries/user/{lang_code}
Authorization: Bearer <access_token>
```

### File Upload & Download

#### Upload Status (SSE)
```http
GET /api/v1/upload/status
Authorization: Bearer <access_token>
```

Returns Server-Sent Events for real-time upload progress.

#### Download Static Files
```http
GET /api/v1/static/{file_type}/{filename}
```

### Aligner Operations

#### Get Aligner Dashboard
```http
GET /api/v1/aligner/dashboard
Authorization: Bearer <access_token>
```

#### Start Alignment
```http
POST /api/v1/aligner/align
Authorization: Bearer <access_token>
```

#### Check Alignment Queue
```http
GET /api/v1/aligner/queue
Authorization: Bearer <access_token>
```

### Admin Operations

**Base URL:** `/api/v1/admin`
**Authentication:** All admin endpoints require JWT token with admin privileges.

#### Get Site Status
```http
GET /api/v1/admin/site-status
Authorization: Bearer <admin_access_token>
```

**Response (200):**
```json
{
  "active": true,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "inactive_message": "Site maintenance in progress"
}
```

#### Update Site Status
```http
PUT /api/v1/admin/site-status
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "active": false,
  "start_date": "2024-01-01",
  "end_date": "2024-01-02",
  "inactive_message": "Scheduled maintenance"
}
```

**Response (200):**
```json
{
  "message": "Site deactivated successfully. 15 users logged out.",
  "active": false,
  "users_logged_out": 15
}
```

#### Manage Blocked Emails
```http
GET /api/v1/admin/blocked-emails
Authorization: Bearer <admin_access_token>
```

**Response (200):**
```json
{
  "emails": ["spam@example.com", "abuse@test.com"],
  "count": 2
}
```

```http
POST /api/v1/admin/blocked-emails
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "action": "add"  // or "remove"
}
```

**Response (200):**
```json
{
  "message": "Email user@example.com added to blocked list",
  "user_logged_out": true,
  "added": true
}
```

#### User Management
```http
POST /api/v1/admin/users
Authorization: Bearer <admin_access_token>
```

**Find User:**
```json
{
  "action": "find",
  "email": "user@example.com"
}
```

**Delete User:**
```json
{
  "action": "delete",
  "user_id": 123
}
```

#### Generate User Report
```http
POST /api/v1/admin/downloads/users
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "user_limit": "2024-01-01",
  "include_deleted": false
}
```

Returns Excel file download.

#### History Downloads
```http
GET /api/v1/admin/downloads/history
Authorization: Bearer <admin_access_token>
```

```http
POST /api/v1/admin/downloads/history
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "filename": "history_240101.xlsx"  // or "history.zip" for all files
}
```

### Configuration & Utilities

#### Get Configuration
```http
GET /api/v1/config
```

**Response (200):**
```json
{
  "audio_extensions": [".wav", ".mp3", ".m4a"],
  "max_file_size": 104857600,
  "supported_languages": ["eng", "fra", "spa"],
  "user_limits": {
    "anonymous_daily_limit": 10,
    "registered_daily_limit": 100
  }
}
```

#### Health Check
```http
GET /api/v1/health
```

**Response (200):**
```json
{
  "status": "healthy",
  "message": "API is running"
}
```

#### Site Status Check
```http
GET /api/v1/site-status
```

**Response (200):**
```json
{
  "active": true,
  "message": "Site status retrieved successfully"
}
```

#### Team Information
```http
GET /api/v1/team
```

#### Contact Email
```http
POST /api/v1/contact/send-email
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello, I have a question..."
}
```

### Upload Status & Downloads

#### Real-time Upload Status
```http
GET /api/v1/upload/status
Authorization: Bearer <access_token>
```

Returns Server-Sent Events (SSE) for real-time upload progress tracking.

#### Task File Downloads
```http
GET /api/v1/tasks/{task_id}/download/{download_type}
Authorization: Bearer <access_token>
```

**Download Types:**
- `textgrid`: TextGrid alignment files
- `audio`: Original audio files
- `transcript`: Text transcripts
- `zip`: Complete task archive

#### Missing Words Report
```http
GET /api/v1/tasks/{task_id}/missing-words
Authorization: Bearer <access_token>
```

### Language Change Operations

#### Change Task Language
```http
POST /api/v1/tasks/change-language
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "task_id": "task_abc123",
  "new_language_id": 2
}
```

#### Get Available Languages for Task
```http
GET /api/v1/tasks/{task_id}/available-languages
Authorization: Bearer <access_token>
```

### Reupload Operations

#### Reupload Task Files
```http
POST /api/v1/tasks/{task_id}/reupload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `files`: New audio files

#### Get Reupload Information
```http
GET /api/v1/tasks/{task_id}/reupload-info
Authorization: Bearer <access_token>
```

### Task History & Reports

#### Get Task History
```http
GET /api/v1/tasks/history
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)
- `status`: Filter by status

#### Monthly Report Download
```http
GET /api/v1/monthly-download
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year (YYYY)

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages:

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate email)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error
- `503` - Service Unavailable (site inactive)

### Error Response Format

```json
{
  "message": "Error description",
  "errors": {
    "field_name": ["Field-specific error messages"]
  },
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### Site Inactive Response

When the site is deactivated by admin, regular endpoints return:

```json
{
  "message": "Site is currently inactive",
  "active": false
}
```

Status Code: `503 Service Unavailable`

**Note:** Admin endpoints remain accessible when the site is inactive.

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Anonymous Users**: 10 tasks per day (tracked by session)
- **Registered Users**: 100 tasks per day (tracked by user ID)
- **File Uploads**: Limited by file size and count
- **Admin Operations**: No specific limits (trusted users)

Rate limit information is included in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install -r requirements-test.txt

# Run tests
pytest

# Run with coverage
pytest --cov=app
```

### Database Migrations

```bash
# Create new migration
flask db migrate -m "Description of changes"

# Apply migrations
flask db upgrade

# Rollback migration
flask db downgrade
```

### Adding New Endpoints

1. **Create Resource Class** in `app/resources/`
2. **Add to Resources Init** in `app/resources/__init__.py`
3. **Register Route** in `app/api/v1/routes.py`
4. **Create Schema** (if needed) in `app/schemas/`
5. **Add Tests** in `tests/`

### Logging

The API provides comprehensive logging:

- **Request/Response Logging**: All API calls are logged with timing
- **Error Logging**: Exceptions are captured with full stack traces
- **Authentication Logging**: Login/logout events are tracked
- **Admin Action Logging**: Administrative actions are logged

Log levels:
- `DEBUG`: Detailed debugging information
- `INFO`: General application flow
- `WARNING`: Warning messages (non-fatal errors)
- `ERROR`: Error conditions
- `CRITICAL`: Critical errors requiring immediate attention

### Environment Configuration

Different configurations for different environments:

- **Development**: Debug mode, SQLite database, verbose logging
- **Testing**: In-memory database, disabled authentication checks
- **Production**: PostgreSQL database, secure settings, optimized logging

### Security Considerations

- **JWT Secret Keys**: Use strong, random secret keys
- **Password Hashing**: Passwords are hashed using Werkzeug's secure methods
- **Token Blacklisting**: Revoked tokens are tracked and rejected
- **Input Validation**: All inputs are validated using Marshmallow schemas
- **File Upload Security**: File types and sizes are restricted
- **Admin Access Control**: Admin functions require verified admin privileges

### Deployment

For production deployment:

1. **Use Production WSGI Server** (Gunicorn, uWSGI)
2. **Set Environment Variables** securely
3. **Configure Database** with connection pooling
4. **Set up Reverse Proxy** (Nginx, Apache)
5. **Enable HTTPS** with SSL certificates
6. **Configure Logging** to files or external services
7. **Set up Monitoring** for health checks and performance

### API Versioning

The API uses URL-based versioning (`/api/v1/`). When making breaking changes:

1. Create new version endpoint (`/api/v2/`)
2. Maintain backward compatibility for existing version
3. Document migration path for clients
4. Eventually deprecate old version with sufficient notice

## Data Models

### User Object
```json
{
  "id": 123,
  "uuid": "abc123",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "title": "Dr.",
  "org": "University",
  "industry": "Education",
  "admin": false,
  "verified": false,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### Task Object
```json
{
  "id": "task_abc123",
  "user_id": 123,
  "language_id": 1,
  "engine_id": 1,
  "status": "completed",
  "anonymous": false,
  "transcription_choice": "phonemes",
  "language_code": "eng",
  "task_path": "/path/to/task",
  "log_path": "/path/to/log",
  "file_count": 3,
  "words_count": 150,
  "missing_words": 2,
  "duration": 120.5,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:05:00Z"
}
```

### Language Object
```json
{
  "id": 1,
  "code": "eng",
  "display_name": "English",
  "language_name": "English",
  "type": "primary",
  "alphabet": "latin",
  "priority": 1,
  "homepage": true,
  "is_active": true
}
```

### Engine Object
```json
{
  "id": 1,
  "code": "mfa",
  "name": "Montreal Forced Alignment",
  "documentation_link": "https://montreal-forced-alignment.readthedocs.io/",
  "is_active": true
}
```

---

For additional support or questions, please refer to the project documentation or contact the development team.