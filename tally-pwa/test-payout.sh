#!/bin/bash

# Stripe Payout Test Script
# Usage: ./test-payout.sh

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "  Stripe Instant Payout Test Script"
echo "================================================"
echo ""

# Configuration
API_URL="http://localhost:3000"
TOKEN_FILE=".test-token"

# Check if token file exists
if [ ! -f "$TOKEN_FILE" ]; then
    echo -e "${YELLOW}Warning: Token file not found at $TOKEN_FILE${NC}"
    echo "Please create a file named .test-token with your JWT token, or set TOKEN variable manually."
    echo ""
    echo "To get your token:"
    echo "1. Login to your app"
    echo "2. Open browser console"
    echo "3. Run: localStorage.getItem('token')"
    echo "4. Save the token to .test-token file"
    echo ""
    read -p "Enter your token manually: " TOKEN
else
    TOKEN=$(cat "$TOKEN_FILE")
    echo -e "${GREEN}✓ Token loaded from $TOKEN_FILE${NC}"
fi

# Get parameters
echo ""
echo "Enter test parameters:"
read -p "Club ID: " CLUB_ID
read -p "Recipient User ID: " USER_ID
read -p "Amount (e.g., 10.50): " AMOUNT

# Confirm
echo ""
echo "================================================"
echo "Payout Details:"
echo "  Club ID: $CLUB_ID"
echo "  User ID: $USER_ID"
echo "  Amount: \$$AMOUNT"
echo "================================================"
echo ""
read -p "Proceed with payout? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

# Make request
echo ""
echo "Sending payout request..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/stripe/payout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"clubId\": \"$CLUB_ID\",
    \"userId\": \"$USER_ID\",
    \"amount\": $AMOUNT,
    \"description\": \"Test payout via script\"
  }")

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ SUCCESS${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo ""
    echo "Error Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "================================================"
echo "  Test Complete"
echo "================================================"
