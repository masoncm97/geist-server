#!/bin/bash

# Quick diagnostic script for geist-server conversation issues
# Focuses on the most likely causes of low conversation count

set -e

echo "🔍 Quick Diagnostic for Geist Server Conversations"
echo "================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check if server is running
echo -e "${GREEN}1. Checking server status...${NC}"
if pgrep -f "geist-server\|tsx.*src/index.ts" > /dev/null; then
    echo "✅ Server is running"
    SERVER_PID=$(pgrep -f "geist-server\|tsx.*src/index.ts" | head -1)
    echo "   PID: $SERVER_PID"
    echo "   Uptime: $(ps -p $SERVER_PID -o etime= 2>/dev/null || echo 'unknown')"
else
    echo -e "${RED}❌ Server is NOT running${NC}"
    echo "   This explains why you have few conversations - the cron job stops when server restarts!"
fi

echo ""

# 2. Check conversation count
echo -e "${GREEN}2. Checking conversation count...${NC}"
cd "$(dirname "$0")"

if [[ -f "export-conversations.cjs" ]]; then
    echo "Running conversation export..."
    node export-conversations.cjs > /tmp/conversation_export.txt 2>&1
    
    if [[ $? -eq 0 ]]; then
        # Try to get conversation count from the export
        if [[ -f "conversations-export-$(date +%Y-%m-%d).json" ]]; then
            COUNT=$(jq '.totalEntries' "conversations-export-$(date +%Y-%m-%d).json" 2>/dev/null || echo "unknown")
            echo "✅ Total conversations: $COUNT"
            
            # Get date range if possible
            FIRST_ID=$(jq '.conversations[0].id' "conversations-export-$(date +%Y-%m-%d).json" 2>/dev/null || echo "unknown")
            LAST_ID=$(jq '.conversations[-1].id' "conversations-export-$(date +%Y-%m-%d).json" 2>/dev/null || echo "unknown")
            echo "   ID range: $FIRST_ID to $LAST_ID"
        else
            echo "❌ Could not determine conversation count"
        fi
    else
        echo -e "${RED}❌ Failed to export conversations${NC}"
        cat /tmp/conversation_export.txt
    fi
else
    echo "❌ Export script not found"
fi

echo ""

# 3. Check system logs for restarts
echo -e "${GREEN}3. Checking for server restarts in system logs...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check for Node.js process starts in the last year
    RESTART_COUNT=$(log show --predicate 'process == "node" OR process CONTAINS "tsx"' --last 1y 2>/dev/null | grep -c "Started" || echo "0")
    echo "System log restarts detected: $RESTART_COUNT"
    
    # Check for any geist-server related errors
    ERROR_COUNT=$(log show --predicate 'process CONTAINS "tsx" OR process CONTAINS "node"' --last 1y 2>/dev/null | grep -i "error\|fail\|crash" | wc -l || echo "0")
    echo "Error entries found: $ERROR_COUNT"
else
    echo "System log checking not available on this OS"
fi

echo ""

# 4. Calculate expected vs actual conversations
echo -e "${GREEN}4. Analyzing conversation generation...${NC}"

# Calculate expected conversations (13 per day * days since start)
# Assuming the cron job started around when you first set it up
DAYS_SINCE_START=180  # Rough estimate - adjust as needed
EXPECTED_PER_DAY=13   # 8 AM to 8 PM = 13 hours
EXPECTED_TOTAL=$((DAYS_SINCE_START * EXPECTED_PER_DAY))

echo "Expected conversations (6 months): $EXPECTED_TOTAL"
echo "Actual conversations: $COUNT"
echo ""

if [[ "$COUNT" != "unknown" && "$EXPECTED_TOTAL" -gt 0 ]]; then
    PERCENTAGE=$((COUNT * 100 / EXPECTED_TOTAL))
    echo "Generation rate: ${PERCENTAGE}% of expected"
    
    if [[ $PERCENTAGE -lt 50 ]]; then
        echo -e "${RED}⚠️  Very low generation rate - likely server restarts or API issues${NC}"
    elif [[ $PERCENTAGE -lt 80 ]]; then
        echo -e "${YELLOW}⚠️  Lower than expected generation rate${NC}"
    else
        echo -e "${GREEN}✅ Generation rate looks reasonable${NC}"
    fi
fi

echo ""

# 5. Check for common issues
echo -e "${GREEN}5. Checking for common issues...${NC}"

# Check if POSTGRES_URL is set
if [[ -n "$POSTGRES_URL" ]]; then
    echo "✅ Database URL is configured"
else
    echo -e "${RED}❌ POSTGRES_URL not set - database connection will fail${NC}"
fi

# Check if OpenAI API key is set
if [[ -n "$OPENAI_API_KEY" ]]; then
    echo "✅ OpenAI API key is configured"
else
    echo -e "${RED}❌ OPENAI_API_KEY not set - API calls will fail${NC}"
fi

# Check for Docker containers
if command -v docker > /dev/null && docker ps | grep -q "geist-server"; then
    echo "✅ Docker container is running"
else
    echo "ℹ️  No Docker container found (running locally)"
fi

echo ""

# 6. Summary and recommendations
echo -e "${GREEN}6. Summary and Recommendations${NC}"
echo "======================================"

if pgrep -f "geist-server\|tsx.*src/index.ts" > /dev/null; then
    echo "✅ Server is currently running"
    echo ""
    echo "Most likely causes of low conversation count:"
    echo "1. Server restarts (cron job stops and needs manual restart)"
    echo "2. API rate limits or failures"
    echo "3. Database connection issues"
    echo "4. Task overlap protection (if conversations take >1 hour)"
    echo ""
    echo "Immediate actions:"
    echo "1. Check server logs for errors: tail -f /path/to/logs"
    echo "2. Verify API rate limits: check OpenAI dashboard"
    echo "3. Test database connection: psql \$POSTGRES_URL"
    echo "4. Consider implementing persistent cron job"
else
    echo -e "${RED}❌ Server is NOT running${NC}"
    echo ""
    echo "This is the most likely cause of your low conversation count!"
    echo "The cron job stops when the server restarts and needs manual restart."
    echo ""
    echo "To fix:"
    echo "1. Start the server: cd geist-server && npm start"
    echo "2. Restart conversation process: POST /start-conversation"
    echo "3. Consider using PM2 or Docker for persistent deployment"
fi

echo ""
echo "📊 Quick diagnostic complete!" 