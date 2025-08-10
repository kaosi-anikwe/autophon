# Enhanced Upload Status and Download API

## Overview

This document describes the new API endpoints that replace the legacy Server-Sent Events (SSE) implementation for upload status monitoring and download functionality.

## Architecture Changes

### Old Architecture (SSE)
- **Route**: `/check_upload_status`
- **Method**: Server-Sent Events with long-running connections
- **Issues**: Resource intensive, hard to scale, complex error handling

### New Architecture (RESTful Polling)
- **Multiple focused endpoints** for different purposes
- **Polling-based** status updates
- **Better error handling** and scalability
- **Clean separation** of concerns

## API Endpoints

### 1. Upload Status Monitoring

#### Get All Tasks Status
```http
GET /api/v1/upload/status
```

**Query Parameters:**
- `user_id`: Required for anonymous users (JWT users auto-detected)
- `status_filter`: Comma-separated statuses (uploading,uploaded,aligned,completed,pre-error)
- `limit`: Max number of tasks to return (default: 50, max: 100)

**Response:**
```json
{
  "status": "success",
  "data": {
    "tasks": [
      {
        "task_id": "2024-01-01_12.30.45.123456",
        "user_id": "user123",
        "task_status": "uploading",
        "download_title": "My Audio File",
        "download_date": "2024-01-01T12:30:45",
        "trans_choice": "var-ling",
        "lang": "en_US",
        "size": "1024000",
        "missing_words": "5",
        "no_of_files": 2,
        "words": 150,
        "cost": 0.0,
        "duration": 30,
        "batch": false,
        "textgrid_url": "/api/v1/tasks/2024-01-01_12.30.45.123456/download/textgrid",
        "download_url": null,
        "has_missing_words": true,
        "missing_dict_url": "/api/v1/tasks/2024-01-01_12.30.45.123456/download/missing_dict",
        "missing_words_html_url": "/api/v1/tasks/2024-01-01_12.30.45.123456/missing-words",
        "created_at": "2024-01-01T12:30:45",
        "updated_at": "2024-01-01T12:35:45"
      }
    ],
    "total_count": 1
  }
}
```

#### Get Single Task Status
```http
GET /api/v1/tasks/{task_id}/status
```

### 2. Download Endpoints

#### Download TextGrid Files
```http
GET /api/v1/tasks/{task_id}/download/textgrid
```
- Returns single TextGrid file or ZIP of multiple TextGrid files
- Uses original filenames from upload
- Available for uploaded/incomplete tasks

#### Download Complete Task
```http
GET /api/v1/tasks/{task_id}/download/complete  
```
- Returns ZIP file with audio + TextGrid files
- Only available for completed tasks

#### Download Missing Words Dictionary
```http
GET /api/v1/tasks/{task_id}/download/missing_dict
```
- Returns pronunciation dictionary for missing words
- Available when task has missing words

### 3. Missing Words HTML

#### Get Formatted Missing Words
```http
GET /api/v1/tasks/{task_id}/missing-words
```

**Response:**
```json
{
  "status": "success", 
  "data": {
    "has_missing_words": true,
    "html_content": "<div class='missing-words-container'>...</div>",
    "missing_words_count": 5,
    "dict_path": "uploads/user123/dic/missing/missing_2024-01-01.dict"
  }
}
```

### 4. Static File Downloads

#### Download User Guides
```http
GET /api/v1/static/guides/{filename}
```
- Downloads PDF user guides
- Generates friendly display names

## Frontend Implementation

### Polling Strategy
Instead of SSE, implement polling:

```javascript
// Poll every 2-3 seconds for upload status
const pollUploadStatus = async (userId) => {
  try {
    const response = await fetch(`/api/v1/upload/status?user_id=${userId}&status_filter=uploading,uploaded,aligned`);
    const data = await response.json();
    
    if (data.status === 'success') {
      updateUI(data.data.tasks);
      
      // Continue polling if there are active tasks
      const activeTasks = data.data.tasks.filter(t => 
        ['uploading', 'uploaded', 'aligned'].includes(t.task_status)
      );
      
      if (activeTasks.length > 0) {
        setTimeout(() => pollUploadStatus(userId), 3000);
      }
    }
  } catch (error) {
    console.error('Polling error:', error);
    // Retry with backoff
    setTimeout(() => pollUploadStatus(userId), 5000);
  }
};
```

### Error Handling
```javascript
const handleDownload = async (taskId, downloadType) => {
  try {
    const response = await fetch(`/api/v1/tasks/${taskId}/download/${downloadType}`);
    
    if (response.ok) {
      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'download';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const error = await response.json();
      showError(error.message);
    }
  } catch (error) {
    showError('Download failed');
  }
};
```

## Database Requirements

The new API expects these fields in your `Task` model:

### Required Fields
- `task_id` (string, primary key)
- `user_id` (string)
- `task_status` (string)
- `created_at` (datetime)
- `updated_at` (datetime)
- `deleted` (datetime, nullable)

### Optional Fields  
- `download_title` (string)
- `download_date` (datetime)
- `trans_choice` (string)
- `lang` (string)
- `size` (integer)
- `missing_words` (integer)
- `no_of_files` (integer) 
- `words` (integer)
- `cost` (decimal)
- `duration` (integer)
- `download_path` (string)
- `missingprondict` (string)
- `held_paths` (JSON string)
- `file_names` (JSON string)

## Benefits

1. **Better Scalability**: No long-running connections
2. **Improved Error Handling**: Standard HTTP error responses
3. **Easier Testing**: RESTful endpoints are easier to test
4. **Frontend Flexibility**: Works with any frontend framework
5. **Resource Efficiency**: Connections aren't held open
6. **Clear Separation**: Each endpoint has a single responsibility

## Migration Strategy

1. **Phase 1**: Deploy new API endpoints alongside existing SSE
2. **Phase 2**: Update frontend to use polling instead of SSE
3. **Phase 3**: Remove old SSE endpoint after validation
4. **Phase 4**: Optimize polling intervals based on usage patterns