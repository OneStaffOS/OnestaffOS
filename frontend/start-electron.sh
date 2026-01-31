#!/bin/bash
#
# Frontend Service Startup Script for Electron
# Starts the Next.js frontend in production mode
#

set -e  # Exit on error

echo "🔧 Preparing Next.js Frontend..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Check if .next directory exists
if [ ! -d ".next" ]; then
  echo "❌ Build directory .next not found!"
  exit 1
fi

# Find Node.js and npm in common locations
NODE_BIN=""
NPM_BIN=""

# Check common installation paths (prioritize user's actual installation)
POSSIBLE_NODE_PATHS=(
  "/Users/$USER/.nvm/versions/node/v22.20.0/bin/node"
  "/Users/$USER/.nvm/versions/node/v22.*/bin/node"
  "/Users/$USER/.nvm/versions/node/v20.*/bin/node"
  "/Users/$USER/.nvm/versions/node/v*/bin/node"
  "/opt/homebrew/bin/node"
  "/usr/local/bin/node"
  "/usr/bin/node"
)

for path in "${POSSIBLE_NODE_PATHS[@]}"; do
  for expanded in $path; do
    if [ -f "$expanded" ] && [ -x "$expanded" ]; then
      NODE_BIN="$expanded"
      # npm is usually in the same directory
      NPM_BIN="$(dirname "$expanded")/npm"
      break 2
    fi
  done
done

if [ -z "$NODE_BIN" ] || [ ! -f "$NPM_BIN" ]; then
  echo "❌ Error: Could not find Node.js/npm installation"
  exit 1
fi

echo "✅ Found Node.js at: $NODE_BIN"
echo "✅ Found npm at: $NPM_BIN"

# Add node directory to PATH so npm can find node internally
NODE_DIR="$(dirname "$NODE_BIN")"
export PATH="$NODE_DIR:$PATH"

echo "🚀 Starting Next.js Frontend on port 3001..."

# Set port and start
PORT=3001 exec "$NPM_BIN" start
