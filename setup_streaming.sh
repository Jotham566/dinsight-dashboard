#!/bin/bash

# D'insight Real-Time Streaming Setup Script
# This script sets up the complete streaming environment

set -e

echo "🚀 Setting up D'insight Real-Time Streaming Feature..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "TASKS.md" ] || [ ! -d "Dinsight_API" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the root of the dinsight-dashboard project"
    exit 1
fi

print_status "Setting up Python environment for streaming simulator..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source .venv/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

print_success "Python environment setup complete!"

# Setup Go dependencies
print_status "Setting up Go backend dependencies..."
cd Dinsight_API

# Check if Go is available
if ! command -v go &> /dev/null; then
    print_error "Go is not installed. Please install Go 1.19 or higher."
    exit 1
fi

# Install Go dependencies (if go.mod was updated)
print_status "Downloading Go dependencies..."
go mod download
go mod tidy

print_success "Go backend dependencies setup complete!"

# Build the API server
print_status "Building API server..."
go build -o dist/api-server ./cmd/api

if [ $? -eq 0 ]; then
    print_success "API server built successfully!"
else
    print_error "Failed to build API server"
    exit 1
fi

cd ..

# Setup Frontend dependencies
print_status "Setting up frontend dependencies..."
cd frontend

# Check if Node.js is available
if ! command -v npm &> /dev/null; then
    print_error "Node.js/npm is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Frontend dependencies installed successfully!"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

cd ..

print_success "🎉 D'insight Real-Time Streaming setup complete!"

echo ""
echo "📋 Next Steps:"
echo "==============="
echo ""
echo "1. Start the API server:"
echo "   cd Dinsight_API && ./dist/api-server"
echo ""
echo "2. Start the frontend (in a new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Run the streaming simulator (in a new terminal):"
echo "   source .venv/bin/activate"
echo "   python3 streaming_simulator.py --baseline-id 1"
echo ""
echo "4. Navigate to: http://localhost:3000/dashboard/streaming"
echo ""
echo "📖 Usage Examples:"
echo "=================="
echo ""
echo "# Use existing baseline (ID 1):"
echo 'python3 streaming_simulator.py --baseline-id 1'
echo ""
echo "# Upload new baseline file and stream:"
echo 'python3 streaming_simulator.py --baseline-file "test-data/Store D Line A - Baseline.csv"'
echo ""
echo "# Custom streaming parameters:"
echo 'python3 streaming_simulator.py --baseline-id 1 --delay 1.0 --batch-size 5'
echo ""
echo "🔧 Troubleshooting:"
echo "==================="
echo ""
echo "- If API server fails to start, check if port 8080 is available"
echo "- If frontend fails to start, check if port 3000 is available"
echo "- If streaming simulator fails, ensure the API server is running"
echo "- Check logs in streaming_simulator.log for detailed error information"
echo ""
print_success "Setup complete! Happy streaming! 🚀"
