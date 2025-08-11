#!/bin/bash

# Autophon Alignment Worker Startup Script
# This script provides an easy way to start the alignment worker
# with proper environment setup and error handling

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
WORKER_SCRIPT="$SCRIPT_DIR/alignment_worker.py"
LOG_DIR="${LOG_DIR:-$APP_DIR/logs}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "$WORKER_SCRIPT" ]]; then
        log_error "Worker script not found: $WORKER_SCRIPT"
        exit 1
    fi
    
    # Check .env file
    if [[ ! -f "$APP_DIR/.env" ]]; then
        log_warn ".env file not found at $APP_DIR/.env"
        log_warn "Make sure environment variables are set"
    fi
    
    log_success "Dependencies check passed"
}

check_environment() {
    log_info "Checking environment variables..."
    
    required_vars=("ADMIN" "UPLOADS" "LOGS")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        log_error "Please set them in your .env file or export them"
        exit 1
    fi
    
    log_success "Environment variables check passed"
}

setup_logging() {
    # Create logs directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Set log file path
    LOG_FILE="$LOG_DIR/alignment_worker.log"
    
    log_info "Logs will be written to: $LOG_FILE"
}

check_running_worker() {
    if pgrep -f "alignment_worker.py" > /dev/null; then
        log_warn "Alignment worker appears to be already running"
        log_warn "PID: $(pgrep -f alignment_worker.py)"
        
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Exiting..."
            exit 0
        fi
    fi
}

start_worker() {
    log_info "Starting Autophon Alignment Worker..."
    log_info "Worker script: $WORKER_SCRIPT"
    log_info "Working directory: $APP_DIR"
    
    # Change to app directory
    cd "$APP_DIR"
    
    # Start the worker
    if [[ "${1:-}" == "--daemon" ]]; then
        log_info "Starting in daemon mode..."
        nohup python3 "$WORKER_SCRIPT" >> "$LOG_FILE" 2>&1 &
        WORKER_PID=$!
        log_success "Worker started with PID: $WORKER_PID"
        log_info "Monitor logs with: tail -f $LOG_FILE"
    else
        log_info "Starting in foreground mode (Ctrl+C to stop)..."
        python3 "$WORKER_SCRIPT"
    fi
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --daemon        Run worker in background (daemon mode)
    --check         Only check dependencies and environment
    --help          Show this help message

Examples:
    $0                  # Run worker in foreground
    $0 --daemon         # Run worker in background
    $0 --check          # Check setup without starting
    
Environment Variables:
    LOG_DIR             Directory for log files (default: APP_DIR/logs)
    ALIGNMENT_WORKERS   Number of concurrent workers (default: 2)
    WORKER_LOG_LEVEL    Log level (default: INFO)

EOF
}

# Main execution
main() {
    case "${1:-}" in
        --help|-h)
            show_usage
            exit 0
            ;;
        --check)
            log_info "Checking setup without starting worker..."
            check_dependencies
            source "$APP_DIR/.env" 2>/dev/null || true
            check_environment  
            setup_logging
            log_success "Setup check completed successfully"
            exit 0
            ;;
        --daemon)
            check_dependencies
            source "$APP_DIR/.env" 2>/dev/null || true
            check_environment
            setup_logging
            check_running_worker
            start_worker --daemon
            ;;
        "")
            check_dependencies
            source "$APP_DIR/.env" 2>/dev/null || true
            check_environment
            setup_logging
            check_running_worker
            start_worker
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'log_info "Interrupted by user"; exit 130' INT

# Run main function
main "$@"