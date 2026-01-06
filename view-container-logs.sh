#!/bin/bash
# Script to view container logs for CDE AI App

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Container Log Viewer ===${NC}\n"

# Function to find the container
find_container() {
    # Try to find container by common names
    local container_id=$(docker ps --filter "name=cde-ai" --format "{{.ID}}" 2>/dev/null | head -1)

    if [ -z "$container_id" ]; then
        container_id=$(docker ps --filter "ancestor=cde-ai-app" --format "{{.ID}}" 2>/dev/null | head -1)
    fi

    if [ -z "$container_id" ]; then
        # Try podman if docker fails
        container_id=$(podman ps --filter "name=cde-ai" --format "{{.ID}}" 2>/dev/null | head -1)
    fi

    if [ -z "$container_id" ]; then
        container_id=$(podman ps --filter "ancestor=cde-ai-app" --format "{{.ID}}" 2>/dev/null | head -1)
    fi

    echo "$container_id"
}

# Function to determine if using docker or podman
get_container_cmd() {
    if command -v docker &> /dev/null; then
        echo "docker"
    elif command -v podman &> /dev/null; then
        echo "podman"
    else
        echo ""
    fi
}

# Main menu
echo "Select an option:"
echo "1) View live container logs (follow mode)"
echo "2) View last 100 lines of container logs"
echo "3) View last 500 lines of container logs"
echo "4) View all container logs"
echo "5) Search container logs for a pattern"
echo "6) View container logs with timestamps"
echo "7) List all running containers"
echo "8) Specify container ID manually"
echo ""
read -p "Enter your choice [1-8]: " choice

CMD=$(get_container_cmd)

if [ -z "$CMD" ]; then
    echo -e "${RED}Error: Neither docker nor podman found${NC}"
    exit 1
fi

echo -e "${GREEN}Using: $CMD${NC}\n"

case $choice in
    1)
        CONTAINER_ID=$(find_container)
        if [ -z "$CONTAINER_ID" ]; then
            echo -e "${YELLOW}No container found automatically. Listing all containers:${NC}"
            $CMD ps
            echo ""
            read -p "Enter container ID or name: " CONTAINER_ID
        fi
        echo -e "${GREEN}Following logs for container: $CONTAINER_ID${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
        $CMD logs -f "$CONTAINER_ID"
        ;;
    2)
        CONTAINER_ID=$(find_container)
        if [ -z "$CONTAINER_ID" ]; then
            echo -e "${YELLOW}No container found automatically. Listing all containers:${NC}"
            $CMD ps
            echo ""
            read -p "Enter container ID or name: " CONTAINER_ID
        fi
        echo -e "${GREEN}Showing last 100 lines for container: $CONTAINER_ID${NC}\n"
        $CMD logs --tail 100 "$CONTAINER_ID"
        ;;
    3)
        CONTAINER_ID=$(find_container)
        if [ -z "$CONTAINER_ID" ]; then
            echo -e "${YELLOW}No container found automatically. Listing all containers:${NC}"
            $CMD ps
            echo ""
            read -p "Enter container ID or name: " CONTAINER_ID
        fi
        echo -e "${GREEN}Showing last 500 lines for container: $CONTAINER_ID${NC}\n"
        $CMD logs --tail 500 "$CONTAINER_ID"
        ;;
    4)
        CONTAINER_ID=$(find_container)
        if [ -z "$CONTAINER_ID" ]; then
            echo -e "${YELLOW}No container found automatically. Listing all containers:${NC}"
            $CMD ps
            echo ""
            read -p "Enter container ID or name: " CONTAINER_ID
        fi
        echo -e "${GREEN}Showing all logs for container: $CONTAINER_ID${NC}\n"
        $CMD logs "$CONTAINER_ID"
        ;;
    5)
        CONTAINER_ID=$(find_container)
        if [ -z "$CONTAINER_ID" ]; then
            echo -e "${YELLOW}No container found automatically. Listing all containers:${NC}"
            $CMD ps
            echo ""
            read -p "Enter container ID or name: " CONTAINER_ID
        fi
        read -p "Enter search pattern: " PATTERN
        echo -e "${GREEN}Searching logs for: $PATTERN${NC}\n"
        $CMD logs "$CONTAINER_ID" 2>&1 | grep -i "$PATTERN" --color=always
        ;;
    6)
        CONTAINER_ID=$(find_container)
        if [ -z "$CONTAINER_ID" ]; then
            echo -e "${YELLOW}No container found automatically. Listing all containers:${NC}"
            $CMD ps
            echo ""
            read -p "Enter container ID or name: " CONTAINER_ID
        fi
        echo -e "${GREEN}Showing logs with timestamps for container: $CONTAINER_ID${NC}\n"
        $CMD logs -t --tail 100 "$CONTAINER_ID"
        ;;
    7)
        echo -e "${GREEN}Running containers:${NC}\n"
        $CMD ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
        ;;
    8)
        read -p "Enter container ID or name: " CONTAINER_ID
        echo -e "${GREEN}Following logs for container: $CONTAINER_ID${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
        $CMD logs -f "$CONTAINER_ID"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
