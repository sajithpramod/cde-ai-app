#!/bin/bash
#
# Test Above Market Scheduler Setup
#
# This script validates the scheduler installation and configuration
#

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Above Market Scheduler - Test Suite"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"

    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "[$TESTS_RUN] Testing: $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "Running tests..."
echo ""

# Test 1: Check if scheduler script exists
run_test "Scheduler script exists" "test -f '$APP_DIR/schedulers/aboveMarketScheduler.js'"

# Test 2: Check if configs directory exists
run_test "Configs directory exists" "test -d '$APP_DIR/configs'"

# Test 3: Check if example config exists
run_test "Example config exists" "test -f '$APP_DIR/configs/above-market-schedule.example.json'"

# Test 4: Check if FP&A config exists
run_test "FP&A config exists" "test -f '$APP_DIR/configs/above-market-schedule-fpa.json'"

# Test 5: Check if MGF config exists
run_test "MGF config exists" "test -f '$APP_DIR/configs/above-market-schedule-mgf.json'"

# Test 6: Check if logs directory exists
if [ ! -d "$APP_DIR/logs" ]; then
    echo -e "${YELLOW}[!] Creating logs directory...${NC}"
    mkdir -p "$APP_DIR/logs"
fi
run_test "Logs directory exists" "test -d '$APP_DIR/logs'"

# Test 7: Check if logs directory is writable
run_test "Logs directory is writable" "test -w '$APP_DIR/logs'"

# Test 8: Check if Node.js is installed
run_test "Node.js is installed" "command -v node"

# Test 9: Check Node.js version (should be >= 14)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
run_test "Node.js version >= 14" "test $NODE_VERSION -ge 14"

# Test 10: Check if R is installed
run_test "R is installed" "command -v Rscript"

# Test 11: Check if Python is installed
run_test "Python is installed" "command -v python3"

# Test 12: Validate FP&A config JSON
run_test "FP&A config is valid JSON" "node -e \"require('$APP_DIR/configs/above-market-schedule-fpa.json')\""

# Test 13: Validate MGF config JSON
run_test "MGF config is valid JSON" "node -e \"require('$APP_DIR/configs/above-market-schedule-mgf.json')\""

# Test 14: Check if AboveMarketFiles directory exists
run_test "AboveMarketFiles directory exists" "test -d '$APP_DIR/AboveMarketFiles'"

# Test 15: Check if R script exists
run_test "R script exists" "test -f '$APP_DIR/scripts/Rscripts/AboveMarket/Default Alternate Results Stitch.R'"

# Test 16: Check if Python script exists
run_test "Python script exists" "test -f '$APP_DIR/scripts/pythonScripts/AboveMarket/bubble_chart_v6.py'"

# Test 17: Check if rScriptService exists
run_test "rScriptService exists" "test -f '$APP_DIR/services/rScriptService.js'"

# Test 18: Check if pythonScriptService exists
run_test "pythonScriptService exists" "test -f '$APP_DIR/services/pythonScriptService.js'"

# Test 19: Test scheduler script syntax
run_test "Scheduler script syntax is valid" "node --check '$APP_DIR/schedulers/aboveMarketScheduler.js'"

# Test 20: Check if cron is running
run_test "Cron service is running" "systemctl is-active --quiet cron || service cron status"

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo "Total tests: $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Scheduler is ready to use.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test manual execution:"
    echo "     node schedulers/aboveMarketScheduler.js --config=configs/above-market-schedule-fpa.json"
    echo ""
    echo "  2. Set up cron job:"
    echo "     bash scripts/setup-cron.sh"
    echo ""
    echo "  3. Monitor logs:"
    echo "     tail -f logs/scheduler.log"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix the issues above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Ensure all dependencies are installed (Node.js, R, Python)"
    echo "  - Check file permissions"
    echo "  - Verify directory structure"
    exit 1
fi
