#!/bin/bash
#
# Backend Service Startup Script for Electron
# Starts the NestJS backend in production mode
#

set -e  # Exit on error

echo "🔧 Preparing NestJS Backend..."

# Get script directory (this is already the Backend directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Find Node.js in common locations
NODE_BIN=""

# Check common installation paths (prioritize user's actual installation)
POSSIBLE_PATHS=(
  "/Users/$USER/.nvm/versions/node/v22.20.0/bin/node"
  "/Users/$USER/.nvm/versions/node/v22.*/bin/node"
  "/Users/$USER/.nvm/versions/node/v20.*/bin/node"
  "/Users/$USER/.nvm/versions/node/v*/bin/node"
  "/opt/homebrew/bin/node"
  "/usr/local/bin/node"
  "/usr/bin/node"
)

for path in "${POSSIBLE_PATHS[@]}"; do
  # Expand wildcards
  for expanded in $path; do
    if [ -f "$expanded" ] && [ -x "$expanded" ]; then
      NODE_BIN="$expanded"
      break 2
    fi
  done
done

if [ -z "$NODE_BIN" ]; then
  echo "❌ Error: Could not find Node.js installation"
  echo "Searched paths:"
  printf '%s\n' "${POSSIBLE_PATHS[@]}"
  exit 1
fi

echo "✅ Found Node.js at: $NODE_BIN"

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "❌ Error: dist directory not found!"
  exit 1
fi

echo "🚀 Starting NestJS Backend on port 3000..."

# Start the backend in production mode
exec "$NODE_BIN" dist/main
