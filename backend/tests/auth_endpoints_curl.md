# Authentication Endpoints - cURL Commands

This file contains cURL commands for testing all authentication endpoints in the Autophon API.

## Variables
```bash
# Set base URL
BASE_URL="http://localhost:5000/api/v1"

# These will be populated after login/register
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
```

## Health Check
```bash
curl -X GET "$BASE_URL/health" \
  -H "Content-Type: application/json"
```

## 1. Register User
```bash
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "org": "Autophon",
    "industry": "Autophon"
}'
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "admin": false
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

## 2. Login User
```bash
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "admin": false
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

*Note: Copy the access_token and refresh_token from the response to use in subsequent requests.*

## 3. Verify Token
```bash
curl -X GET "$BASE_URL/auth/verify" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "admin": false
  }
}
```

## 4. Refresh Token
```bash
curl -X POST "$BASE_URL/auth/refresh" \
  -H "Authorization: Bearer $REFRESH_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

## 5. Change Password
```bash
curl -X PUT "$BASE_URL/auth/change-password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "password123",
    "new_password": "newpassword123"
  }'
```

**Expected Response:**
```json
{
  "message": "Password changed successfully. All sessions have been logged out for security.",
  "tokens_revoked": true
}
```

*Note: After password change, you'll need to login again as all tokens are revoked.*

## 6. Reset Password Request
```bash
curl -X POST "$BASE_URL/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "message": "If an account with this email exists, a password reset link has been sent"
}
```

## 7. Logout All Devices
```bash
curl -X POST "$BASE_URL/auth/logout-all" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Successfully logged out from all devices",
  "revoked_at": "2024-01-01T12:00:00.000000+00:00"
}
```

## 8. Logout Current Session
```bash
curl -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Successfully logged out"
}
```

## 9. Admin - Cleanup Expired Tokens
```bash
# Note: Requires admin privileges
curl -X POST "$BASE_URL/auth/cleanup-tokens" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (Admin only):**
```json
{
  "message": "Cleaned up 5 expired tokens",
  "cleaned_count": 5
}
```

**Error Response (Non-admin):**
```json
{
  "message": "Admin access required"
}
```

## 10. Admin - Revoke User Tokens
```bash
# Note: Requires admin privileges
curl -X POST "$BASE_URL/auth/revoke-user-tokens" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123,
    "reason": "admin_revoke"
  }'
```

**Expected Response (Admin only):**
```json
{
  "message": "All tokens revoked for user",
  "user_id": 123,
  "revoked_at": "2024-01-01T12:00:00.000000+00:00",
  "reason": "admin_revoke"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation error",
  "errors": {
    "email": ["Missing data for required field."]
  }
}
```

### 401 Unauthorized
```json
{
  "message": "Invalid email or password"
}
```

### 403 Forbidden
```json
{
  "message": "Admin access required"
}
```

### 409 Conflict
```json
{
  "message": "User with this email already exists"
}
```

### 500 Internal Server Error
```json
{
  "message": "Login failed: Database connection error"
}
```

## Testing Workflow

1. **Start the Flask development server**
   ```bash
   cd /path/to/backend
   python run.py
   ```

2. **Test Health Check** - Should return status "healthy"

3. **Register a new user** - Copy access_token and refresh_token from response

4. **Set tokens in environment variables:**
   ```bash
   ACCESS_TOKEN="your_access_token_here"
   REFRESH_TOKEN="your_refresh_token_here"
   ```

5. **Test authenticated endpoints** using the tokens

6. **Test logout** - Tokens should be invalidated after this

7. **Login again** to get new tokens for further testing

## Tips for Postman

1. Import the `auth_endpoints.postman_collection.json` file into Postman
2. The collection includes variables that automatically capture tokens from login/register responses
3. Tests are included to automatically set collection variables
4. Run the requests in order for the best testing experience

## Security Notes

- Access tokens expire after a configured time (typically 15-30 minutes)
- Refresh tokens expire after a longer time (typically 30 days)
- Password changes revoke all existing tokens for security
- Admin endpoints require admin privileges
- Tokens are blacklisted on logout to prevent reuse