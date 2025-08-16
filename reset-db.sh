#!/bin/bash

# Database Reset Script for D'insight Dashboard
# This script resets the database and restarts all ID sequences from 1

echo "🔄 D'insight Database Reset Script"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will delete ALL data in the database!"
echo "This includes:"
echo "  - All uploaded files and processing results"
echo "  - All dinsight data and coordinates" 
echo "  - All monitoring data and anomaly classifications"
echo "  - All user data and active sessions (except default admin)"
echo "  - All organization and machine data"
echo ""

read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "🏗️  Building reset utility..."
cd Dinsight_API

# Build the reset utility
go build -o ../reset-db ./cmd/reset-db/main.go

if [ $? -ne 0 ]; then
    echo "❌ Failed to build reset utility"
    exit 1
fi

cd ..

echo "🗑️  Resetting database..."

# Run the reset utility
./reset-db

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database reset completed successfully!"
    echo "📊 All ID sequences now start from 1"
    echo "🔑 You can login with: admin@disum.com / DInsight123!"
    echo "🏢 Organization: D'ISUM Inc. with 2 machines"
    
    # Clean up the binary
    rm -f reset-db
else
    echo "❌ Database reset failed"
    rm -f reset-db
    exit 1
fi