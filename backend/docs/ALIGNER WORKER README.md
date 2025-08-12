# Autophon Alignment Worker

A modern, optimized replacement for the original `sniffer.py` with improved performance, reliability, and maintainability.

## Key Improvements

- **Dynamic Polling**: Adjusts polling frequency based on workload (1-30 seconds)
- **SQLAlchemy Integration**: Uses the new database models instead of direct MongoDB
- **Concurrent Processing**: Handles multiple tasks simultaneously
- **Enhanced Error Handling**: Retry logic with exponential backoff
- **Graceful Shutdown**: Proper cleanup when stopped
- **Resource Management**: Better memory and disk usage handling
- **Comprehensive Logging**: Detailed logging and statistics

## Architecture

### Components

1. **AlignmentWorker**: Main worker class handling polling and task distribution
2. **TaskProcessor**: Handles individual task processing with retry logic  
3. **WorkerConfig**: Configuration management and environment setup

### Flow

```
1. Worker polls database for tasks with status='uploaded'
2. Tasks are processed concurrently using ThreadPoolExecutor
3. Each task goes through: processing → alignment → packaging → cleanup
4. Failed tasks are retried with exponential backoff
5. Completed tasks have status updated to 'completed' or 'failed'
```

## Installation & Setup

### 1. Environment Variables

Make sure these are set in your `.env` file:

```bash
# Required paths
ADMIN=/path/to/admin/files
UPLOADS=/path/to/uploads
LOGS=/path/to/logs
CURRENT_DIR=/path/to/app

# Alignment engines
MFA1=/path/to/mfa1/executable
MFA2=/path/to/mfa2/executable  
FASE=/path/to/fase/executable
FAVE_DIR=/path/to/fave/directory
CONDA_ENV="conda activate your_env &&"

# Worker settings (optional)
ALIGNMENT_WORKERS=2
WORKER_LOG_LEVEL=INFO
```

### 2. Dependencies

Install required Python packages:

```bash
# Already installed with your Flask app
pip install praatio
pip install python-dotenv
```

### 3. File Permissions

Make the script executable:

```bash
chmod +x /path/to/scripts/alignment_worker.py
```

## Usage

### Basic Usage

```bash
# Run directly
python /path/to/scripts/alignment_worker.py

# Or make executable and run
./alignment_worker.py
```

### Production Deployment

#### Option 1: systemd Service (Recommended)

Create `/etc/systemd/system/autophon-worker.service`:

```ini
[Unit]
Description=Autophon Alignment Worker
After=network.target
Wants=network.target

[Service]
Type=simple
User=your_app_user
Group=your_app_group
WorkingDirectory=/path/to/your/app/backend
ExecStart=/usr/bin/python3 /path/to/scripts/alignment_worker.py
Restart=always
RestartSec=5
Environment=PYTHONPATH=/path/to/your/app/backend

# Resource limits
MemoryLimit=2G
TasksMax=50

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable autophon-worker
sudo systemctl start autophon-worker

# Check status
sudo systemctl status autophon-worker

# View logs
sudo journalctl -u autophon-worker -f
```

#### Option 2: Supervisor

Install supervisor:

```bash
sudo apt install supervisor
```

Create `/etc/supervisor/conf.d/autophon-worker.conf`:

```ini
[program:autophon-worker]
command=/usr/bin/python3 /path/to/scripts/alignment_worker.py
directory=/path/to/your/app/backend
user=your_app_user
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/autophon-worker.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
environment=PYTHONPATH="/path/to/your/app/backend"
```

Start:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start autophon-worker

# Check status
sudo supervisorctl status autophon-worker
```

#### Option 3: Docker (Advanced)

Create `Dockerfile.worker`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "scripts/alignment_worker.py"]
```

Build and run:

```bash
docker build -f Dockerfile.worker -t autophon-worker .
docker run -d --name autophon-worker --env-file .env autophon-worker
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALIGNMENT_WORKERS` | `2` | Number of concurrent tasks to process |
| `WORKER_LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |

### Worker Configuration

You can customize worker behavior by modifying `worker_config.py`:

```python
# Example customization
config = WorkerConfig(
    max_workers=4,              # Process up to 4 tasks simultaneously
    min_poll_interval=0.5,      # Check every 0.5 seconds when busy
    max_poll_interval=60,       # Check every minute when idle
    retry_attempts=5,           # Retry failed tasks 5 times
    task_timeout=7200          # 2 hour timeout per task
)
```

## Monitoring

### Log Files

The worker logs to:
- **Application logs**: `{LOGS}/alignment_worker.log`
- **System logs**: `/var/log/syslog` (systemd) or `/var/log/supervisor/` (supervisor)

### Statistics

The worker logs statistics every minute:

```
Worker Stats - Uptime: 1:23:45, Processed: 156, Success: 142, Failed: 14, Active: 2, Poll Interval: 1.0s
```

### Health Checks

Check if the worker is running:

```bash
# systemd
sudo systemctl is-active autophon-worker

# supervisor  
sudo supervisorctl status autophon-worker

# process check
pgrep -f alignment_worker.py
```

### Database Monitoring

Monitor task status in your database:

```sql
-- Check task distribution
SELECT task_status, COUNT(*) FROM tasks GROUP BY task_status;

-- Find stuck tasks (processing for too long)
SELECT task_id, task_status, created_at, updated_at 
FROM tasks 
WHERE task_status = 'processing' 
AND updated_at < NOW() - INTERVAL 1 HOUR;
```

## Troubleshooting

### Common Issues

#### 1. Worker Not Starting

Check logs for:
```bash
# systemd
sudo journalctl -u autophon-worker -n 50

# supervisor
sudo tail -f /var/log/supervisor/autophon-worker.log
```

Common causes:
- Missing environment variables
- Database connection issues
- File permission problems
- Missing dependencies

#### 2. Tasks Stuck in 'processing' Status

This usually happens when:
- Worker crashes during processing
- System runs out of memory/disk space
- Alignment engine fails

**Solution**: Restart the worker. Tasks will be automatically retried.

```bash
sudo systemctl restart autophon-worker
```

#### 3. High Memory Usage

If the worker uses too much memory:

1. Reduce `max_workers` in configuration
2. Add memory limits to systemd service
3. Monitor disk usage in upload directories

#### 4. Alignment Failures

Check alignment engine paths in `.env`:
```bash
# Test alignment engines manually
$MFA1 --version
$MFA2 --version
$FASE --help
```

### Debug Mode

Run in debug mode for troubleshooting:

```bash
WORKER_LOG_LEVEL=DEBUG python alignment_worker.py
```

### Manual Task Processing

To process a specific task manually:

```python
from app import create_app
from app.models import Task
from scripts.alignment_worker import TaskProcessor, WorkerConfig

app = create_app()
with app.app_context():
    task = Task.query.filter_by(task_id="your_task_id").first()
    processor = TaskProcessor(WorkerConfig())
    success = processor.process_task_with_retry(task)
    print(f"Task processing result: {success}")
```

## Migration from Old Sniffer

### Differences

| Old sniffer.py | New alignment_worker.py |
|----------------|-------------------------|
| MongoDB direct access | SQLAlchemy models |
| Fixed 4-second polling | Dynamic 1-30 second polling |
| Single task processing | Concurrent processing |
| Basic error handling | Retry logic with backoff |
| No graceful shutdown | Proper signal handling |

### Migration Steps

1. **Stop old sniffer**: `pkill -f sniffer.py`
2. **Update database schema**: Ensure SQLAlchemy models are migrated
3. **Configure environment**: Set up `.env` variables
4. **Start new worker**: Follow deployment instructions above
5. **Monitor**: Check logs and task processing

### Rollback Plan

If you need to rollback:

1. Stop new worker: `sudo systemctl stop autophon-worker`
2. Start old sniffer: `python sniffer.py &`
3. Tasks in 'processing' status will be retried

## Performance Tuning

### Optimal Settings

For different server specifications:

**Small Server (2 CPU, 4GB RAM)**:
```bash
ALIGNMENT_WORKERS=1
```

**Medium Server (4 CPU, 8GB RAM)**:
```bash
ALIGNMENT_WORKERS=2
```

**Large Server (8+ CPU, 16GB+ RAM)**:
```bash
ALIGNMENT_WORKERS=4
```

### Monitoring Performance

Watch for:
- CPU usage during alignment
- Memory usage per worker
- Disk I/O for file operations
- Database query performance

Use tools like `htop`, `iotop`, and database monitoring to optimize.

## Future Enhancements

The current implementation provides a solid foundation for future improvements:

1. **Task Queue Migration**: Easy to migrate to Celery/RQ later
2. **Load Balancing**: Can run multiple workers on different servers
3. **Priority Queues**: Add task prioritization
4. **Web Dashboard**: Monitor worker status via web interface
5. **Metrics Export**: Export metrics to monitoring systems

## Support

For issues or questions:
1. Check logs first
2. Review this documentation  
3. Test with manual task processing
4. Contact the development team with specific error messages and logs