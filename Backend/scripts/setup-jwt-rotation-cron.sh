#!/bin/bash

##############################################################################
# JWT Secret Rotation Cron Setup Script
#
# This script sets up a cron job to rotate JWT_SECRET every 24 hours at 2 AM.
# It adds the job to the user's crontab if it doesn't already exist.
#
# Usage:
#   chmod +x scripts/setup-jwt-rotation-cron.sh
#   ./scripts/setup-jwt-rotation-cron.sh
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the absolute path to the Backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROTATION_SCRIPT="$BACKEND_DIR/scripts/rotate-jwt-secret.js"

echo -e "${GREEN}JWT Secret Rotation Cron Setup${NC}"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

# Check if rotation script exists
if [ ! -f "$ROTATION_SCRIPT" ]; then
    echo -e "${RED}Error: Rotation script not found at $ROTATION_SCRIPT${NC}"
    exit 1
fi

# Make rotation script executable
chmod +x "$ROTATION_SCRIPT"
echo -e "${GREEN}✓${NC} Rotation script is executable"

# Create logs directory if it doesn't exist
LOGS_DIR="$BACKEND_DIR/logs"
mkdir -p "$LOGS_DIR"
echo -e "${GREEN}✓${NC} Logs directory created: $LOGS_DIR"

# Define the cron job
# Runs every day at 2:00 AM
CRON_SCHEDULE="0 2 * * *"
CRON_COMMAND="cd $BACKEND_DIR && node $ROTATION_SCRIPT >> $LOGS_DIR/jwt-rotation.log 2>&1"
CRON_JOB="$CRON_SCHEDULE $CRON_COMMAND"
CRON_COMMENT="# JWT Secret Rotation - runs daily at 2 AM"

echo ""
echo "Proposed cron job:"
echo -e "${YELLOW}$CRON_COMMENT${NC}"
echo -e "${YELLOW}$CRON_JOB${NC}"
echo ""

# Check if cron job already exists
EXISTING_CRON=$(crontab -l 2>/dev/null || true)
if echo "$EXISTING_CRON" | grep -q "rotate-jwt-secret.js"; then
    echo -e "${YELLOW}⚠ JWT rotation cron job already exists${NC}"
    echo ""
    read -p "Do you want to replace it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 0
    fi
    
    # Remove existing JWT rotation cron jobs
    NEW_CRON=$(echo "$EXISTING_CRON" | grep -v "rotate-jwt-secret.js" || true)
    echo "$NEW_CRON" | crontab -
    echo -e "${GREEN}✓${NC} Removed existing cron job"
fi

# Add new cron job
(crontab -l 2>/dev/null || true; echo ""; echo "$CRON_COMMENT"; echo "$CRON_JOB") | crontab -
echo -e "${GREEN}✓${NC} Cron job added successfully"

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "The JWT secret will be rotated daily at 2:00 AM."
echo "Logs will be written to: $LOGS_DIR/jwt-rotation.log"
echo ""
echo "To verify the cron job:"
echo "  crontab -l | grep jwt"
echo ""
echo "To test the rotation manually:"
echo "  node $ROTATION_SCRIPT"
echo ""
echo "To remove the cron job:"
echo "  crontab -e  # Then delete the JWT rotation line"
echo ""

# Test rotation immediately (optional)
read -p "Do you want to test the rotation now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Testing JWT secret rotation..."
    node "$ROTATION_SCRIPT"
    echo ""
    echo -e "${GREEN}✓${NC} Test completed. Check the logs above for results."
fi
