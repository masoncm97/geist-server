#!/bin/bash

if [ $# != 1 ]; then
  echo
  echo "Usage: $0 openaiAPIKey"
  echo
  echo "  openaiAPIKey             The OpenAPI Key of the account"            
  echo
  exit 1
fi

OPENAI_API_KEY="$1"


declare -a assistants

while IFS='\n' read -r assistant; do
    assistants+=("$assistant")
done < output.txt

# echo echo "${#assistants[@]}"

# bash: $assistants only represents assistants[0]
# to represent the entire array, use: "${assistants[@]}"

for assistant in ${assistants[@]}; do
    curl "https://api.openai.com/v1/assistants/$assistant" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "OpenAI-Beta: assistants=v1" \
    -X DELETE
    
    echo "Deleted Assistant $assistant"
done