#!/bin/bash

# Diagnostic script for geist-server conversation generation
# This script helps diagnose why you might only have 227 conversations despite months of cron job running

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
OUTPUT_DIR="$PROJECT_DIR/diagnostic-output"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🔍 Geist Server Conversation Diagnostic Tool${NC}"
echo -e "${BLUE}============================================${NC}"
echo "Timestamp: $(date)"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to log errors
log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Function to log warnings
log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# 1. Check if server is running
log "Checking if geist-server is running..."
if pgrep -f "geist-server\|tsx.*src/index.ts" > /dev/null; then
    log "✅ Server process found"
    SERVER_PID=$(pgrep -f "geist-server\|tsx.*src/index.ts" | head -1)
    echo "Server PID: $SERVER_PID"
else
    log_warning "❌ No server process found"
fi

# 2. Check Docker containers if running
log "Checking Docker containers..."
if command -v docker > /dev/null && docker ps | grep -q "geist-server"; then
    log "✅ Docker container found"
    docker ps | grep "geist-server"
else
    log "ℹ️  No Docker containers found for geist-server"
fi

# 3. Check system logs for the past year
log "Checking system logs for geist-server related entries..."

# macOS system logs (last year)
if [[ "$OSTYPE" == "darwin"* ]]; then
    log "Checking macOS system logs..."
    
    # Check for any geist-server related logs in system.log
    if log show --predicate 'process == "geist-server" OR process CONTAINS "tsx" OR process CONTAINS "node"' --last 1y > "$OUTPUT_DIR/system_logs_geist_$TIMESTAMP.txt" 2>/dev/null; then
        log "✅ System logs extracted to $OUTPUT_DIR/system_logs_geist_$TIMESTAMP.txt"
    else
        log_warning "No geist-server logs found in system logs"
    fi
    
    # Check for any Node.js related crashes or errors
    if log show --predicate 'process == "node" OR process CONTAINS "tsx"' --last 1y > "$OUTPUT_DIR/system_logs_node_$TIMESTAMP.txt" 2>/dev/null; then
        log "✅ Node.js system logs extracted"
    fi
fi

# 4. Check application logs
log "Checking application logs..."

# Look for log files in common locations
LOG_LOCATIONS=(
    "$PROJECT_DIR/logs"
    "$PROJECT_DIR/*.log"
    "/var/log/geist-server"
    "/var/log/app"
    "$HOME/.pm2/logs"
)

for location in "${LOG_LOCATIONS[@]}"; do
    if ls $location 2>/dev/null | grep -q .; then
        log "✅ Found logs in: $location"
        ls -la $location 2>/dev/null | head -10
    fi
done

# 5. Check database state
log "Checking database state..."

# Check if we can connect to the database
if command -v psql > /dev/null; then
    # Try to connect to the database
    if [[ -n "$POSTGRES_URL" ]]; then
        log "Testing database connection..."
        if psql "$POSTGRES_URL" -c "SELECT COUNT(*) FROM conversation;" > "$OUTPUT_DIR/db_check_$TIMESTAMP.txt" 2>&1; then
            log "✅ Database connection successful"
            cat "$OUTPUT_DIR/db_check_$TIMESTAMP.txt"
        else
            log_error "❌ Database connection failed"
            cat "$OUTPUT_DIR/db_check_$TIMESTAMP.txt"
        fi
    else
        log_warning "POSTGRES_URL not set, skipping database check"
    fi
else
    log_warning "psql not found, skipping database check"
fi

# 6. Check conversation data
log "Analyzing conversation data..."

# Use the existing export script to get conversation data
if [[ -f "$SCRIPT_DIR/export-conversations.cjs" ]]; then
    log "Exporting conversation data for analysis..."
    cd "$SCRIPT_DIR"
    node export-conversations.cjs > "$OUTPUT_DIR/conversation_export_$TIMESTAMP.txt" 2>&1
    
    if [[ $? -eq 0 ]]; then
        log "✅ Conversation export successful"
        
        # Analyze the export file
        if [[ -f "conversations-export-$(date +%Y-%m-%d).json" ]]; then
            log "Analyzing conversation patterns..."
            
            # Extract conversation count and date range
            CONVERSATION_COUNT=$(jq '.totalEntries' "conversations-export-$(date +%Y-%m-%d).json" 2>/dev/null || echo "unknown")
            echo "Total conversations: $CONVERSATION_COUNT"
            
            # Copy the export file to our output directory
            cp "conversations-export-$(date +%Y-%m-%d).json" "$OUTPUT_DIR/"
        fi
    else
        log_error "❌ Conversation export failed"
        cat "$OUTPUT_DIR/conversation_export_$TIMESTAMP.txt"
    fi
fi

# 7. Check cron job status
log "Checking cron job status..."

# Check if there are any cron jobs for this application
if command -v crontab > /dev/null; then
    log "Current user cron jobs:"
    crontab -l 2>/dev/null | grep -i "geist\|conversation" || echo "No geist-related cron jobs found"
fi

# 8. Check process memory and CPU usage
log "Checking process resource usage..."
if [[ -n "$SERVER_PID" ]]; then
    ps -p "$SERVER_PID" -o pid,ppid,cmd,%mem,%cpu,etime
fi

# 9. Check for any error patterns in recent logs
log "Checking for error patterns..."

# Look for common error patterns
ERROR_PATTERNS=(
    "Cannot start a new task before the previous one is finished"
    "No active conversations"
    "Invalid openAi configuration"
    "Internal Server Error"
    "fuck"
    "taskIsActive"
    "conversationTask"
)

echo "Searching for error patterns in recent files..."
for pattern in "${ERROR_PATTERNS[@]}"; do
    echo "Pattern: $pattern"
    find "$PROJECT_DIR" -name "*.log" -o -name "*.txt" -o -name "*.json" | head -5 | xargs grep -l "$pattern" 2>/dev/null || echo "No matches found"
done

# 10. Generate summary report
log "Generating diagnostic summary..."

cat > "$OUTPUT_DIR/diagnostic_summary_$TIMESTAMP.txt" << EOF
Geist Server Conversation Diagnostic Summary
===========================================

Timestamp: $(date)
Project Directory: $PROJECT_DIR

1. SERVER STATUS:
$(if [[ -n "$SERVER_PID" ]]; then echo "✅ Server running (PID: $SERVER_PID)"; else echo "❌ Server not running"; fi)

2. DOCKER STATUS:
$(if docker ps | grep -q "geist-server"; then echo "✅ Docker container running"; docker ps | grep "geist-server"; else echo "ℹ️  No Docker containers found"; fi)

3. CONVERSATION COUNT:
$(if [[ -n "$CONVERSATION_COUNT" ]]; then echo "Total conversations: $CONVERSATION_COUNT"; else echo "Could not determine conversation count"; fi)

4. LOG FILES FOUND:
$(find "$OUTPUT_DIR" -name "*log*" -o -name "*export*" | wc -l) log/export files generated

5. POTENTIAL ISSUES IDENTIFIED:
- Server restarts would require manual restart of conversation process
- Task overlap protection might skip conversations if previous task is still running
- API failures could prevent conversation generation
- Database connection issues could prevent saving conversations

6. RECOMMENDATIONS:
- Check server restart frequency
- Monitor API rate limits and failures
- Verify database connectivity
- Consider implementing persistent cron job across restarts
- Add more detailed logging for conversation generation process

Generated files:
$(ls -la "$OUTPUT_DIR" | grep "$TIMESTAMP")
EOF

log "✅ Diagnostic complete! Summary saved to: $OUTPUT_DIR/diagnostic_summary_$TIMESTAMP.txt"

echo ""
echo -e "${GREEN}📊 Diagnostic Summary:${NC}"
cat "$OUTPUT_DIR/diagnostic_summary_$TIMESTAMP.txt"

echo ""
echo -e "${BLUE}📁 All diagnostic files saved to: $OUTPUT_DIR${NC}"
ls -la "$OUTPUT_DIR"

echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. Review the generated log files for error patterns"
echo "2. Check if the server has been restarting frequently"
echo "3. Verify OpenAI API rate limits and failures"
echo "4. Consider implementing persistent conversation generation"
echo "5. Add more detailed logging to track conversation generation process" 