#!/bin/bash

# Load environment variables
source .env.local

# Execute pg_dump inside the container
docker exec devops-frontend-1 sh -c "PGPASSWORD='${PGPASSWORD}' pg_dump -h db -U postgres -d postgres -s -n public > /app/types/schema.sql"


echo "✅ Types generated successfully"