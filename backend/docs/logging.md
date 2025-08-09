# Logging Configuration

The Autophon API uses Python's built-in logging module with automatic log rotation and comprehensive error tracking.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
LOG_DIR=/path/to/your/logs
```

If not specified, logs will be written to `/tmp/autophon_logs`.

### Log Files

The application creates two log files:

1. **`autophon.log`** - General application logs (INFO and above)
2. **`autophon_errors.log`** - Error logs only (ERROR and above)

### Log Rotation

- Files are automatically rotated when they exceed 1MB
- Up to 10 backup files are kept for general logs
- Up to 5 backup files are kept for error logs
- Old files are automatically deleted

## Log Levels

### Development Environment
- **Console**: INFO and above
- **File**: DEBUG and above
- **Error File**: ERROR and above

### Production Environment
- **Console**: WARNING and above
- **File**: INFO and above
- **Error File**: ERROR and above

## Log Format

### File Logs
```
[2024-01-01 12:00:00,000] ERROR in auth.Login (auth.py:125): Login failed
```

### Console Logs
```
[2024-01-01 12:00:00,000] ERROR: Login failed
```

## What Gets Logged

### Authentication Events
- User registration
- Login attempts (successful and failed)
- Logout events
- Token refresh
- Password changes
- Token revocation events
- Invalid/expired token attempts

### Database Operations
- Record insertions, updates, and deletions
- Database transaction failures
- Connection issues

### Security Events
- Blacklisted token access attempts
- Unauthorized access attempts
- Admin privilege escalations
- Token blacklisting events

### Application Errors
- Exception stack traces
- Validation errors
- API endpoint errors
- Critical system failures

### Request Information (DEBUG level)
- HTTP method and path
- Request headers
- Request JSON data (passwords redacted)

## Security Features

### Sensitive Data Protection
The logging system automatically redacts sensitive information:
- `password` fields are replaced with `[REDACTED]`
- `current_password` fields are replaced with `[REDACTED]`
- `new_password` fields are replaced with `[REDACTED]`

### User Privacy
- User emails and IDs are logged for audit purposes
- Personal information is not logged unnecessarily
- Request data logging respects privacy settings

## Usage Examples

### In Resource Classes
```python
from app.utils.logger import get_logger, log_exception, log_request_info

logger = get_logger(__name__)

class MyResource(Resource):
    def post(self):
        log_request_info(logger, request)
        try:
            # Your code here
            logger.info("Operation completed successfully")
        except Exception as e:
            log_exception(logger, "Operation failed")
            return {"message": "Operation failed"}, 500
```

### Manual Logging
```python
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Different log levels
logger.debug("Detailed debugging information")
logger.info("General information")
logger.warning("Something unexpected happened")
logger.error("An error occurred")
logger.critical("Critical system error")

# Log with exception traceback
try:
    risky_operation()
except Exception:
    logger.exception("Operation failed with exception")
```

## Log Analysis

### Common Log Patterns

#### Successful Authentication
```
[2024-01-01 12:00:00] INFO: User logged in successfully: user@example.com (ID: 123)
```

#### Failed Login Attempt
```
[2024-01-01 12:00:01] WARNING: Failed login attempt for email: user@example.com
```

#### Token Issues
```
[2024-01-01 12:00:02] WARNING: Blocked blacklisted token for user 123: abc123...
[2024-01-01 12:00:03] INFO: Expired token access attempted for user 123
```

#### Database Operations
```
[2024-01-01 12:00:04] DEBUG: Inserted new User record
[2024-01-01 12:00:05] ERROR: Failed to update Task: Connection timeout
```

### Log Monitoring

For production environments, consider:

1. **Log aggregation** - Use tools like ELK Stack, Splunk, or CloudWatch
2. **Alerting** - Set up alerts for ERROR level messages
3. **Metrics** - Extract metrics from log patterns
4. **Retention** - Configure appropriate log retention policies

### Log File Locations

Default log structure:
```
/path/to/logs/
├── autophon.log          # Current general log
├── autophon.log.1        # Previous general log (rotated)
├── autophon.log.2        # Older general log
├── autophon_errors.log   # Current error log
├── autophon_errors.log.1 # Previous error log (rotated)
└── ...
```

## Troubleshooting

### Common Issues

#### Permission Errors
Ensure the application has write permissions to the log directory:
```bash
chmod 755 /path/to/logs
chown app_user:app_group /path/to/logs
```

#### Disk Space
Monitor disk usage as logs can grow large:
```bash
du -sh /path/to/logs/*
```

#### Log Rotation Not Working
Check that the log directory exists and is writable. The rotation is handled automatically by Python's `RotatingFileHandler`.

### Debug Mode Logging

In development, set `FLASK_ENV=development` to enable:
- More verbose console output
- DEBUG level logging to files
- Request/response logging

### Production Recommendations

1. Set `FLASK_ENV=production`
2. Use a dedicated log directory with proper permissions
3. Set up log monitoring and alerting
4. Implement log retention policies
5. Consider using structured logging (JSON format) for easier parsing

## Integration with Monitoring Tools

### Example Logstash Configuration
```ruby
input {
  file {
    path => "/path/to/logs/autophon.log"
    type => "autophon"
  }
}

filter {
  if [type] == "autophon" {
    grok {
      match => { "message" => "\[%{TIMESTAMP_ISO8601:timestamp}\] %{LOGLEVEL:level} in %{DATA:module}\.%{DATA:function} \(%{DATA:file}:%{NUMBER:line}\): %{GREEDYDATA:log_message}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "autophon-logs-%{+YYYY.MM.dd}"
  }
}
```

This comprehensive logging setup provides detailed insights into application behavior and helps with debugging, monitoring, and security auditing.