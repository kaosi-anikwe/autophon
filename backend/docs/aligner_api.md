# Aligner API Documentation

## Overview

This document describes the new API endpoints that replace the legacy `/aligner` and `/align-task` routes with modern RESTful endpoints for the alignment workflow system.

## Architecture Changes

### Old Architecture
- **Routes**: `/aligner` (GET) and `/align-task` (POST)
- **Issues**: Server-Sent Events (SSE) architecture, mixed template/API responses
- **Limitations**: Difficult to scale, browser connection limits, complex error handling

### New Architecture
- **Multiple focused endpoints** for different alignment operations
- **JWT authentication** required for dashboard access
- **Polling-based status updates** instead of SSE
- **Consistent JSON responses** with proper HTTP status codes
- **Queue management** with detailed task timing

## API Endpoints

### 1. Aligner Dashboard

#### Get Dashboard Data
```http
GET /api/v1/aligner/dashboard
Authorization: Bearer <jwt_token>
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "user_tasks": [
      {
        "task_id": "task_abc123",
        "task_status": "aligned",
        "download_title": "My Audio Files",
        "download_date": "2024-01-15T10:30:00",
        "trans_choice": "mfa",
        "lang": "engGB_MFA1_v010",
        "size": "1500000",
        "missing_words": "5",
        "no_of_files": 3,
        "words": 1250,
        "cost": 12.50,
        "duration": 180,
        "created_at": "2024-01-15T09:00:00",
        "updated_at": "2024-01-15T10:00:00",
        "aligned_at": "2024-01-15T10:00:00",
        "batch": false,
        "textgrid_url": "/api/v1/tasks/task_abc123/download/textgrid",
        "download_url": "/api/v1/tasks/task_abc123/download/complete",
        "has_missing_words": true,
        "missing_dict_url": "/api/v1/tasks/task_abc123/download/missing_dict",
        "missing_dict_html": "<div class='missing-words'>...",
        "first": true,
        "seconds_left": 120
      }
    ],
    "queue_info": {
      "uploaded_tasks": 3,
      "aligned_tasks": 1,
      "completed_today": 15,
      "total_queue": 4
    },
    "languages": {
      "languages": [
        {
          "code": "engGB_MFA1_v010",
          "lang": "English (GB)",
          "language": "English"
        }
      ],
      "language_groups": {
        "English": ["engGB_MFA1_v010", "engUS_MFA1_v010"]
      }
    },
    "user_preferences": {
      "trans_default": "mfa",
      "dict_default": "engGB_MFA1_v010"
    },
    "app_config": {
      "size_limit": "750 MB",
      "user_dict_limit": 50000,
      "audio_extensions": ["wav", "mp3", "flac", "ogg"]
    }
  }
}
```

**Response (Verification Required):**
```json
{
  "status": "error",
  "message": "Account verification required",
  "requires_verification": true
}
```

**Key Features:**
- **Task Timing**: Calculates `seconds_left` for running tasks across all users
- **Queue Information**: Real-time statistics about task processing
- **Missing Words**: HTML-formatted missing dictionary entries
- **Download URLs**: Direct API links for downloading results
- **User Preferences**: Default language and transcription settings

### 2. Align Task

#### Start Alignment Process
```http
POST /api/v1/aligner/align
Content-Type: application/json
```

**Request Body:**
```json
{
  "task_id": "task_abc123"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Task queued for alignment",
  "data": {
    "task_id": "task_abc123",
    "task_status": "aligned",
    "estimated_duration": 180,
    "queued_at": "2024-01-15T10:30:00"
  }
}
```

**Response (Expired Files):**
```json
{
  "status": "error",
  "message": "Task files have expired and need to be re-uploaded",
  "task_status": "expired"
}
```

**Response (Task Not Found):**
```json
{
  "status": "error",
  "message": "Task not found"
}
```

### 3. Task Expiration

#### Process Task Expiration
```http
POST /api/v1/aligner/expire
```

This endpoint is typically called by background jobs/cron to expire tasks that haven't been processed by end of day.

**Response:**
```json
{
  "status": "success",
  "message": "Expired 3 tasks",
  "data": {
    "expired_count": 3
  }
}
```

### 4. Alignment Queue Status

#### Get Queue Information
```http
GET /api/v1/aligner/queue
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "queue_stats": {
      "uploaded_tasks": 5,
      "aligned_tasks": 2,
      "completed_today": 18,
      "expired_today": 1
    },
    "current_task": {
      "task_id": "task_xyz789",
      "download_title": "Current Processing Task",
      "time_elapsed": 45.5,
      "time_remaining": 134.5,
      "progress_percentage": 25.3
    },
    "timestamp": "2024-01-15T10:30:00"
  }
}
```

## Key Features

### 1. Task Timing System

The aligner implements sophisticated timing calculations:

- **Global Queue**: Calculates `seconds_left` across all running tasks system-wide
- **Sequential Processing**: Tasks are processed in order, with cumulative timing
- **Duration Estimation**: Based on file size and batch status:
  - Single files: `max(size_bytes * 10, 20)` seconds
  - Batch uploads: `max(size_bytes * 100, 60)` seconds
- **Real-time Updates**: Time remaining decreases as tasks are processed

### 2. Task Status Management

**Status Flow:**
1. `TaskStatus.UPLOADED` → Task files uploaded, ready for alignment
2. `TaskStatus.ALIGNED` → Task queued for processing (sets `duration`)
3. `TaskStatus.ALIGNED` (with `aligned` timestamp) → Currently being processed
4. `TaskStatus.COMPLETED` → Processing finished successfully
5. `TaskStatus.EXPIRED` → Files expired and need re-upload

**Available Status Values:**
- `TaskStatus.PENDING` - Initial state
- `TaskStatus.PROCESSING` - General processing state  
- `TaskStatus.UPLOADED` - Files uploaded successfully
- `TaskStatus.UPLOADING` - Upload in progress
- `TaskStatus.COMPLETED` - Successfully completed
- `TaskStatus.FAILED` - Processing failed
- `TaskStatus.CANCELLED` - User cancelled
- `TaskStatus.PRE_ERROR` - Pre-processing error
- `TaskStatus.ALIGNED` - Queued or being aligned
- `TaskStatus.EXPIRED` - Files expired

### 3. File Expiration Handling

- **Automatic Detection**: Checks if task files still exist before processing
- **Graceful Degradation**: Marks tasks as expired if files missing
- **End-of-Day Cleanup**: Background job expires unprocessed tasks daily

### 4. Queue Management

- **Real-time Statistics**: Live counts of tasks in different states
- **Progress Tracking**: Current task progress and time remaining
- **Historical Data**: Completion counts and daily statistics

## Database Integration

### Task Model Requirements

The aligner endpoints expect these fields in the Task model:

```python
class Task(db.Model):
    task_id = db.Column(db.String(50), primary_key=True)
    task_status = db.Column(db.String(20))  # uploaded, aligned, completed, expired
    task_path = db.Column(db.String(500))   # Relative path to task files
    download_title = db.Column(db.String(200))
    download_date = db.Column(db.DateTime)
    trans_choice = db.Column(db.String(20))  # mfa, exp-a, comp-ling
    lang = db.Column(db.String(50))
    size = db.Column(db.BigInteger)          # File size in bytes
    missing_words = db.Column(db.Integer)
    no_of_files = db.Column(db.Integer)
    words = db.Column(db.Integer)
    cost = db.Column(db.Numeric(10, 2))
    duration = db.Column(db.Integer)         # Estimated duration in seconds
    aligned = db.Column(db.DateTime)         # When processing actually started
    missingprondict = db.Column(db.String(500))  # Path to missing words file
    held_paths = db.Column(db.Text)          # JSON array of file paths (optional)
    deleted = db.Column(db.String(255))      # Soft delete marker (empty string = not deleted)
    # ... standard timestamps
    created_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)
```

## Error Handling

### Common Errors

1. **Authentication Required** (401): Missing or invalid JWT token
2. **Account Verification Required** (403): User account not verified
3. **Task Not Found** (404): Invalid task_id provided
4. **Files Expired** (400): Task files have been cleaned up
5. **Missing Parameters** (400): Required fields not provided

### Error Response Format
```json
{
  "status": "error",
  "message": "Human-readable error description"
}
```

## Frontend Integration

### Dashboard Loading
```javascript
const loadAlignerDashboard = async () => {
  const response = await fetch('/api/v1/aligner/dashboard', {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    updateTaskList(result.data.user_tasks);
    updateQueueStats(result.data.queue_info);
    updateLanguages(result.data.languages);
  }
};
```

### Starting Alignment
```javascript
const startAlignment = async (taskId) => {
  const response = await fetch('/api/v1/aligner/align', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ task_id: taskId })
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    showSuccess(`Task queued: ${result.data.estimated_duration}s estimated`);
    startPolling(taskId);  // Begin polling for status updates
  } else {
    showError(result.message);
  }
};
```

### Polling for Status Updates
```javascript
const pollTaskStatus = async (taskId) => {
  const response = await fetch(`/api/v1/tasks/${taskId}/status`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    const task = result.data;
    updateTaskStatus(taskId, task);
    
    if (task.task_status === 'completed') {
      showSuccess('Alignment completed!');
      clearInterval(pollingInterval);
    } else if (task.task_status === 'aligned') {
      // Continue polling
      updateProgress(task.seconds_left);
    }
  }
};
```

## Migration from Legacy Routes

### Changes Required

1. **URL Changes:**
   - `/aligner` → `/api/v1/aligner/dashboard`
   - `/align-task` → `/api/v1/aligner/align`

2. **Architecture Changes:**
   - Replace SSE with polling-based status updates
   - Add JWT authentication to all requests
   - Handle JSON responses instead of HTML templates

3. **Response Format:**
   - Parse structured JSON responses
   - Handle consistent error format across all endpoints

### Backward Compatibility

- Legacy routes can remain active during transition period
- New endpoints use different URL structure (no conflicts)
- Same underlying task processing logic and database schema

## Benefits

1. **Scalability**: Polling-based architecture removes SSE limitations
2. **Reliability**: Proper error handling and task expiration management
3. **Security**: JWT authentication for all operations
4. **Monitoring**: Detailed queue statistics and progress tracking
5. **Maintainability**: RESTful design with consistent response format
6. **Performance**: Optimized database queries and caching opportunities
7. **Real-time Updates**: Sophisticated timing system across all running tasks