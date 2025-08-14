# Authentication Integration Documentation

This document describes the complete authentication integration with the Autophon backend API.

## Overview

The authentication system uses HTTP-only cookies for secure token storage and includes:
- User registration and login
- Automatic token refresh
- Logout functionality
- Error handling with toast notifications
- Retry logic for network failures

## API Configuration

### Base Setup
```typescript
// lib/api.ts
export const api = axios.create({
  baseURL: "https://new.autophontest.se/api/v1",
  withCredentials: true, // Important: Enables HTTP-only cookies
  timeout: 30000
});
```

### Error Handling
- Automatic retry for 5xx errors and network timeouts (up to 2 retries with exponential backoff)
- Automatic token refresh on 401 errors
- Comprehensive error message extraction from API responses
- Toast notifications for all authentication events

## Authentication Endpoints

### Registration
- **Endpoint**: `POST /auth/register`
- **Required fields**: email, password, first_name, last_name
- **Optional fields**: title, org, industry
- **Response**: User object with HTTP-only cookies set

### Login
- **Endpoint**: `POST /auth/login` 
- **Required fields**: email, password
- **Response**: User object with HTTP-only cookies set

### Logout
- **Endpoint**: `POST /auth/logout`
- **Effect**: Clears HTTP-only cookies on server

### Token Verification
- **Endpoint**: `GET /auth/verify`
- **Purpose**: Check if current session is valid
- **Used**: On app startup and after token refresh

### Token Refresh
- **Endpoint**: `POST /auth/refresh`
- **Automatic**: Triggered by 401 responses
- **Effect**: Issues new access token via HTTP-only cookie

## Redux Integration

### Auth Slice
```typescript
// store/authSlice.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Actions available:
export const login = createAsyncThunk(...)
export const register = createAsyncThunk(...)
export const logout = createAsyncThunk(...)
export const verifyToken = createAsyncThunk(...)
```

### Usage in Components
```typescript
import { useAppDispatch, useAppSelector } from "../hooks/useAppDispatch";
import { login, register, logout } from "../store/authSlice";

function MyComponent() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error } = useAppSelector(
    (state) => state.auth
  );

  const handleLogin = (credentials) => {
    dispatch(login(credentials));
  };
}
```

## Toast Notifications

### Automatic Notifications
- **Login Success**: "Welcome back!"
- **Registration Success**: "Welcome to Autophon! Your account has been created successfully."
- **Logout Success**: "You have been logged out successfully."
- **Login/Registration Errors**: Shows specific error message from API

### Manual Toast Usage
```typescript
import { useToast } from "../hooks/useToast";

function MyComponent() {
  const toast = useToast();
  
  // Show different toast types
  toast.success("Operation successful!", "Success");
  toast.error("Something went wrong!", "Error");
  toast.warning("Please verify your input.", "Warning");
  toast.info("Processing your request...", "Info");
}
```

## Form Integration

### Login Form
```typescript
// Integrated with toast notifications
// Automatic redirect on success
// Error handling via toast system
// Loading states handled automatically

const onSubmit = (data) => {
  dispatch(login(data)); // Handles everything automatically
};
```

### Registration Form
```typescript
// Includes captcha verification
// Toast notifications for validation errors
// Automatic success handling

const onSubmit = (data) => {
  if (!captchaVerified) {
    toast.warning("Please complete the captcha verification.");
    return;
  }
  dispatch(register(data));
};
```

## Session Management

### Automatic Session Verification
```typescript
// AppInitializer.tsx - runs on app startup
useEffect(() => {
  dispatch(verifyToken()); // Checks if user is still logged in
}, [dispatch]);
```

### Logout Event Handling
```typescript
// Listens for logout events from API interceptor
useEffect(() => {
  const handleAuthLogout = () => {
    dispatch(clearAuth());
  };
  
  window.addEventListener('auth:logout', handleAuthLogout);
  return () => window.removeEventListener('auth:logout', handleAuthLogout);
}, [dispatch]);
```

## Error Handling Strategy

### 1. API Level (Interceptors)
- Automatic token refresh on 401
- Retry logic for network failures
- Comprehensive error message extraction

### 2. Redux Level (Async Thunks)
- Structured error handling in thunks
- Consistent error state management
- Proper loading state handling

### 3. UI Level (Components)
- Toast notifications for user feedback
- Loading states in buttons/forms
- Error boundaries for unexpected errors

### 4. Network Failure Handling
- **Connection Timeout**: Retries up to 2 times with exponential backoff
- **5xx Errors**: Automatic retries with backoff
- **401 Errors**: Automatic token refresh attempt
- **Other Errors**: Clear error messages via toast notifications

## Security Features

### HTTP-Only Cookies
- Tokens stored in HTTP-only cookies (not accessible via JavaScript)
- Automatic inclusion in requests via `withCredentials: true`
- Server-side cookie management for security

### CSRF Protection
- Cookies are SameSite by default
- CORS configured properly with credentials

### Token Refresh
- Automatic and transparent token refresh
- Fallback to logout if refresh fails
- No token storage in localStorage/sessionStorage

## Testing

Use the `AuthTest` component to test all authentication functionality:
```typescript
import { AuthTest } from "../components/examples/AuthTest";

// Provides buttons to test:
// - Login with test credentials
// - Registration with sample data  
// - Token verification
// - Logout functionality
// - Toast notifications
```

## Environment Setup

Ensure your backend is running and accessible at:
```
https://new.autophontest.se/api/v1
```

The system will automatically handle CORS and cookie management when properly configured.

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend allows credentials and your domain
2. **Cookie Issues**: Check that `withCredentials: true` is set
3. **401 Loops**: Verify refresh endpoint is working correctly
4. **Toast Not Showing**: Ensure `ToastProvider` wraps your app
5. **Loading States**: Check Redux DevTools for action flow

### Debug Tools

1. **Redux DevTools**: Monitor auth state changes
2. **Network Tab**: Check cookie headers and API responses
3. **Console Logs**: API interceptor logs errors
4. **Toast Notifications**: Visual feedback for all auth events

## Best Practices

1. **Always use `useAppSelector` and `useAppDispatch` hooks**
2. **Let the system handle tokens automatically (don't manually manage)**
3. **Use toast notifications for user feedback**
4. **Handle loading states in UI components**
5. **Test authentication flow thoroughly**
6. **Monitor network requests for proper cookie handling**