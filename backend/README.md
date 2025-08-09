# Autophon API Documentation

A Flask-RESTful API for the Autophon application, providing user management, task processing, language support, and dictionary management.

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
The API uses JWT (JSON Web Token) authentication. Most endpoints require a valid access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Response Format
All API responses follow a consistent JSON format:
- Success responses include relevant data and status codes 200-201
- Error responses include a `message` field and appropriate error status codes
- List endpoints include both the data array and a `count` field

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": { /* user object */ },
  "access_token": "string",
  "refresh_token": "string"
}
```

### POST /auth/login
Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { /* user object */ },
  "access_token": "string",
  "refresh_token": "string"
}
```

### POST /auth/logout
Logout current user (blacklist current token).

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Headers:** `Authorization: Bearer <refresh_token>`

**Response:**
```json
{
  "access_token": "string"
}
```

### PUT /auth/change-password
Change user password (requires current password).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

**Response:**
```json
{
  "message": "Password changed successfully. All sessions have been logged out for security.",
  "tokens_revoked": true
}
```

### POST /auth/reset-password
Request password reset (production implementation would send email).

**Request Body:**
```json
{
  "email": "string"
}
```

### GET /auth/verify
Verify token validity and get user info.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "valid": true,
  "user": { /* user object */ }
}
```

### POST /auth/logout-all
Logout from all devices (revoke all user tokens).

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Successfully logged out from all devices",
  "revoked_at": "2024-01-01T12:00:00Z"
}
```

### POST /auth/cleanup-tokens
Clean up expired tokens (Admin only).

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Cleaned up 25 expired tokens",
  "cleaned_count": 25
}
```

### POST /auth/revoke-user-tokens
Revoke all tokens for specific user (Admin only).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "user_id": 123,
  "reason": "admin_revoke"
}
```

## User Management Endpoints

### GET /users
Get list of users (returns public info for non-admins).

**Response:**
```json
{
  "users": [{ /* user objects */ }],
  "count": 25
}
```

### POST /users
Create new user.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string",
  "admin": false
}
```

### GET /users/{user_id}
Get user by ID. Users can view their own profile or admin can view any.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "user": { /* user object */ }
}
```

### PUT /users/{user_id}
Update user. Users can update their own profile or admin can update any.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "admin": false
}
```

### DELETE /users/{user_id}
Soft delete user. Users can delete their own account or admin can delete any.

**Headers:** `Authorization: Bearer <access_token>`

### GET /profile
Get current user's profile.

**Headers:** `Authorization: Bearer <access_token>`

### PUT /profile
Update current user's profile.

**Headers:** `Authorization: Bearer <access_token>`

### GET /users/{user_id}/tasks
Get tasks for specific user.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "tasks": [{ /* task objects */ }],
  "count": 15
}
```

## Language Management Endpoints

### GET /languages
Get list of languages with optional filtering.

**Query Parameters:**
- `type`: Filter by language type (enum value)
- `homepage`: Filter homepage languages (true/false)
- `active`: Filter active languages (default: true)

**Response:**
```json
{
  "languages": [{ /* language objects */ }],
  "count": 50
}
```

### POST /languages
Create new language (Admin only).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "code": "en",
  "display_name": "English",
  "language_name": "English",
  "type": "primary",
  "alphabet": "latin",
  "priority": 1,
  "homepage": true,
  "is_active": true
}
```

### GET /languages/{language_id}
Get language by ID.

**Response:**
```json
{
  "language": { /* language object with relationships */ }
}
```

### PUT /languages/{language_id}
Update language (Admin only).

**Headers:** `Authorization: Bearer <access_token>`

### DELETE /languages/{language_id}
Delete language (Admin only, cannot delete if used in tasks).

**Headers:** `Authorization: Bearer <access_token>`

### GET /languages/code/{code}
Get language by code.

**Response:**
```json
{
  "language": { /* language object */ }
}
```

### GET /languages/{language_id}/engines
Get engines for a language.

**Headers:** `Authorization: Bearer <access_token>`

### POST /languages/{language_id}/engines
Add engine to language (Admin only).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "engine_id": 123
}
```

## Engine Management Endpoints

### GET /engines
Get list of engines with optional filtering.

**Query Parameters:**
- `active`: Filter active engines (default: true)

**Response:**
```json
{
  "engines": [{ /* engine objects */ }],
  "count": 10
}
```

### POST /engines
Create new engine (Admin only).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "code": "mfa",
  "name": "Montreal Forced Alignment",
  "documentation_link": "https://montreal-forced-alignment.readthedocs.io/",
  "is_active": true
}
```

### GET /engines/{engine_id}
Get engine by ID.

### PUT /engines/{engine_id}
Update engine (Admin only).

**Headers:** `Authorization: Bearer <access_token>`

### DELETE /engines/{engine_id}
Delete engine (Admin only, cannot delete if used in tasks).

**Headers:** `Authorization: Bearer <access_token>`

### GET /engines/code/{code}
Get engine by code.

### GET /engines/{engine_id}/languages
Get languages for an engine.

### POST /engines/{engine_id}/languages
Add language to engine (Admin only).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "language_id": 123
}
```

## Task Management Endpoints

### GET /tasks
Get list of tasks with optional filtering.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `status`: Filter by task status (pending, processing, completed, failed, cancelled)
- `user_id`: Filter by user (Admin only)
- `language_id`: Filter by language
- `engine_id`: Filter by engine
- `limit`: Limit number of results

**Response:**
```json
{
  "tasks": [{ /* task objects */ }],
  "count": 25
}
```

### POST /tasks
Create new task.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "task_id": "unique_task_id",
  "user_id": 123,
  "lang_id": 1,
  "engine_id": 1,
  "anonymous": false,
  "trans_choice": "phonemes",
  "lang": "en",
  "multitier": false,
  "no_of_files": 1,
  "no_of_tiers": 1
}
```

### GET /tasks/{task_id}
Get task by ID.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "task": { /* complete task object with relationships */ }
}
```

### PUT /tasks/{task_id}
Update task.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "task_status": "processing",
  "anonymous": false,
  "task_path": "/path/to/task",
  "log_path": "/path/to/log",
  "size": "1024.50",
  "words": 100,
  "missing_words": 5,
  "duration": 3600
}
```

### DELETE /tasks/{task_id}
Delete task.

**Headers:** `Authorization: Bearer <access_token>`

### PUT /tasks/{task_id}/status
Update task status.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "status": "completed"
}
```

### GET /tasks/{task_id}/files
Get files for a task.

**Headers:** `Authorization: Bearer <access_token>`

### POST /tasks/{task_id}/files
Add file to task.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "file_type": "audio",
  "file_path": "/path/to/file.wav",
  "original_filename": "recording.wav",
  "file_key": "audio_01"
}
```

### GET /tasks/{task_id}/file-names
Get file names for a task.

**Headers:** `Authorization: Bearer <access_token>`

### POST /tasks/{task_id}/file-names
Add file name to task.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "file_key": "audio_01",
  "original_name": "recording.wav"
}
```

### DELETE /tasks/bulk-delete
Delete multiple tasks at once.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "task_ids": ["task_1", "task_2", "task_3"]
}
```

**Response:**
```json
{
  "message": "Bulk delete completed",
  "deleted": ["task_1", "task_2"],
  "deleted_count": 2,
  "permission_denied": [],
  "permission_denied_count": 0,
  "not_found": ["task_3"],
  "not_found_count": 1
}
```

## Dictionary Management Endpoints

### GET /dictionaries
Get list of dictionaries.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `user_id`: Filter by user (Admin only)
- `language`: Filter by language

**Response:**
```json
{
  "dictionaries": [{ /* dictionary objects */ }],
  "count": 5
}
```

### POST /dictionaries
Create new dictionary.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "user_id": 123,
  "lang": "en",
  "dictionary_content": "word1 pronunciation1\nword2 pronunciation2",
  "file_path": "/path/to/dictionary.txt"
}
```

### GET /dictionaries/{dict_id}
Get dictionary by ID.

**Headers:** `Authorization: Bearer <access_token>`

### PUT /dictionaries/{dict_id}
Update dictionary.

**Headers:** `Authorization: Bearer <access_token>`

### DELETE /dictionaries/{dict_id}
Delete dictionary (removes file if exists).

**Headers:** `Authorization: Bearer <access_token>`

### GET /users/{user_id}/dictionaries
Get dictionaries for specific user.

**Headers:** `Authorization: Bearer <access_token>`

### GET /dictionaries/language/{language}
Get current user's dictionary for specific language.

**Headers:** `Authorization: Bearer <access_token>`

### POST /dictionaries/language/{language}
Create dictionary for specific language.

**Headers:** `Authorization: Bearer <access_token>`

## Status Codes

- **200 OK**: Successful GET, PUT, DELETE
- **201 Created**: Successful POST
- **207 Multi-Status**: Partial success (bulk operations)
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Invalid or missing authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists or constraint violation
- **500 Internal Server Error**: Server error

## Error Responses

Error responses include a descriptive message:
```json
{
  "message": "Error description",
  "errors": { /* validation errors if applicable */ }
}
```

## Data Models

### User Object
```json
{
  "id": 123,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "admin": false,
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### Task Object
```json
{
  "id": 123,
  "task_id": "unique_task_id",
  "user_id": 456,
  "lang_id": 1,
  "engine_id": 1,
  "task_status": "completed",
  "anonymous": false,
  "trans_choice": "phonemes",
  "lang": "en",
  "task_path": "/path/to/task",
  "log_path": "/path/to/log",
  "size": "1024.50",
  "words": 100,
  "missing_words": 5,
  "duration": 3600,
  "no_of_files": 1,
  "no_of_tiers": 1,
  "multitier": false,
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z",
  "owner": { /* user object */ },
  "language": { /* language object */ },
  "engine": { /* engine object */ },
  "files": [{ /* file objects */ }],
  "file_names": [{ /* file name objects */ }]
}
```

### Language Object
```json
{
  "id": 1,
  "code": "en",
  "display_name": "English",
  "language_name": "English",
  "type": "primary",
  "alphabet": "latin",
  "priority": 1,
  "homepage": true,
  "is_active": true,
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### Engine Object
```json
{
  "id": 1,
  "code": "mfa",
  "name": "Montreal Forced Alignment",
  "documentation_link": "https://montreal-forced-alignment.readthedocs.io/",
  "is_active": true,
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### Dictionary Object
```json
{
  "id": 1,
  "user_id": 123,
  "lang": "en",
  "dictionary_content": "word1 pronunciation1\nword2 pronunciation2",
  "file_path": "/path/to/dictionary.txt",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

## Enums

### TaskStatus
- `pending`: Task is waiting to be processed
- `processing`: Task is currently being processed
- `completed`: Task has completed successfully
- `failed`: Task processing failed
- `cancelled`: Task was cancelled

### FileType
- `audio`: Audio file
- `textgrid`: TextGrid file
- `held`: Held file
- `output`: Output file

### LanguageType
- `primary`: Primary language
- `secondary`: Secondary language
- (Additional values defined in LanguageType enum)

## Security Features

### Token Blacklisting
- Tokens are blacklisted on logout to prevent reuse
- Admin can revoke all tokens for specific users
- Expired tokens are automatically cleaned up
- Password changes revoke all existing tokens

### Permission System
- Admin users have full access to all resources
- Regular users can only access their own resources
- Public endpoints provide limited data for non-authenticated users
- Soft delete for users maintains data integrity

### Validation
- Input validation using Marshmallow schemas
- SQL injection prevention through ORM
- Password hashing using Werkzeug
- CORS configuration for cross-origin requests

## Development Setup

1. Install dependencies: `pip install -r requirements.txt`
2. Set environment variables in `.env` file
3. Initialize database: `flask db upgrade`
4. Run development server: `flask run`

## Health Check

### GET /api/v1/health
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "message": "API is running"
}
```