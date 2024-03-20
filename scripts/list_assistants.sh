#!/bin/bash

if [ $# != 1 ]; then
  echo
  echo "Usage: $0 openaiAPIKey"
  echo
  echo "  openaiAPIKey             The OpenAPI Key of the account"            
  echo
  exit 1
fi

if ! command -v jq &> /dev/null
then
    echo "jq could not be found. Please install jq to run this script."
    exit
fi

OPENAI_API_KEY="$1"

list_assistants=$(curl "https://api.openai.com/v1/assistants?order=desc&limit=100" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "OpenAI-Beta: assistants=v1" \
  -s -o response.json \
  -w "%{http_code}")

  jq -r '.data[].id' "response.json" > "output.txt"