# AutoPhon Real-time Upload Worker

A modern, optimized upload processing worker designed for near-instant user experience, replacing the original MongoDB-based uploader.py with significant performance and reliability improvements.

## Key Features

### Real-time Processing
- **100ms minimum polling**: Near-instant response for uploaded files
- **2 second maximum polling**: Quick response even during idle periods
- **Concurrent processing**: Handle multiple uploads simultaneously
- **Real-time status updates**: Users see immediate feedback

### Modern Architecture
- **SQLAlchemy Integration**: Uses current database models instead of MongoDB
- **Enhanced Error Handling**: Comprehensive error recovery and retry logic
- **Production Ready**: Complete systemd integration with proper monitoring
- **Resource Optimized**: Lighter resource footprint than alignment worker

## Performance Improvements

| Metric | Old uploader.py | New upload_worker.py |
|--------|----------------|---------------------|
| Polling Interval | 4 seconds (fixed) | 0.1-2 seconds (dynamic) |
| Database | MongoDB | SQLAlchemy (PostgreSQL) |
| Concurrency | Single process | Multi-threaded (3 workers) |
| Error Handling | Basic | Enhanced with retry |
| Monitoring | Minimal | Comprehensive stats |
| User Experience | Delayed | Near real-time |

## Architecture

### Components

1. **UploadWorker**: Main worker class handling polling and task distribution
2. **UploadTaskProcessor**: Handles individual upload processing with retry logic
3. **UploadWorkerConfig**: Configuration management optimized for real-time processing

### Processing Flow

```
1. Worker polls database every 100ms-2s for tasks with status='uploading'
2. Tasks are processed concurrently using ThreadPoolExecutor (3 workers)
3. Each task goes through: validation → file processing → status update
4. Failed tasks are retried quickly (1-2 attempts) to maintain real-time feel
5. Completed tasks have status updated to 'uploaded' (ready for alignment)
```

## Installation & Setup

### 1. Environment Variables

The upload worker uses the same environment as the main application:

```bash
# Required paths (from main .env file)
UPLOADS=/path/to/uploads
LOGS=/path/to/logs

# Optional worker settings
UPLOAD_WORKERS=3                    # Number of concurrent upload workers
WORKER_LOG_LEVEL=INFO              # Logging level
```

### 2. Dependencies

All dependencies are already included with your Flask application:

```bash
# Main dependencies (already installed)
flask
sqlalchemy
python-dotenv
praatio  # For TextGrid processing
```

### 3. File Permissions

Make the scripts executable:

```bash
chmod +x /path/to/scripts/upload_worker.py
chmod +x /path/to/scripts/start_upload_worker.sh
```

## Usage

### Development Mode

```bash
# Run directly for development/testing
python scripts/upload_worker.py

# Or use the startup script
./scripts/start_upload_worker.sh
```

### Production Deployment

#### Option 1: systemd Service (Recommended)

Copy the service file:

```bash
sudo cp scripts/systemd/autophon-upload-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
```

Configure and start:

```bash
# Enable auto-start on boot
sudo systemctl enable autophon-upload-worker

# Start the service
sudo systemctl start autophon-upload-worker

# Check status
sudo systemctl status autophon-upload-worker

# View real-time logs
sudo journalctl -u autophon-upload-worker -f
```

#### Option 2: Background Process

```bash
# Start in daemon mode
./scripts/start_upload_worker.sh --daemon

# Check if running
pgrep -f upload_worker.py

# Stop the worker
pkill -f upload_worker.py
```

#### Option 3: Process Manager

For **supervisor**:

```ini
[program:autophon-upload-worker]
command=/usr/bin/python3 /path/to/scripts/upload_worker.py
directory=/path/to/backend
user=your_app_user
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/autophon-upload-worker.log
environment=PYTHONPATH="/path/to/backend"
```

## Configuration

### Real-time Optimization

The upload worker is specifically configured for real-time user experience:

```python
# Real-time polling configuration
MIN_POLL_INTERVAL = 0.1  # 100ms for instant response
MAX_POLL_INTERVAL = 2.0  # 2s maximum when idle
POLL_BACKOFF_FACTOR = 1.3  # Gentle backoff

# Quick retry for uploads
RETRY_ATTEMPTS = 2  # Fast retry for real-time feel
RETRY_DELAY = 1     # 1 second between retries
```

### Resource Limits

Upload worker uses lighter resources than alignment worker:

```ini
# systemd resource limits
MemoryLimit=1G          # Less memory than alignment worker
TasksMax=25             # Fewer processes needed
Nice=-5                 # Higher priority for real-time feel
IOSchedulingClass=1     # Real-time I/O scheduling
```

## Monitoring

### Log Files

The worker logs to multiple locations:

- **Application logs**: `{LOGS}/upload_worker.log`
- **System logs**: `/var/log/syslog` (systemd) or `/var/log/supervisor/`
- **Journal logs**: `sudo journalctl -u autophon-upload-worker`

### Statistics

The worker logs statistics every 30 seconds:

```
Upload Worker Stats - Uptime: 2:45:30, Processed: 156, Success: 152 (97.4%), Failed: 4, Active: 1/3, Peak: 3, Avg Time: 1.2s, Poll Interval: 0.100s
```

**Metrics Explained:**
- **Processed**: Total uploads processed
- **Success Rate**: Percentage of successful uploads
- **Active**: Currently processing uploads
- **Peak**: Maximum concurrent uploads handled
- **Avg Time**: Average processing time per upload
- **Poll Interval**: Current polling frequency

### Health Checks

Monitor upload worker health:

```bash
# systemd
sudo systemctl is-active autophon-upload-worker

# process check
pgrep -f upload_worker.py

# log check for recent activity
sudo journalctl -u autophon-upload-worker --since "5 minutes ago"
```

### Database Monitoring

Monitor upload tasks in the database:

```sql
-- Check upload task distribution
SELECT task_status, COUNT(*) 
FROM tasks 
WHERE task_status IN ('uploading', 'uploaded', 'processing') 
GROUP BY task_status;

-- Find stuck uploads (uploading for too long)
SELECT task_id, task_status, created_at, updated_at 
FROM tasks 
WHERE task_status = 'uploading' 
AND created_at < NOW() - INTERVAL '5 minutes';

-- Recent upload activity
SELECT task_id, task_status, created_at, updated_at 
FROM tasks 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## Troubleshooting

### Common Issues

#### 1. Worker Not Starting

Check logs:

```bash
# systemd
sudo journalctl -u autophon-upload-worker -n 50

# direct execution
python scripts/upload_worker.py
```

**Common causes:**
- Database connection issues
- Missing environment variables
- File permission problems
- Port conflicts

#### 2. Uploads Not Being Processed

**Symptoms**: Tasks stuck in 'uploading' status

**Diagnosis:**
```bash
# Check if worker is running
sudo systemctl status autophon-upload-worker

# Check recent logs
sudo journalctl -u autophon-upload-worker --since "10 minutes ago"

# Check database for stuck tasks
```

**Solutions:**
1. Restart the worker: `sudo systemctl restart autophon-upload-worker`
2. Check file permissions in UPLOADS directory
3. Verify database connectivity

#### 3. High Processing Times

**Symptoms**: Avg processing time > 5 seconds

**Causes:**
- Disk I/O bottleneck
- Database performance issues
- Large file uploads
- Insufficient worker threads

**Solutions:**
1. Increase worker count: `UPLOAD_WORKERS=5`
2. Check disk space and I/O performance
3. Optimize database queries
4. Consider file size limits

#### 4. Memory Usage Issues

**Symptoms**: High memory consumption

**Solutions:**
1. Reduce worker count
2. Add memory limits to systemd service
3. Monitor for memory leaks
4. Check for large file processing

### Debug Mode

Run in debug mode for troubleshooting:

```bash
WORKER_LOG_LEVEL=DEBUG python scripts/upload_worker.py
```

### Manual Upload Processing

Process a specific upload manually:

```python
from app import create_app
from app.models import Task, TaskStatus
from scripts.upload_worker import UploadTaskProcessor, UploadWorkerConfig

app = create_app()
with app.app_context():
    task = Task.query.filter_by(task_id="your_task_id").first()
    processor = UploadTaskProcessor(UploadWorkerConfig())
    success = processor.process_upload_with_retry(task)
    print(f"Upload processing result: {success}")
```

## Migration from Old System

### Differences from old uploader.py

| Feature | Old uploader.py | New upload_worker.py |
|---------|----------------|---------------------|
| Database | MongoDB direct access | SQLAlchemy models |
| Polling | 4-second fixed | 0.1-2 second dynamic |
| Processing | Single process | Multi-threaded |
| Error handling | Basic try/catch | Retry with backoff |
| Monitoring | Minimal logging | Comprehensive stats |
| User experience | Delayed feedback | Real-time response |

### Migration Steps

1. **Stop old uploader**: `pkill -f uploader.py`
2. **Verify database migration**: Ensure all uploads use SQLAlchemy models
3. **Test upload worker**: Run in development mode first
4. **Deploy production**: Use systemd service
5. **Monitor**: Check logs and processing times
6. **Optimize**: Adjust worker count based on load

### Rollback Plan

If needed to rollback:

1. Stop new worker: `sudo systemctl stop autophon-upload-worker`
2. Start old uploader: `python scripts/uploader.py &`
3. Tasks in 'uploading' status will be retried

## Performance Tuning

### Optimal Settings

**Light Load (< 10 uploads/hour)**:
```bash
UPLOAD_WORKERS=1
MIN_POLL_INTERVAL=0.5
```

**Medium Load (10-100 uploads/hour)**:
```bash
UPLOAD_WORKERS=3
MIN_POLL_INTERVAL=0.1
```

**Heavy Load (> 100 uploads/hour)**:
```bash
UPLOAD_WORKERS=5
MIN_POLL_INTERVAL=0.1
MAX_POLL_INTERVAL=1.0
```

### Monitoring Performance

Key metrics to watch:

- **Response Time**: Users should see feedback within 1-2 seconds
- **Processing Time**: Average should be < 3 seconds per upload
- **Success Rate**: Should be > 95%
- **Queue Depth**: Active uploads should rarely exceed worker count

### Optimization Tips

1. **Database Optimization**:
   - Index on `task_status` and `created_at`
   - Regular database maintenance
   - Connection pooling

2. **File System Optimization**:
   - Fast SSD storage for UPLOADS directory
   - Regular cleanup of processed files
   - Proper file permissions

3. **System Optimization**:
   - Adequate RAM for concurrent processing
   - Fast CPU for file processing
   - Network optimization for file transfers

## Integration with Main Application

### API Integration

The upload worker integrates seamlessly with the current upload API:

1. **Upload API** creates tasks with `TaskStatus.UPLOADING`
2. **Upload Worker** processes these tasks in real-time
3. **Tasks updated** to `TaskStatus.UPLOADED` when ready
4. **Alignment Worker** picks up uploaded tasks for alignment

### User Experience Flow

```
User uploads files → API creates task → Upload worker processes (100ms-2s) → User sees "Processing..." → Task ready for alignment → User sees "Queued for alignment"
```

This provides a much smoother user experience compared to the old 4-second polling system.

## Future Enhancements

The current implementation provides a solid foundation for:

1. **WebSocket Integration**: Real-time progress updates to frontend
2. **Priority Queues**: VIP user uploads processed first
3. **Load Balancing**: Multiple upload workers across servers
4. **Metrics Dashboard**: Web interface for monitoring uploads
5. **Auto-scaling**: Dynamic worker adjustment based on load

## Support

For issues or questions:

1. Check logs first: `sudo journalctl -u autophon-upload-worker -f`
2. Review this documentation
3. Test with manual upload processing
4. Verify database state and file permissions
5. Contact development team with specific error messages and logs