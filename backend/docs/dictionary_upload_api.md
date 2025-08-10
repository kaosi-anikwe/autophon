# User Dictionary Upload API

## Overview

This document describes the new API endpoints that replace the legacy `/upload_dict` route with modern RESTful endpoints for managing user dictionaries.

## Architecture Changes

### Old Architecture
- **Route**: `/upload_dict` (POST only)
- **Method**: Form-based upload with mixed success/error handling
- **Issues**: Single endpoint for multiple operations, inconsistent error responses

### New Architecture
- **Multiple focused endpoints** for different dictionary operations
- **JWT authentication** required for all operations
- **Consistent JSON responses** with proper HTTP status codes
- **Enhanced validation** and error handling

## API Endpoints

### 1. Upload Dictionary

#### Upload User Dictionary
```http
POST /api/v1/dictionaries/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `dict`: Dictionary file (.dict or .txt format)
- `lang`: Language code (e.g., 'engGB_MFA1_v010')
- `opType`: Operation type ('replace' or 'append', default: 'replace')

**Response (Success):**
```json
{
  "status": "success",
  "message": "Dictionary uploaded successfully",
  "data": {
    "dict_default": "engGB_MFA1_v010",
    "word_count": 1250,
    "operation": "replace"
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Invalid phones: ['xyz', 'abc']"
}
```

**Error Codes:**
- `400`: Bad request (missing file, invalid format, phone validation failed)
- `401`: Authentication required
- `500`: Server error during upload

### 2. Get Dictionary Content

#### Retrieve User Dictionary
```http
POST /api/v1/dictionaries/get
Authorization: Bearer <jwt_token>
Content-Type: application/x-www-form-urlencoded
```

**Form Data:**
- `lang`: Language code to retrieve

**Response (Success):**
```json
{
  "status": "success",
  "message": "Dictionary retrieved successfully", 
  "data": {
    "content": "<div class='user-dictionary-container'>...</div>",
    "phones": ["p", "b", "t", "d", ...],
    "word_count": 1250,
    "language": "engGB_MFA1_v010"
  }
}
```

**Response (Not Found):**
```json
{
  "status": "error",
  "message": "No user-made dictionary found for this language",
  "data": {
    "phones": ["p", "b", "t", "d", ...]
  }
}
```

### 3. List User Dictionaries

#### Get All User Dictionaries
```http
GET /api/v1/dictionaries/user
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "dictionaries": [
      {
        "language_code": "engGB_MFA1_v010",
        "language_name": "English (GB) MFA v1.0.1.0",
        "word_count": 1250,
        "file_size": 25600,
        "last_modified": 1641123456.789,
        "has_json_index": true
      }
    ],
    "total_count": 1
  }
}
```

### 4. Delete Dictionary

#### Delete User Dictionary
```http
DELETE /api/v1/dictionaries/user/{lang_code}
Authorization: Bearer <jwt_token>
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Dictionary deleted successfully"
}
```

## Key Features

### 1. Phone Validation
- Validates dictionary entries against language-specific phone sets
- Returns detailed error messages listing invalid phones
- Supports all phonetic alphabets defined in language metadata

### 2. File Processing
- **Encoding Detection**: Automatically detects file encoding
- **Format Validation**: Ensures .dict or .txt format
- **Size Limits**: Enforces configurable word count limits
- **Duplicate Removal**: Automatically sorts and deduplicates entries

### 3. Operation Types
- **Replace**: Overwrites existing dictionary (default)
- **Append**: Adds entries to existing dictionary
- **Empty Dictionary**: Handles empty file uploads gracefully

### 4. JSON Indexing
- Creates JSON index files for fast word lookups
- Stores lowercase words without non-breaking spaces
- Used by alignment processes for missing word detection

### 5. Default Dictionary Management
- Automatically updates user's default dictionary setting
- Clears default if dictionary is deleted
- Integrates with User model via SQLAlchemy

## Database Integration

### User Model Updates
```python
class User(db.Model):
    # ... existing fields ...
    dict_default = db.Column(db.String(50), nullable=True)
```

### File Structure
```
uploads/
├── {user_id}/
    ├── dic/
        ├── engGB_MFA1_v010.dict     # Original dictionary
        ├── engGB_MFA1_v010.json     # JSON index
        ├── norNO_MFA1_v010.dict     # Another language
        └── norNO_MFA1_v010.json     # Another index
```

## Validation Rules

### File Validation
- File must have `.dict` or `.txt` extension
- File size must be reasonable (checked via word count)
- Encoding must be detectable and valid UTF-8

### Phone Validation
- Each dictionary entry: `word TAB phone1 phone2 ...`
- All phones must exist in language's phoneme inventory
- Invalid phones trigger detailed error response

### Size Limits
- Word count limit from `user_limits.user_dict_limit`
- Default: 50,000 words maximum
- Configurable via admin settings

## Error Handling

### Common Errors
1. **Missing File**: No file in upload request
2. **Invalid Format**: Wrong file extension
3. **Phone Validation**: Invalid phonemes used
4. **Size Exceeded**: Too many words in dictionary
5. **Language Not Found**: Invalid language code
6. **Authentication**: Missing or invalid JWT token

### Error Response Format
```json
{
  "status": "error",
  "message": "Human-readable error description"
}
```

## Frontend Integration

### Upload Example
```javascript
const uploadDictionary = async (file, language, operation = 'replace') => {
  const formData = new FormData();
  formData.append('dict', file);
  formData.append('lang', language);
  formData.append('opType', operation);
  
  const response = await fetch('/api/v1/dictionaries/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    },
    body: formData
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    showSuccess(`Dictionary uploaded: ${result.data.word_count} words`);
    updateDefaultDictionary(result.data.dict_default);
  } else {
    showError(result.message);
  }
};
```

### Dictionary List Example
```javascript
const loadUserDictionaries = async () => {
  const response = await fetch('/api/v1/dictionaries/user', {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    displayDictionaries(result.data.dictionaries);
  }
};
```

## Migration from Legacy Route

### Changes Required
1. **URL Change**: `/upload_dict` → `/api/v1/dictionaries/upload`
2. **Authentication**: Add JWT token to requests
3. **Response Format**: Parse JSON instead of plain text
4. **Error Handling**: Handle structured error responses

### Backward Compatibility
- Legacy route can remain active during transition
- New endpoints use different URLs (no conflicts)
- Same underlying validation and processing logic

## Benefits

1. **Better Security**: JWT authentication required
2. **Consistent Responses**: Structured JSON responses
3. **Enhanced Validation**: Detailed error messages
4. **Multiple Operations**: Upload, retrieve, list, delete
5. **Modern Architecture**: RESTful design principles
6. **Better Error Handling**: Proper HTTP status codes
7. **Database Integration**: Works with SQLAlchemy models