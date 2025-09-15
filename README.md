# 🔬 Dinsight Dashboard

> **Advanced Data Analytics Platform for Dimensionality Reduction and Anomaly Detection**

[![License](https://img.shields.io/badge/license-Custom-blue.svg)](#license)
[![Go Version](https://img.shields.io/badge/go-1.23.2-blue.svg)](https://golang.org/)
[![Node Version](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)](https://typescriptlang.org/)

Dinsight Dashboard is a comprehensive data analytics platform that specializes in dimensionality reduction, monitoring, and anomaly detection for CSV datasets. Built with a Go backend and Next.js frontend, it provides real-time analytics capabilities for data scientists and engineers.

## 🚀 Features

- **📊 CSV File Processing**: Upload and analyze CSV datasets with advanced preprocessing
- **🔍 Dimensionality Reduction**: Custom DInsight algorithm for data visualization
- **📈 Real-time Monitoring**: Live data monitoring with configurable parameters
- **🎬 Streaming Simulation**: Python-based real-time data streaming simulator
- **🚨 Anomaly Detection**: Mahalanobis Distance-based anomaly classification
- **👥 User Management**: JWT-based authentication with role-based access control
- **⚙️ Configuration Management**: Flexible parameter tuning for analysis algorithms
- **📱 Modern UI**: Responsive Next.js frontend with real-time visualizations
- **🔐 Enterprise Security**: Custom license verification system

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Go + Gin)    │◄──►│  (PostgreSQL)   │
│   Port 3000     │    │   Port 8080     │    │   Port 5432     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

- **Backend**: Go API with Gin framework, GORM ORM, and PostgreSQL
- **Frontend**: Next.js 15+ with TypeScript, Tailwind CSS, and React Query
- **Database**: PostgreSQL with JSONB support for flexible data storage
- **Licensing**: Custom JWT-based license verification system
- **Processing**: Background goroutines for file processing and analysis

## 📋 Prerequisites

- **Go 1.23.2+** - [Download](https://golang.org/dl/)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://postgresql.org/download/)
- **Python 3.8+** - [Download](https://python.org/) (for streaming simulator)
- **Git** - [Download](https://git-scm.com/)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Jotham566/dinsight-dashboard.git
cd dinsight-dashboard
```

### 2. Database Setup

Ensure PostgreSQL is running. The application will automatically create tables on startup, but you need to create the database first:

```sql
CREATE DATABASE dinsight;
```

Update database credentials in `Dinsight_API/config/config.go` if needed.

### 3. Backend Setup

```bash
cd Dinsight_API

# Install dependencies
go mod download

# Build the API server
go build -o dist/api-server ./cmd/api
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Build for production (optional)
npm run build
```

### 5. License Configuration

The application requires a valid license file. For development:

1. Place `license.lic` in the `Dinsight_API/` directory
2. Ensure `devices.json` exists (will be created automatically)

### 6. Streaming Simulator Setup (Optional)

For real-time streaming simulation:

```bash
# Set up Python virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Or use the setup script
./setup_streaming.sh
```

## 🚀 Running the Application

### Start Backend (Development)

```bash
cd Dinsight_API
./dist/api-server
```

Or run directly without building:

```bash
cd Dinsight_API
go run ./cmd/api
```

The API will be available at `http://localhost:8080`

### Start Frontend (Development)

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Real-time Streaming Simulation

To simulate real-time data streaming:

```bash
# Activate virtual environment first
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Using existing baseline data
python3 streaming_simulator.py --baseline-id 1

# Upload new baseline and stream monitoring data
python3 streaming_simulator.py --baseline-file "test-data/Store D Line A - Baseline.csv"

# Custom streaming parameters with all options
python3 streaming_simulator.py \
  --baseline-file "test-data/Store D Line A - Baseline.csv" \
  --monitor-file "test-data/Store D Line A - Monitor.csv" \
  --delay 1.5 \
  --batch-size 3 \
  --latest-glow-count 2 \
  --api-url "http://localhost:8080/api/v1"

# View all available options
python3 streaming_simulator.py --help
```

#### Streaming Simulator Options

| Option | Description | Default |
|--------|-------------|---------|
| `--baseline-id` | Use existing baseline dinsight_id from database | - |
| `--baseline-file` | Upload new baseline file and use its dinsight_id | - |
| `--monitor-file` | Path to monitor CSV file | `test-data/Store D Line A - Monitor.csv` |
| `--delay` | Delay in seconds between data points | `2.0` |
| `--batch-size` | Number of points to send per batch | `1` |
| `--latest-glow-count` | Number of latest points to highlight with yellow glow | `10` |
| `--api-url` | Base API URL | `http://localhost:8080/api/v1` |

### Production Deployment

```bash
# Backend
cd Dinsight_API
go build -o dist/api-server ./cmd/api
./dist/api-server

# Frontend
cd frontend
npm run build
npm start
```

## 📡 API Documentation

The API includes Swagger documentation available at:
- **Swagger UI**: `http://localhost:8080/swagger/index.html`
- **API Spec**: [api_endpoints.md](./api_endpoints.md)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/analyze` | Upload CSV files for analysis |
| `GET` | `/api/v1/dinsight/:id` | Get dimensionality reduction results |
| `GET` | `/api/v1/monitor/:id` | Get monitoring data |
| `POST` | `/auth/login` | User authentication |
| `GET` | `/api/v1/config` | Get current configuration |

## 🛠️ Development

### Project Structure

```
├── Dinsight_API/              # Go backend
│   ├── cmd/                   # Application entry points
│   │   ├── api/               # Main API server
│   │   └── reset-db/          # Database reset utility
│   ├── internal/              # Internal application code
│   │   ├── handler/           # HTTP handlers
│   │   ├── model/             # Database models
│   │   ├── database/          # Database logic
│   │   ├── routes/            # Route definitions
│   │   ├── middleware/        # HTTP middleware
│   │   ├── processor/         # Data processing
│   │   └── dinsightmon/       # Monitoring logic
│   ├── pkg/                   # Public packages
│   │   ├── license/           # License verification
│   │   └── response/          # HTTP response helpers
│   ├── config/                # Configuration
│   ├── docs/                  # Swagger documentation
│   └── dist/                  # Build output
├── frontend/                  # Next.js frontend
│   ├── src/                   # Source code
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React components
│   │   ├── context/           # React contexts
│   │   ├── lib/               # Utilities
│   │   ├── styles/            # Global styles
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Helper functions
│   └── public/                # Static assets
├── specs/                     # Technical specifications
├── test-data/                 # Sample CSV files
├── .github/                   # GitHub configuration
├── .venv/                     # Python virtual environment
├── streaming_simulator.py     # Real-time data streaming simulator
├── requirements.txt           # Python dependencies
├── setup_streaming.sh         # Streaming environment setup script
├── reset-db.sh               # Database reset utility
└── STREAMING_GUIDE.md        # Streaming feature documentation
```

### Backend Development

```bash
cd Dinsight_API

# Run with automatic restart on changes
go run ./cmd/api

# Run tests
go test ./...

# Generate Swagger docs
swag init -g cmd/api/main.go

# Format code
go fmt ./...
```

### Frontend Development

```bash
cd frontend

# Development server with turbo
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Database Migrations

The application automatically runs migrations on startup. To reset the database:

```bash
# Use the reset database script
./reset-db.sh
```

### Streaming Setup

To set up the complete streaming environment:

```bash
# Run the streaming setup script
./setup_streaming.sh
```

### Sample Data

Use the provided test data for development:

```bash
# Test files are in test-data/
curl -X POST http://localhost:8080/api/v1/analyze \
  -F "files=@test-data/test-baseline.csv"

# Test real-time streaming (activate venv first)
source .venv/bin/activate
python3 streaming_simulator.py --baseline-file "test-data/Store D Line A - Baseline.csv"
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Verify connection
psql -h localhost -U postgres -d dinsight
```

**License Validation Failed**
- Ensure `license.lic` is in the correct location
- Check file permissions
- Verify license hasn't expired

**Python Dependencies Missing**
```bash
# Set up virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Or run the setup script
./setup_streaming.sh
```

**Streaming Simulation Issues**
- Ensure virtual environment is activated: `source .venv/bin/activate`
- Ensure backend is running on port 8080
- Check baseline ID exists or upload baseline file first
- Monitor `streaming_simulator.log` for detailed error messages
- Use `python3 streaming_simulator.py --help` to see all options

**Frontend Build Errors**
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Port Already in Use**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9
```

### Debug Mode

Enable debug logging:

```bash
# Backend
export GIN_MODE=debug
go run ./cmd/api

# Frontend
export NODE_ENV=development
npm run dev
```

## 📊 Monitoring & Performance

- **Logging**: Structured logging with configurable levels
- **Database**: Query optimization with proper indexing
- **Performance**: Background processing for file uploads

## 📚 Documentation

- [API Documentation](./api_endpoints.md)
- [Architecture Specs](./specs/README.md)
- [Streaming Guide](./STREAMING_GUIDE.md)

## 📄 License

This project uses a custom license. Contact the project maintainers for licensing details.