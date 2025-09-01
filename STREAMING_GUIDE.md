# 🎬 Real-Time Streaming Feature Documentation

## Overview

The D'insight Real-Time Streaming feature enables live monitoring of machine health by simulating sensor data streams and visualizing them in real-time alongside baseline reference data. This feature provides operators with immediate insight into equipment performance and potential anomalies.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Python        │    │   Go API        │    │   Next.js       │
│   Streaming     │───▶│   Backend       │───▶│   Frontend      │
│   Simulator     │    │   (HTTP/REST)   │    │   (React)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitor       │    │   PostgreSQL    │    │   Plotly.js     │
│   CSV Files     │    │   Database      │    │   Visualization │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### 1. Python Streaming Simulator (`streaming_simulator.py`)

**Purpose**: Simulates real-time sensor data by sending monitor data point-by-point to the API.

**Key Features**:
- Supports existing baseline ID or new baseline file upload
- Configurable streaming delay and batch size
- Progress tracking and error handling
- Async I/O for efficient API communication
- Comprehensive logging

**Usage Examples**:
```bash
# Use existing baseline
python3 streaming_simulator.py --baseline-id 1

# Upload new baseline and stream
python3 streaming_simulator.py --baseline-file "test-data/Store D Line A - Baseline.csv"

# Custom parameters
python3 streaming_simulator.py --baseline-id 1 --delay 1.0 --batch-size 5
```

### 2. Backend API Endpoints

**New Streaming Endpoints**:

#### `GET /api/v1/streaming/{baseline_id}/status`
Returns current streaming status including progress and point counts.

**Response**:
```json
{
  "success": true,
  "data": {
    "baseline_id": 1,
    "total_points": 1000,
    "streamed_points": 250,
    "progress_percentage": 25.0,
    "baseline_points": 800,
    "is_active": false,
    "last_update": "2025-01-15T10:30:00Z"
  }
}
```

#### `GET /api/v1/streaming/{baseline_id}/latest`
Retrieves the most recent monitoring points with pagination.

**Query Parameters**:
- `limit`: Number of points to return (default: 100, max: 1000)
- `offset`: Pagination offset (default: 0)

#### `DELETE /api/v1/streaming/{baseline_id}/reset`
Clears all monitoring data for a baseline (useful for testing).

### 3. Frontend Streaming Page (`/dashboard/streaming`)

**Key Features**:
- **Real-time visualization**: Live plotting of baseline + monitoring data
- **Streaming controls**: Start, pause, stop, and reset functionality
- **Interactive settings**: Point size, contours, auto-refresh intervals
- **Status monitoring**: Progress tracking and connection status
- **Responsive design**: Optimized for different screen sizes

**Technical Implementation**:
- **Polling-based updates**: HTTP polling every 2 seconds (configurable)
- **Plotly.js integration**: High-performance scatter plots with contours
- **React Query**: Efficient data fetching and caching
- **Modular design**: Based on existing Data Comparison page

## Data Flow

1. **Baseline Setup**:
   - User selects existing baseline ID OR uploads new baseline file
   - Simulator validates baseline has coordinates available

2. **Streaming Process**:
   - Simulator reads monitor CSV file row by row
   - Creates temporary CSV files for batches (default: 1 point per batch)
   - Sends batches to `/monitor/{baseline_id}` endpoint
   - Backend processes and stores monitor coordinates

3. **Real-time Visualization**:
   - Frontend polls streaming status and data every 2 seconds
   - Plotly.js renders baseline points (blue) + live monitor points (red)
   - Users can control streaming and visualization settings

## Configuration

### Simulator Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `--baseline-id` | Use existing baseline | - | `--baseline-id 1` |
| `--baseline-file` | Upload new baseline | - | `--baseline-file "data.csv"` |
| `--monitor-file` | Monitor data file | `Store D Line A - Monitor.csv` | `--monitor-file "monitor.csv"` |
| `--delay` | Delay between batches (seconds) | 2.0 | `--delay 1.0` |
| `--batch-size` | Points per batch | 1 | `--batch-size 5` |
| `--api-url` | API base URL | `http://localhost:8080/api/v1` | `--api-url "http://api.example.com"` |

### Frontend Settings

- **Point Size**: 2-12px (default: 6px)
- **Show Contours**: Density contours for both baseline and monitoring data
- **Auto-refresh**: Toggle automatic data polling
- **Refresh Interval**: Currently fixed at 2 seconds

## Use Cases

### 1. **Live Machine Monitoring**
Monitor real-time sensor data against a known-good baseline to detect deviations.

### 2. **Anomaly Detection Training**
Stream historical data to test anomaly detection algorithms in a controlled environment.

### 3. **Operator Training**
Simulate various machine conditions for training operators on the system.

### 4. **System Integration Testing**
Test the complete data pipeline from sensors to visualization.

## Best Practices

### Baseline Selection
- Use baselines with sufficient data points (> 100 recommended)
- Ensure baseline data represents "normal" machine operation
- Consider using recent baselines for current machine conditions

### Streaming Configuration
- **Low-frequency monitoring**: Use 5-10 second delays for continuous monitoring
- **High-frequency analysis**: Use 1-2 second delays for detailed analysis
- **Batch processing**: Increase batch size for higher throughput scenarios

### Performance Optimization
- Limit visualization to reasonable point counts (< 10,000 for smooth interaction)
- Use contour plots for large datasets to show density patterns
- Consider data retention policies for long-running streams

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Verify API server is running on port 8080
   - Check API URL in simulator parameters
   - Ensure no firewall blocking localhost connections

2. **Baseline Not Found**
   - Verify baseline ID exists in database
   - Check that baseline has processed coordinates (dinsight_x, dinsight_y)
   - Wait for baseline processing to complete before streaming

3. **CSV File Errors**
   - Ensure monitor file has same column structure as baseline
   - Check file encoding (UTF-8 recommended)
   - Verify file permissions and path

4. **Frontend Not Updating**
   - Check browser network tab for API call failures
   - Verify auto-refresh is enabled
   - Try manual refresh button

### Performance Issues

1. **Slow Visualization**
   - Reduce point size or disable contours
   - Consider using data sampling for very large datasets
   - Check browser performance tab for memory usage

2. **High API Load**
   - Increase streaming delay between batches
   - Increase batch size to reduce API calls
   - Consider implementing WebSocket for high-frequency updates

## Future Enhancements

### Planned Features

1. **WebSocket Support**: Replace HTTP polling with real-time WebSocket connections
2. **Multiple Stream Sources**: Support concurrent streaming from multiple machines
3. **Alert Integration**: Real-time anomaly alerts during streaming
4. **Data Export**: Export streaming session data for further analysis
5. **Historical Playback**: Replay past streaming sessions at variable speeds

### Technical Improvements

1. **Connection Resilience**: Auto-reconnection and error recovery
2. **Data Compression**: Optimize payload size for high-frequency streams
3. **Clustering Integration**: Scale across multiple backend instances
4. **Mobile Optimization**: Touch-friendly controls and responsive charts

## API Reference

### Existing Endpoints Used

- `POST /api/v1/analyze` - Upload baseline files
- `GET /api/v1/dinsight/{id}` - Get baseline coordinates
- `POST /api/v1/monitor/{id}` - Upload monitoring data
- `GET /api/v1/monitor/{id}/coordinates` - Get monitoring coordinates

### New Streaming Endpoints

- `GET /api/v1/streaming/{baseline_id}/status` - Get streaming status
- `GET /api/v1/streaming/{baseline_id}/latest` - Get latest points
- `DELETE /api/v1/streaming/{baseline_id}/reset` - Reset streaming data

## Security Considerations

- **Authentication**: All streaming endpoints require valid JWT tokens
- **Rate Limiting**: Consider implementing rate limits for high-frequency streaming
- **Data Validation**: Validate all uploaded CSV data for security
- **Access Control**: Ensure users can only access their own streaming sessions

---

## Quick Start Guide

1. **Setup Environment**:
   ```bash
   ./setup_streaming.sh
   ```

2. **Start Services**:
   ```bash
   # Terminal 1: API Server
   cd Dinsight_API && ./dist/api-server
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

3. **Start Streaming**:
   ```bash
   # Terminal 3: Simulator
   source .venv/bin/activate
   python3 streaming_simulator.py --baseline-id 1
   ```

4. **View Results**:
   Open `http://localhost:3000/dashboard/streaming`

The real-time streaming feature is now ready for production use! 🚀
