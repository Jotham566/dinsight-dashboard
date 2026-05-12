#!/bin/bash
# Database Reset Script for the Dinsight Dashboard.
#
# Wipes every row + restarts every ID sequence from 1, then re-runs the
# admin seed migrations so you can sign back in as admin@disum.com.
#
# Designed to be run from anywhere — it locates the repo root via this
# script's own path, so `bash scripts/reset-db.sh`, `./scripts/reset-db.sh`,
# and an absolute path all behave identically.

set -euo pipefail

# Resolve the repo root from this script's own location so cwd doesn't
# matter. Symlinks resolved via cd + pwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

read -r -p "Are you sure you want to continue? (yes/no): "
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

cd "$REPO_ROOT/Dinsight_API"

echo "🏗️  Building reset utility..."
go build -o ./dist/reset-db ./cmd/reset-db/main.go

echo "🗑️  Resetting database..."
./dist/reset-db
status=$?
rm -f ./dist/reset-db

if [ $status -eq 0 ]; then
    echo ""
    echo "✅ Database reset completed successfully!"
    echo "📊 All ID sequences now start from 1"
    echo "🔑 You can login with: admin@disum.com / DInsight123!"
    echo "🏢 Organization: D'ISUM Inc. with 2 machines"
else
    echo "❌ Database reset failed"
    exit $status
fi
