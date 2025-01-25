#!/bin/bash

# First, ensure we're using Central Time
export TZ="America/Chicago"
export CURRENT_DATETIME=$(date +'%A, %B %d, %Y %H:%M:%S %Z')
export TIMEZONE=$(date +'%Z')
export LOCAL_ENVIRONMENT="development"
export AI_MODEL="gpt-4o"
export AI_ASSISTANT_MAX_TOKENS="128000"
export EMBEDDING_MODEL="text-embedding-3-large"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define the template and output file paths
TEMPLATE_FILE="$SCRIPT_DIR/.rules.TEMPLATE"
OUTPUT_FILE="$SCRIPT_DIR/.cursorrules"

# Define all your variables here as an array of tuples
# Each tuple is in the format "VARIABLE_NAME:value"
# This makes it easy to add, remove, or modify variables
declare -a VARIABLES=(
    "CURRENT_DATETIME:$CURRENT_DATETIME"
    "TIMEZONE:$TIMEZONE"
    "LOCAL_ENVIRONMENT:$LOCAL_ENVIRONMENT"
    "AI_MODEL:$AI_MODEL"
    "AI_ASSISTANT_MAX_TOKENS:$AI_ASSISTANT_MAX_TOKENS"
    "EMBEDDING_MODEL:$EMBEDDING_MODEL"
)

# Function to escape special characters in sed replacement
escape_sed_chars() {
    echo "$1" | sed 's/[\/&]/\\&/g'
}

# Check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file '$TEMPLATE_FILE' not found"
    exit 1
fi

# Create a temporary file for processing
TEMP_FILE=$(mktemp)
cp "$TEMPLATE_FILE" "$TEMP_FILE"

# Process each variable
for var in "${VARIABLES[@]}"; do
    # Split the variable definition into name and value
    IFS=':' read -r var_name var_value <<< "$var"
    
    # Skip empty variables
    if [ -z "$var_name" ]; then
        continue
    fi
    
    # Use default empty string if value is not set
    var_value=${var_value:-""}
    
    # Escape special characters in the value for sed
    escaped_value=$(escape_sed_chars "$var_value")
    
    # Use macOS compatible sed syntax
    sed -i '' "s/{${var_name}}/$(printf '%s' "$escaped_value")/g" "$TEMP_FILE"
done

# Check for any remaining unreplaced variables
UNREPLACED=$(grep -o '{[A-Z_]*}' "$TEMP_FILE" || true)
if [ ! -z "$UNREPLACED" ]; then
    echo "Warning: The following variables were not replaced:"
    echo "$UNREPLACED"
fi

# Move the processed file to the destination
mv "$TEMP_FILE" "$OUTPUT_FILE"
chmod 644 "$OUTPUT_FILE"

echo "Template processed successfully. Output written to: $OUTPUT_FILE"
echo "Using timezone: $TIMEZONE"
echo "Current time: $CURRENT_DATETIME"
echo "AI Model: $AI_MODEL"
echo "AI Assistant Max Tokens: $AI_ASSISTANT_MAX_TOKENS"
echo "AI Embedding Model: $EMBEDDING_MODEL"
