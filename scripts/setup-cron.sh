#!/bin/bash
#
# Setup Cron Job for Above Market "Create Forecast" Scheduler
#
# This script helps you set up a cron job for automated Above Market forecast creation
#
# Usage:
#   bash scripts/setup-cron.sh
#

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Above Market Scheduler - Cron Setup"
echo "=========================================="
echo ""
echo "This will help you set up automated scheduling for Above Market \"Create Forecast\"."
echo ""
echo "NOTE: This scheduler runs the INITIAL forecast creation (long process)."
echo "      Ensemble weight updates should be done via the web interface."
echo ""

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    echo "WARNING: Running as root. It's recommended to run cron jobs as a non-root user."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Ensure logs directory exists
mkdir -p "$APP_DIR/logs"

echo "Current cron jobs:"
crontab -l 2>/dev/null || echo "No cron jobs found"
echo ""

echo "=========================================="
echo "Available Schedule Templates:"
echo "=========================================="
echo ""
echo "1. Daily at 2 AM"
echo "   0 2 * * * cd $APP_DIR && node schedulers/aboveMarketScheduler.js >> logs/above-market-scheduler.log 2>&1"
echo ""
echo "2. Weekly on Sunday at 2 AM"
echo "   0 2 * * 0 cd $APP_DIR && node schedulers/aboveMarketScheduler.js >> logs/above-market-scheduler.log 2>&1"
echo ""
echo "3. Monthly on 1st at 2 AM"
echo "   0 2 1 * * cd $APP_DIR && node schedulers/aboveMarketScheduler.js >> logs/above-market-scheduler.log 2>&1"
echo ""
echo "4. Every 6 hours"
echo "   0 */6 * * * cd $APP_DIR && node schedulers/aboveMarketScheduler.js >> logs/above-market-scheduler.log 2>&1"
echo ""
echo "5. Weekdays at 3 AM"
echo "   0 3 * * 1-5 cd $APP_DIR && node schedulers/aboveMarketScheduler.js >> logs/above-market-scheduler.log 2>&1"
echo ""
echo "6. Custom schedule"
echo ""

read -p "Select a template (1-6) or 'q' to quit: " choice

case $choice in
    1)
        CRON_EXPR="0 2 * * *"
        LOG_FILE="logs/above-market-scheduler.log"
        ;;
    2)
        CRON_EXPR="0 2 * * 0"
        LOG_FILE="logs/above-market-scheduler.log"
        ;;
    3)
        CRON_EXPR="0 2 1 * *"
        LOG_FILE="logs/above-market-scheduler.log"
        ;;
    4)
        CRON_EXPR="0 */6 * * *"
        LOG_FILE="logs/above-market-scheduler.log"
        ;;
    5)
        CRON_EXPR="0 3 * * 1-5"
        LOG_FILE="logs/above-market-scheduler.log"
        ;;
    6)
        echo ""
        echo "Enter custom cron expression (e.g., 0 2 * * *):"
        echo "Format: minute hour day month weekday"
        echo "Example: 0 2 * * * = Every day at 2:00 AM"
        read -p "Cron expression: " CRON_EXPR
        read -p "Log file (relative to app root): " LOG_FILE
        ;;
    q|Q)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Build the cron job
CRON_JOB="$CRON_EXPR cd $APP_DIR && node schedulers/aboveMarketScheduler.js >> $APP_DIR/$LOG_FILE 2>&1"

echo ""
echo "=========================================="
echo "Cron job to be added:"
echo "=========================================="
echo "$CRON_JOB"
echo ""

read -p "Add this cron job? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "✓ Cron job added successfully!"
echo ""
echo "To view your cron jobs:"
echo "  crontab -l"
echo ""
echo "To view scheduler logs:"
echo "  tail -f $APP_DIR/$LOG_FILE"
echo ""
echo "To remove this cron job:"
echo "  crontab -e"
echo "  Then delete the line containing: aboveMarketScheduler.js"
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
