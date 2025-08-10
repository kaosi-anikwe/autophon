# Language Change API Documentation

## Overview

This document describes the new API endpoints that replace the legacy `/change_lang` route with modern RESTful endpoints for changing task languages and regenerating missing word pronunciations.

## Architecture Changes

### Old Architecture
- **Route**: `/change_lang` (POST only)
- **Method**: Form-based submission with simple success/failure response
- **Issues**: Basic error handling, MongoDB-specific implementation, limited feedback

### New Architecture
- **RESTful design** with dedicated endpoints for language operations
- **JWT authentication** required for all operations
- **Comprehensive validation** and error handling
- **SQLAlchemy integration** with Task and Language models
- **Detailed progress feedback** with missing word counts

## API Endpoints

### 1. Change Task Language

#### Change Language and Regenerate Pronunciations
```http
POST /api/v1/tasks/change-language
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "task_id": "task_abc123",
  "new_lang": "engGB_MFA1_v010"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Language changed to English (GB) MFA v1.0.1.0",
  "data": {
    "task_id": "task_abc123",
    "old_lang": "norNO_MFA1_v010",
    "new_lang": "engGB_MFA1_v010",
    "missing_words": 15,
    "missing_dict_path": "/uploads/123/dic/missing/suggpron_2024-01-15_14.30.45.txt"
  }
}
```

**Response (Task Not Found):**
```json
{
  "status": "error",
  "message": "Task not found"
}
```

**Response (Access Denied):**
```json
{
  "status": "error",
  "message": "Access denied"
}
```

**Response (Invalid Language):**
```json
{
  "status": "error",
  "message": "Invalid or inactive language code"
}
```

**Error Codes:**
- `400`: Bad request (missing parameters, invalid language)
- `401`: Authentication required
- `403`: Access denied (not task owner)
- `404`: Task not found
- `500`: Server error during processing

### 2. Get Available Languages

#### List Available Languages for Task
```http
GET /api/v1/tasks/{task_id}/available-languages
Authorization: Bearer <jwt_token>
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "task_id": "task_abc123",
    "current_language": "norNO_MFA1_v010",
    "available_languages": [
      {
        "code": "engGB_MFA1_v010",
        "display_name": "English (GB) MFA v1.0.1.0",
        "language_name": "English",
        "current": false,
        "has_g2p_model": true,
        "available": true
      },
      {
        "code": "engUS_MFA1_v010",
        "display_name": "English (US) MFA v1.0.1.0", 
        "language_name": "English",
        "current": false,
        "has_g2p_model": true,
        "available": true
      },
      {
        "code": "norNO_MFA1_v010",
        "display_name": "Norwegian MFA v1.0.1.0",
        "language_name": "Norwegian",
        "current": true,
        "has_g2p_model": true,
        "available": true
      }
    ]
  }
}
```

## Key Features

### 1. Language Change Process

The language change operation performs these steps:

1. **Validation**: Verifies task ownership, language validity, and file existence
2. **TextGrid Processing**: Analyzes all TextGrid files for the new language
3. **Missing Word Detection**: Identifies words not in the new language's dictionary
4. **G2P Generation**: Uses MFA to generate pronunciations for missing words
5. **Database Update**: Updates task with new language and missing word count
6. **File Management**: Creates combined pronunciation file and cleans up temporary files

### 2. File Processing

- **Character Encoding Detection**: Automatically detects TextGrid file encoding
- **Multiple TextGrid Support**: Processes all TextGrid files in the task
- **G2P Model Validation**: Ensures G2P models exist before processing
- **Temporary File Cleanup**: Removes intermediate files after processing

### 3. Missing Word Generation

- **MFA Integration**: Uses Montreal Forced Alignment for G2P generation
- **Dictionary Compilation**: Combines all missing words into a single file
- **Pronunciation Formatting**: Maintains consistent phoneme notation
- **Error Recovery**: Continues processing even if individual files fail

### 4. Language Availability

- **G2P Model Check**: Only shows languages with available G2P models
- **Current Language Indication**: Highlights the task's current language
- **Model Path Validation**: Verifies G2P model files exist on disk

## Processing Details

### 1. TextGrid Analysis

The system uses the existing `processTextGridNew` function to:
- Extract text from TextGrid tiers
- Compare against known word dictionaries
- Identify missing words requiring pronunciation generation
- Handle multi-tier TextGrid files

### 2. G2P Model Requirements

For each language, the system expects:
```
{ADMIN}/{language_code}/{language_code}_g2p_model.zip
```

Example: `admin/engGB_MFA1_v010/engGB_MFA1_v010_g2p_model.zip`

### 3. File Structure

Generated files follow this structure:
```
uploads/
├── {user_id}/
    ├── dic/
        ├── missing/
            ├── suggpron_2024-01-15_14.30.45.txt  # Final combined file
            ├── missing.dict                        # Temporary (deleted)
            └── {task_id}/                         # Temporary (deleted)
                └── missingpron.dict               # Temporary (deleted)
```

## Database Integration

### Task Model Updates

The language change updates these Task model fields:
```python
class Task(db.Model):
    # ... existing fields ...
    lang = db.Column(db.String(100))           # Language code
    lang_id = db.Column(db.Integer)            # Language relationship ID
    missing_words = db.Column(db.Integer)      # Count of missing words
    missingprondict = db.Column(db.String(500)) # Path to pronunciation file
    updated_at = db.Column(db.DateTime)        # Update timestamp
```

### Language Model Integration

```python
class Language(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50))            # Language code
    display_name = db.Column(db.String(100))   # Display name
    language_name = db.Column(db.String(50))   # Base language
    is_active = db.Column(db.Boolean)          # Active status
    priority = db.Column(db.Integer)           # Display priority
```

## Error Handling

### Common Errors

1. **Authentication Required** (401): Missing or invalid JWT token
2. **Access Denied** (403): User doesn't own the task
3. **Task Not Found** (404): Invalid task_id provided
4. **Invalid Language** (400): Language code not found or inactive
5. **Missing Files** (400): Task has no TextGrid files
6. **G2P Generation Failed** (500): MFA subprocess error
7. **File Processing Error** (500): TextGrid reading or processing error

### Error Recovery

- **Partial Success**: Continues processing even if some TextGrid files fail
- **Cleanup on Failure**: Removes temporary files even when errors occur
- **Detailed Logging**: Logs specific errors for debugging
- **Rollback Protection**: Database changes only committed after successful processing

## Frontend Integration

### Language Change Example
```javascript
const changeTaskLanguage = async (taskId, newLanguage) => {
  const response = await fetch('/api/v1/tasks/change-language', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      task_id: taskId,
      new_lang: newLanguage
    })
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    showSuccess(`Language changed: ${result.data.missing_words} missing words generated`);
    updateTaskLanguage(taskId, result.data.new_lang);
    if (result.data.missing_words > 0) {
      showMissingWordsDialog(result.data.missing_dict_path);
    }
  } else {
    showError(result.message);
  }
};
```

### Available Languages Example
```javascript
const loadAvailableLanguages = async (taskId) => {
  const response = await fetch(`/api/v1/tasks/${taskId}/available-languages`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    const availableLanguages = result.data.available_languages.filter(
      lang => lang.available && !lang.current
    );
    displayLanguageOptions(availableLanguages);
  }
};
```

### Language Selector Component
```javascript
const LanguageSelector = ({ taskId, currentLanguage, onLanguageChange }) => {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleLanguageChange = async (newLanguage) => {
    setLoading(true);
    try {
      await changeTaskLanguage(taskId, newLanguage);
      onLanguageChange(newLanguage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <select 
      value={currentLanguage} 
      onChange={(e) => handleLanguageChange(e.target.value)}
      disabled={loading}
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code} disabled={!lang.available}>
          {lang.display_name} {!lang.has_g2p_model && '(No G2P Model)'}
        </option>
      ))}
    </select>
  );
};
```

## Migration from Legacy Route

### Changes Required

1. **URL Change**: `/change_lang` → `/api/v1/tasks/change-language`
2. **Method**: Form data → JSON body
3. **Authentication**: Add JWT token to requests
4. **Response Format**: Parse JSON instead of simple success/failure
5. **Parameter Names**: `newLang` → `new_lang`

### Backward Compatibility

- Legacy route can remain active during transition
- New endpoints use different URL structure (no conflicts)
- Same underlying processing logic and file structures
- Database schema compatible with both implementations

## Benefits

1. **Better User Experience**: Real-time feedback on missing words
2. **Enhanced Security**: JWT authentication and authorization
3. **Improved Error Handling**: Detailed error messages and recovery
4. **Language Validation**: Ensures only valid languages are used
5. **Model Verification**: Checks G2P model availability before processing
6. **Progress Tracking**: Reports exact count of missing words generated
7. **RESTful Design**: Follows modern API design principles
8. **Comprehensive Logging**: Detailed logs for debugging and monitoring

## Performance Considerations

1. **Batch Processing**: Handles multiple TextGrid files efficiently
2. **Temporary File Management**: Minimizes disk usage with cleanup
3. **Process Isolation**: Uses subprocess for MFA operations
4. **Error Isolation**: Continues processing even if individual files fail
5. **Database Optimization**: Updates task in single transaction
6. **File Validation**: Pre-checks file existence to avoid processing errors