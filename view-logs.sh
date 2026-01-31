#!/bin/bash

# OneStaff OS Log Viewer
# This script helps you view the application logs

LOG_DIR="$HOME/Library/Logs/OneStaff OS"
LOG_FILE="$LOG_DIR/onestaff-os.log"

echo "=================================="
echo "OneStaff OS Log Viewer"
echo "=================================="
echo ""

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Log file not found at: $LOG_FILE"
    echo ""
    echo "The log file will be created when you run the packaged application."
    echo "Expected location: $LOG_FILE"
    exit 1
fi

echo "📁 Log file location: $LOG_FILE"
echo "📊 Log file size: $(du -h "$LOG_FILE" | cut -f1)"
echo ""
echo "Choose an option:"
echo "  1) View entire log"
echo "  2) View last 50 lines"
echo "  3) View last 100 lines"
echo "  4) Follow log in real-time (tail -f)"
echo "  5) Open in text editor"
echo "  6) Open log folder"
echo "  0) Exit"
echo ""
read -p "Enter your choice: " choice

case $choice in
    1)
        less "$LOG_FILE"
        ;;
    2)
        tail -n 50 "$LOG_FILE"
        echo ""
        echo "Press any key to continue..."
        read -n 1
        ;;
    3)
        tail -n 100 "$LOG_FILE"
        echo ""
        echo "Press any key to continue..."
        read -n 1
        ;;
    4)
        echo "Following log file (Ctrl+C to stop)..."
        tail -f "$LOG_FILE"
        ;;
    5)
        open -a TextEdit "$LOG_FILE"
        ;;
    6)
        open "$LOG_DIR"
        ;;
    0)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
