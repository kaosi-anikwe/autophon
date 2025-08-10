# Reupload API Documentation

## Overview

This document describes the new API endpoints that replace the legacy `/reupload` route with modern RESTful endpoints for reuploading audio files when transcription files are backed up.

## Architecture Changes

### Old Architecture
- **Route**: `/reupload` (GET/POST)
- **Method**: Form-based file upload with basic success/failure response
- **Issues**: Limited validation, MongoDB-specific implementation, basic error handling

### New Architecture
- **RESTful design** with dedicated endpoints for reupload operations
- **JWT authentication** required for all operations
- **Comprehensive file validation** and name matching
- **SQLAlchemy integration** with Task and File models
- **Detailed feedback** on reupload requirements and status

## Use Case

The reupload functionality is designed for scenarios where:
1. A user's audio files have been deleted or corrupted
2. The transcription files (TextGrid) are still backed up in the system
3. The user needs to upload a replacement audio file
4. The system can restore the task by combining the new audio with backed up transcriptions

## API Endpoints

### 1. Reupload Audio File

#### Upload Replacement Audio File
```http
POST /api/v1/tasks/{task_id}/reupload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `audio_file`: The replacement audio file

**Response (Success):**
```json
{
  "status": "success",
  "message": "Audio file reuploaded successfully",
  "data": {
    "task_id": "task_abc123",
    "task_status": "uploaded",
    "uploaded_file": "/uploads/123/tasks/task_abc123/audio.wav",
    "restored_files": [
      {
        "type": "textgrid",
        "source": "/uploads/held/task_abc123/audio.TextGrid",
        "destination": "/uploads/123/tasks/task_abc123/audio.TextGrid"
      }
    ]
  }
}
```

**Response (File Name Mismatch):**
```json
{
  "status": "error",
  "message": "File name mismatch. Expected one of: audio_recording, but got: wrong_name"
}
```

**Response (No Transcription Files):**
```json
{
  "status": "error",
  "message": "No transcription files found for reupload",
  "error_type": "no_transcription_files"
}
```

**Error Codes:**
- `400`: Bad request (no file, name mismatch, no backup files)
- `401`: Authentication required
- `403`: Access denied (not task owner)
- `404`: Task not found
- `500`: Server error during processing

### 2. Get Reupload Information

#### Check Reupload Requirements
```http
GET /api/v1/tasks/{task_id}/reupload-info
Authorization: Bearer <jwt_token>
```

**Response (Can Reupload):**
```json
{
  "status": "success",
  "data": {
    "can_reupload": true,
    "task_id": "task_abc123",
    "task_status": "failed",
    "expected_filenames": ["audio_recording"],
    "supported_extensions": [".wav", ".mp3", ".flac", ".ogg", ".m4a"],
    "backed_up_files": [
      {
        "path": "/uploads/held/task_abc123/audio_recording.TextGrid",
        "filename": "audio_recording.TextGrid",
        "exists": true
      }
    ],
    "requirements": [
      "Audio filename must match one of the expected filenames",
      "Audio file must have a supported extension", 
      "Transcription files must be backed up and available"
    ]
  }
}
```

**Response (Cannot Reupload):**
```json
{
  "status": "success",
  "data": {
    "can_reupload": false,
    "task_id": "task_abc123",
    "task_status": "completed",
    "expected_filenames": [],
    "supported_extensions": [".wav", ".mp3", ".flac", ".ogg", ".m4a"],
    "backed_up_files": [],
    "cannot_reupload_reasons": [
      "No backed up transcription files found",
      "No expected file names available"
    ],
    "requirements": [
      "Audio filename must match one of the expected filenames",
      "Audio file must have a supported extension",
      "Transcription files must be backed up and available"
    ]
  }
}
```

## Key Features

### 1. File Name Validation

The system validates uploaded files against expected names:

- **Task File Names**: Checks `TaskFileName` records for original names
- **Download Title**: Uses task's `download_title` as fallback
- **Task Directory**: Scans existing task files as last resort
- **Exact Matching**: Filename (without extension) must match exactly

### 2. Backup File Discovery

The system locates backup transcription files through multiple methods:

- **File Relationships**: Checks `TaskFile` records with `FileType.HELD`
- **JSON Storage**: Parses `held_paths` field if stored as JSON
- **Standard Location**: Looks in `/uploads/held/{task_id}/` directory
- **File Verification**: Ensures backup files actually exist on disk

### 3. File Processing Pipeline

1. **Directory Recreation**: Recreates task directory structure
2. **Backup Restoration**: Copies TextGrid files from backup locations
3. **Audio Upload**: Saves new audio file to correct location
4. **File Processing**: Runs `fileOps` for format conversion and optimization
5. **Database Updates**: Updates task status and file records
6. **Logging**: Records all operations for audit trail

### 4. Audio File Processing

- **Format Conversion**: Uses `fileOps` to convert to WAV if needed
- **Audio Optimization**: Applies audio processing optimizations
- **Error Recovery**: Continues even if processing fails
- **Path Updates**: Tracks final file paths after processing

## Validation Rules

### File Name Requirements

1. **Exact Match**: Uploaded filename must match expected name exactly (without extension)
2. **Case Sensitive**: Filenames are case-sensitive
3. **Extension Flexible**: Any supported audio extension allowed
4. **Single File**: Only one audio file per reupload operation

### Backup File Requirements

1. **TextGrid Presence**: At least one TextGrid backup must exist
2. **File Accessibility**: Backup files must be readable from filesystem
3. **Path Validity**: Backup file paths must be absolute and valid

### Task State Requirements

1. **User Ownership**: User must own the task
2. **Task Existence**: Task must exist in database
3. **Authentication**: Valid JWT token required

## File Structure

### Before Reupload
```
uploads/
├── held/
│   └── task_abc123/
│       └── audio_recording.TextGrid    # Backed up transcription
└── 123/                                # User directory
    └── tasks/
        └── task_abc123/                # Task directory (deleted/empty)
```

### After Reupload
```
uploads/
├── held/
│   └── task_abc123/
│       └── audio_recording.TextGrid    # Original backup (preserved)
└── 123/                                # User directory
    └── tasks/
        └── task_abc123/                # Task directory (recreated)
            ├── audio_recording.wav     # New audio file
            └── audio_recording.TextGrid # Restored transcription
```

## Database Integration

### Task Model Updates

The reupload process updates these Task model fields:
```python
class Task(db.Model):
    # ... existing fields ...
    task_status = db.Column(db.Enum(TaskStatus))  # Set to UPLOADED
    task_path = db.Column(db.String(500))         # Updated if missing
    updated_at = db.Column(db.DateTime)           # Set to current time
```

### File Model Integration

```python
class TaskFile(db.Model):
    task_id = db.Column(db.Integer)               # Links to task
    file_type = db.Column(db.Enum(FileType))      # AUDIO, TEXTGRID, HELD
    file_path = db.Column(db.String(1000))        # Absolute file path
    original_filename = db.Column(db.String(255)) # Original filename
```

### File Name Model

```python
class TaskFileName(db.Model):
    task_id = db.Column(db.Integer)               # Links to task
    file_key = db.Column(db.String(100))          # File identifier
    original_name = db.Column(db.String(255))     # Original filename
```

## Error Handling

### Common Errors

1. **Authentication Required** (401): Missing or invalid JWT token
2. **Access Denied** (403): User doesn't own the task
3. **Task Not Found** (404): Invalid task_id provided
4. **No File Provided** (400): Missing `audio_file` in form data
5. **File Name Mismatch** (400): Uploaded filename doesn't match expected
6. **No Backup Files** (400): No transcription files available for restoration
7. **File Processing Error** (500): Audio processing or filesystem error

### Error Recovery

- **Partial Success**: Continues even if some operations fail
- **Cleanup on Failure**: Removes partially created files on error
- **Detailed Logging**: Records specific error details for debugging
- **Graceful Degradation**: Provides fallback methods for file discovery

## Frontend Integration

### Reupload Information Check
```javascript
const checkReuploadInfo = async (taskId) => {
  const response = await fetch(`/api/v1/tasks/${taskId}/reupload-info`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    const info = result.data;
    
    if (info.can_reupload) {
      showReuploadForm({
        expectedNames: info.expected_filenames,
        supportedExtensions: info.supported_extensions,
        requirements: info.requirements
      });
    } else {
      showCannotReuploadMessage(info.cannot_reupload_reasons);
    }
  }
};
```

### File Upload Example
```javascript
const reuploadAudioFile = async (taskId, audioFile) => {
  const formData = new FormData();
  formData.append('audio_file', audioFile);
  
  const response = await fetch(`/api/v1/tasks/${taskId}/reupload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    },
    body: formData
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    showSuccess(`File reuploaded: ${result.data.restored_files.length} files restored`);
    updateTaskStatus(taskId, result.data.task_status);
  } else {
    showError(result.message);
    
    // Handle specific error types
    if (result.error_type === 'no_transcription_files') {
      showNoBackupFilesDialog();
    }
  }
};
```

### Reupload Component
```javascript
const ReuploadForm = ({ taskId, expectedFilenames, supportedExtensions }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const validateFile = (file) => {
    if (!file) return 'No file selected';
    
    // Check filename
    const fileName = file.name.split('.')[0];
    if (!expectedFilenames.includes(fileName)) {
      return `Filename must be one of: ${expectedFilenames.join(', ')}`;
    }
    
    // Check extension
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!supportedExtensions.includes(extension)) {
      return `Unsupported file type. Supported: ${supportedExtensions.join(', ')}`;
    }
    
    return '';
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setValidationError(validateFile(file));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validateFile(selectedFile);
    if (error) {
      setValidationError(error);
      return;
    }
    
    setUploading(true);
    try {
      await reuploadAudioFile(taskId, selectedFile);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Audio File:</label>
        <input
          type="file"
          accept={supportedExtensions.join(',')}
          onChange={handleFileChange}
          disabled={uploading}
        />
        {validationError && <div className="error">{validationError}</div>}
      </div>
      
      <div>
        <p>Expected filename: {expectedFilenames.join(' or ')}</p>
        <p>Supported formats: {supportedExtensions.join(', ')}</p>
      </div>
      
      <button 
        type="submit" 
        disabled={uploading || validationError}
      >
        {uploading ? 'Uploading...' : 'Reupload Audio'}
      </button>
    </form>
  );
};
```

## Migration from Legacy Route

### Changes Required

1. **URL Changes**: 
   - `/reupload` → `/api/v1/tasks/{task_id}/reupload`
   - Add info endpoint: `/api/v1/tasks/{task_id}/reupload-info`

2. **Authentication**: Add JWT token to all requests

3. **Request Format**: 
   - Form field: `files[]` → `audio_file`
   - Add task_id as URL parameter instead of form field

4. **Response Format**: Parse JSON instead of simple success/failure

5. **Validation**: Handle detailed validation errors and requirements

### Backward Compatibility

- Legacy route can remain active during transition
- New endpoints use different URL structure (no conflicts)
- Same underlying file processing and restoration logic
- Database schema compatible with both implementations

## Benefits

1. **Better UX**: Pre-check reupload requirements before showing form
2. **Enhanced Security**: JWT authentication and task ownership validation
3. **Comprehensive Validation**: Detailed file name and format checking
4. **Improved Error Handling**: Specific error types and recovery guidance
5. **File Tracking**: Database records of all uploaded and restored files
6. **Audit Trail**: Detailed logging of all reupload operations
7. **RESTful Design**: Follows modern API design principles
8. **Progress Feedback**: Real-time status updates during processing

## Performance Considerations

1. **File Validation**: Pre-validates files before expensive operations
2. **Backup Discovery**: Multiple fallback methods for finding backup files
3. **Atomic Operations**: Database updates in single transaction
4. **Error Isolation**: Continues processing even if some operations fail
5. **Resource Cleanup**: Removes temporary files and handles failures gracefully
6. **Efficient File Operations**: Uses optimized file copy and processing methods