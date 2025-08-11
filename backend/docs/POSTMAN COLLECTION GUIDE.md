# Autophon Backend API - Postman Collection Guide

This guide explains how to use the comprehensive Postman collection for testing all Autophon Backend API endpoints.

## 📁 Files Included

- `Autophon_Backend_API.postman_collection.json` - Complete API collection
- `Autophon_Backend_API.postman_environment.json` - Environment variables
- `POSTMAN_COLLECTION_GUIDE.md` - This guide

## 🚀 Quick Start

### 1. Import into Postman

1. Open Postman
2. Click **Import** in the top-left corner
3. Drag and drop both JSON files or click **Upload Files**
4. Select both files:
   - `Autophon_Backend_API.postman_collection.json`
   - `Autophon_Backend_API.postman_environment.json`
5. Click **Import**

### 2. Set Environment

1. In the top-right corner, click the environment dropdown
2. Select **Autophon Backend Environment**
3. Verify the base URL is set correctly (default: `http://localhost:5000/api/v1`)

### 3. Start Testing

1. Ensure your Autophon backend server is running
2. Start with **🔐 Authentication → Register User** or **Login User**
3. Tokens will be automatically set for subsequent requests

## 📊 Collection Structure

### 🔐 Authentication (11 endpoints)
- **Register User** - Create new user account
- **Login User** - Authenticate and get tokens
- **Admin Login** - Admin user authentication
- **Refresh Token** - Renew access token
- **Verify Token** - Check token validity
- **Change Password** - Update user password
- **Reset Password Request** - Request password reset
- **Logout All Devices** - Global logout
- **Logout** - Single session logout
- **Cleanup Tokens (Admin)** - Remove expired tokens
- **Revoke User Tokens (Admin)** - Force logout specific user

### 👤 User Management (5 endpoints)
- **Get User Profile** - Current user profile
- **Update User Profile** - Modify profile information
- **Get Users List** - List all users
- **Get User by ID** - Specific user details
- **Get User Tasks** - User's task history

### 📋 Task Management (12 endpoints)
- **Upload Files (Create Task)** - Start new alignment task
- **Get Tasks List** - List user tasks with filters
- **Get Task Details** - Complete task information
- **Get Task Status** - Real-time status updates
- **Cancel Task** - Stop running task
- **Get Task Files** - List task files
- **Get Task File Names** - File naming information
- **Download Task Results** - Get alignment results
- **Download Task Audio** - Get original audio files
- **Get Missing Words** - Words not in dictionary
- **Bulk Delete Tasks** - Delete multiple tasks
- **Get Task History** - Historical task data
- **Monthly Report Download** - Generate reports

### 🌍 Languages & Engines (8 endpoints)
- **Get Languages** - Available languages
- **Get Language by ID** - Specific language details
- **Get Language by Code** - Language by code lookup
- **Get Language Engines** - Engines for language
- **Get Engines** - Available alignment engines
- **Get Engine by ID** - Specific engine details
- **Get Engine by Code** - Engine by code lookup
- **Get Engine Languages** - Languages for engine

### 📚 Dictionary Management (7 endpoints)
- **Get Dictionaries** - List available dictionaries
- **Upload User Dictionary** - Add custom dictionary
- **Get User Dictionary** - Retrieve user dictionary
- **Get User Dictionaries List** - List user dictionaries
- **Delete User Dictionary** - Remove dictionary
- **Get Dictionary by Language** - Language-specific dictionary
- **Get User Dictionaries** - All dictionaries for user

### ⚡ Aligner Operations (4 endpoints)
- **Get Aligner Dashboard** - Dashboard information
- **Start Alignment** - Begin alignment process
- **Get Alignment Queue** - Queue status
- **Task Expiration** - Handle expired tasks

### 🔄 Language Change & Reupload (4 endpoints)
- **Change Task Language** - Modify task language
- **Get Available Languages for Task** - Compatible languages
- **Reupload Task Files** - Replace task files
- **Get Reupload Info** - Reupload status

### 📤 Upload Status & Downloads (2 endpoints)
- **Get Upload Status (SSE)** - Real-time progress
- **Download Static Files** - Static file downloads

### 🔧 Admin Operations (11 endpoints)
- **Get Site Status** - Current site status
- **Update Site Status** - Enable/disable site
- **Get Blocked Emails** - List blocked emails
- **Add Blocked Email** - Block user email
- **Remove Blocked Email** - Unblock email
- **Find User by Email** - Search users
- **Find User by ID** - User lookup
- **Delete User** - Remove user account
- **Generate User Report** - Excel report
- **Get History Spreadsheets** - Available reports
- **Download History File** - Get specific report
- **Download History ZIP** - All reports archive

### ⚙️ Configuration & Utilities (6 endpoints)
- **Health Check** - API status
- **Site Status Check** - Public site status
- **Get Configuration** - API configuration
- **Get Team Information** - Team details
- **Get Team Images** - Team photos
- **Send Contact Email** - Contact form

### 🔒 Captcha (2 endpoints)
- **Get Register Captcha** - Captcha for registration
- **Cleanup Captcha (Admin)** - Remove expired captchas

## 🔑 Environment Variables

### Automatic Variables (Set by Scripts)
- `access_token` - JWT access token
- `refresh_token` - JWT refresh token
- `admin_access_token` - Admin JWT token
- `admin_refresh_token` - Admin refresh token
- `user_id` - Current user ID
- `admin_user_id` - Admin user ID
- `user_email` - Current user email
- `task_id` - Current task ID
- `language_id` - Language ID
- `language_code` - Language code
- `engine_id` - Engine ID
- `engine_code` - Engine code

### Configuration Variables
- `base_url` - API base URL (default: `http://localhost:5000/api/v1`)
- `test_user_email` - Test user email
- `test_user_password` - Test user password
- `admin_email` - Admin email
- `admin_password` - Admin password

## 🔧 Pre-request Scripts

The collection includes global pre-request scripts that:
- Set default environment variables if not present
- Ensure consistent configuration across requests

## ✅ Test Scripts

Each request includes test scripts that:
- Verify response status codes
- Extract tokens and IDs for subsequent requests
- Validate response structure
- Set environment variables automatically
- Log errors for debugging

## 📝 Testing Workflow

### Basic User Flow
1. **Register User** or **Login User**
2. **Get Languages** and **Get Engines**
3. **Upload Files** (creates task)
4. **Get Task Status** (monitor progress)
5. **Download Task Results** (when complete)

### Admin Flow
1. **Admin Login**
2. **Get Site Status**
3. **Find User by Email**
4. **Generate User Report**
5. **Update Site Status** (if needed)

### Dictionary Management Flow
1. **Login User**
2. **Get User Dictionaries List**
3. **Upload User Dictionary**
4. **Get Dictionary by Language**
5. **Delete User Dictionary** (cleanup)

## 🔍 Advanced Testing

### File Upload Testing
For endpoints that require file uploads:
1. Click on the request
2. Go to **Body** tab
3. Select the file field
4. Click **Select Files** and choose your test files

### SSE (Server-Sent Events) Testing
For the **Upload Status** endpoint:
1. The request is configured with proper SSE headers
2. Response will show real-time events
3. Use Postman's **Stream** option to see live updates

### Error Testing
Test error scenarios by:
1. Using invalid tokens
2. Providing malformed request bodies
3. Accessing unauthorized endpoints
4. Using non-existent IDs

## 🛠️ Customization

### Modify Base URL
To test against different environments:
1. Go to **Environments**
2. Select **Autophon Backend Environment**
3. Update the `base_url` value
4. Save the environment

### Add Custom Variables
1. Click on the environment
2. Add new variables as needed
3. Use `{{variable_name}}` in requests

### Custom Tests
Add your own test scripts:
1. Select any request
2. Go to **Tests** tab
3. Add JavaScript test code

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized**
- Ensure you're logged in (check `access_token` variable)
- Try refreshing the token
- Verify admin endpoints use `admin_access_token`

**404 Not Found**
- Check the `base_url` environment variable
- Ensure the backend server is running
- Verify endpoint paths match API documentation

**File Upload Issues**
- Ensure files are selected in the Body tab
- Check file size limits
- Verify supported file formats

**Variables Not Set**
- Run the authentication requests first
- Check the Tests tab for script errors
- Manually set variables if needed

### Debug Mode
1. Open Postman Console (**View → Show Postman Console**)
2. Run requests to see detailed logs
3. Check for script errors and variable updates

## 📈 Performance Testing

The collection includes response time tests:
- Each request validates response time < 5000ms
- Use Postman's Collection Runner for batch testing
- Monitor performance across different endpoints

## 🔄 Continuous Integration

For automated testing:
1. Export the collection and environment
2. Use Newman (Postman CLI) to run tests
3. Integrate with CI/CD pipelines

```bash
# Install Newman
npm install -g newman

# Run collection
newman run Autophon_Backend_API.postman_collection.json \
  -e Autophon_Backend_API.postman_environment.json \
  --reporters cli,html
```

## 📋 Test Checklist

### Before Testing
- [ ] Backend server is running
- [ ] Environment variables are set
- [ ] Test user accounts exist (or registration works)
- [ ] Test files are available for upload

### Authentication Tests
- [ ] User registration works
- [ ] User login returns tokens
- [ ] Admin login works
- [ ] Token refresh works
- [ ] Token verification works
- [ ] Logout functionality works

### Core Functionality
- [ ] File upload creates tasks
- [ ] Task status updates properly
- [ ] File downloads work
- [ ] Dictionary operations work
- [ ] Language/engine queries work

### Admin Functions
- [ ] Site status control works
- [ ] User management works
- [ ] Email blocking works
- [ ] Report generation works

### Error Handling
- [ ] Invalid requests return proper errors
- [ ] Unauthorized access is blocked
- [ ] Missing data is handled gracefully

## 🎯 Best Practices

1. **Sequential Testing**: Run authentication first
2. **Clean Up**: Delete test data after testing
3. **Environment Isolation**: Use separate environments for testing
4. **Regular Updates**: Keep collection updated with API changes
5. **Documentation**: Document any custom modifications

---

This collection provides comprehensive coverage of all Autophon Backend API endpoints with automated token management, error handling, and response validation. Use it for development, testing, integration, and API exploration.