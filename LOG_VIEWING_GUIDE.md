# Log Viewing Guide

This guide explains how to view logs in your containerized application.

## Overview

Your application now uses **dual logging** - logs are written to both:
1. **File logs** (in `logs/` folder) - for persistent storage
2. **Container stdout/stderr** - for container log viewing

## Viewing Container Logs

### Method 1: Use the Helper Script

Run the interactive script:
```bash
./view-container-logs.sh
```

This provides a menu with options to:
- Follow live logs
- View last N lines
- Search logs
- View logs with timestamps

### Method 2: Direct Docker/Podman Commands

```bash
# View live logs (follow mode)
docker logs -f <container-name-or-id>

# View last 100 lines
docker logs --tail 100 <container-name-or-id>

# View logs with timestamps
docker logs -t <container-name-or-id>

# Search logs
docker logs <container-name-or-id> 2>&1 | grep "ERROR"

# View logs from last 5 minutes
docker logs --since 5m <container-name-or-id>
```

Replace `docker` with `podman` if using Podman.

## Viewing File Logs

File logs are stored in the `logs/` directory:

```bash
# Debug logs (all messages)
tail -f logs/debug.log

# Verbose logs
tail -f logs/verbose.log

# Security logs
tail -f logs/security.log

# Error logs
tail -f logs/error.log

# Audit logs
tail -f logs/audit.log

# Combined logs
tail -f logs/combined.log
```

## Log Levels

### Debug Logger
- **trace**: Very detailed debugging (function entry/exit)
- **debug**: Detailed debugging information
- **verbose**: More information than info
- **http**: HTTP request/response logs
- **info**: General informational messages
- **warn**: Warning messages
- **error**: Error messages

### Security Logger
- **debug**: Detailed security debugging
- **audit**: Audit trail of important actions
- **security**: Security-related events
- **info**: General security information
- **warn**: Security warnings
- **error**: Security errors

## Environment Variables for Log Control

You can control logging behavior with these environment variables:

### Console Log Level
```bash
# Set console log level (in production, defaults to 'info' for debug logger)
CONSOLE_LOG_LEVEL=debug

# Set overall log level for file logs
LOG_LEVEL=debug
DEBUG_LEVEL=trace
```

### Disable Console Logging
```bash
# Completely disable console output (not recommended for containers)
DISABLE_CONSOLE_LOG=true
```

### Production vs Development
```bash
# Development mode - logs everything to console
NODE_ENV=development

# Production mode - logs 'info' and above to console
NODE_ENV=production
```

## Examples

### Example 1: Follow Container Logs in Production
```bash
docker logs -f --tail 50 cde-ai-app
```

### Example 2: Search Container Logs for Errors
```bash
docker logs cde-ai-app 2>&1 | grep -i error
```

### Example 3: View Recent Security Events
```bash
tail -50 logs/security.log | jq .
```

### Example 4: Monitor Multiple Log Sources
```bash
# In separate terminals:
docker logs -f cde-ai-app           # Container logs
tail -f logs/debug.log              # Debug file logs
tail -f logs/security.log           # Security file logs
```

### Example 5: Find Logs from Specific Time
```bash
# Docker logs from last hour
docker logs --since 1h cde-ai-app

# File logs from specific time
grep "2025-11-21 10:*" logs/debug.log
```

## Docker Compose Integration

If using docker-compose, you can view logs with:

```bash
# View all service logs
docker-compose logs -f

# View specific service
docker-compose logs -f app

# View last 100 lines
docker-compose logs --tail 100
```

## Best Practices

1. **Container Logs**: Use for real-time monitoring and debugging
   - Good for: Live debugging, CI/CD pipelines, container orchestration
   - View with: `docker logs -f`

2. **File Logs**: Use for historical analysis and long-term storage
   - Good for: Auditing, troubleshooting past issues, detailed analysis
   - View with: `tail -f logs/*.log`

3. **Production Settings**:
   - Console logs: Set to `info` or `warn` to reduce noise
   - File logs: Set to `debug` for detailed information
   - Always keep audit and security logs

4. **Development Settings**:
   - Console logs: Set to `debug` or `trace` for maximum visibility
   - File logs: Set to `debug` or `trace`

## Troubleshooting

### No Logs Appearing in Container
1. Check if `DISABLE_CONSOLE_LOG=true` is set (remove it)
2. Check `CONSOLE_LOG_LEVEL` - may be set too high
3. Verify the application is actually running and logging

### Too Much Log Output
1. Increase `CONSOLE_LOG_LEVEL` to `info` or `warn`
2. In production, set `NODE_ENV=production`
3. Filter logs: `docker logs app 2>&1 | grep ERROR`

### Log Files Not Created
1. Check if `logs/` directory exists and has correct permissions
2. Verify the application has write access
3. Check for filesystem errors

## Quick Reference

| Task | Command |
|------|---------|
| Follow container logs | `docker logs -f <container>` |
| Last 100 lines | `docker logs --tail 100 <container>` |
| Search logs | `docker logs <container> \| grep "pattern"` |
| Follow debug log file | `tail -f logs/debug.log` |
| List containers | `docker ps` |
| View with script | `./view-container-logs.sh` |
