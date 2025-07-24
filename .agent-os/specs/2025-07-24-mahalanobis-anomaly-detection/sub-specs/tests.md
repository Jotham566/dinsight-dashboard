# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-24-mahalanobis-anomaly-detection/spec.md

> Created: 2025-07-24  
> Version: 1.0.0

## Test Coverage

### Unit Tests

**MahalanobisCalculator**
- Test distance calculation with known baseline and monitoring points
- Test centroid calculation from baseline dataset coordinates
- Test covariance matrix computation with 2x2 coordinate data
- Test inverse covariance matrix calculation with regularization
- Test numerical stability with near-singular covariance matrices
- Test distance calculation accuracy against reference implementation
- Test edge cases: identical points, collinear data, single point datasets

**ThresholdCalculator**
- Test adaptive threshold calculation with various sensitivity factors
- Test sensitivity level classification (high/medium/low)
- Test threshold boundary validation (min/max sensitivity factors)
- Test statistical calculations: mean and standard deviation of baseline distances
- Test threshold updates when sensitivity factor changes
- Test error handling for invalid sensitivity values

**AnomalyClassifier**  
- Test binary classification of points as normal/anomalous
- Test percentage calculation for anomaly rates
- Test classification consistency across different dataset sizes
- Test edge cases: all points anomalous, no anomalies detected
- Test statistical summary generation and accuracy

### Integration Tests

**Complete Anomaly Detection Pipeline**
- Test end-to-end anomaly detection from dataset IDs to results
- Test baseline dataset processing and statistics calculation
- Test monitoring dataset analysis and classification
- Test result formatting and statistical summary generation
- Test database integration for coordinate data retrieval
- Test user authentication and dataset access permissions

**Distance Distribution Generation**
- Test histogram generation for baseline and monitoring distances
- Test bin calculation and distribution density computation
- Test threshold line generation and positioning
- Test visualization data formatting for frontend consumption
- Test handling of different dataset sizes and distributions

**Batch Processing**
- Test multiple monitoring datasets against single baseline
- Test concurrent processing and result aggregation
- Test error handling when some datasets fail processing
- Test memory management with large batch operations

### Mocking Requirements

- **Dataset Service**: Mock coordinate data retrieval for consistent test data
- **Database Queries**: Mock GORM database calls for dataset access testing
- **Matrix Operations**: Mock gonum matrix operations for unit testing mathematical logic
- **Statistical Libraries**: Mock statistical calculations to test business logic independently

## Performance Tests

**Mathematical Computation Performance**
- Test Mahalanobis distance calculation speed with datasets of varying sizes (100, 1k, 10k, 100k points)
- Test covariance matrix computation performance with large baseline datasets
- Test memory usage during distance calculations for large monitoring datasets  
- Test concurrent anomaly detection requests (10, 50, 100 simultaneous analyses)

**API Response Time Testing**
- Test anomaly detection API response times under different loads
- Test distance distribution generation performance
- Test batch processing performance with multiple monitoring datasets
- Test sensitivity analysis computation time with varying step counts

## Accuracy Tests

**Mathematical Correctness**
- Test Mahalanobis distance calculations against reference implementation
- Compare results with Streamlit dashboard outputs using identical datasets
- Test statistical accuracy: mean, standard deviation, percentage calculations
- Validate covariance matrix calculations against known mathematical results
- Test threshold calculations across different sensitivity factors

**Classification Validation**
- Test anomaly classification consistency with reference implementation
- Validate sensitivity level descriptions match expected ranges
- Test boundary conditions: points exactly at threshold distance
- Verify statistical summaries match manual calculations

## Edge Case Tests

**Numerical Edge Cases**
- Test with perfectly collinear baseline data (singular covariance matrix)
- Test with identical baseline points (zero covariance)
- Test with extreme coordinate values (very large/small numbers)
- Test with datasets containing NaN or infinite coordinate values
- Test regularization behavior with near-singular matrices

**Data Edge Cases**
- Test with minimum viable datasets (2-3 points)
- Test with single-point baseline (invalid case)
- Test with empty monitoring datasets
- Test with mismatched coordinate ranges between baseline and monitoring
- Test with datasets containing duplicate points

**Boundary Sensitivity Testing**
- Test minimum sensitivity factor (0.1) - maximum anomaly detection
- Test maximum sensitivity factor (10.0) - minimum anomaly detection  
- Test sensitivity factor = 0 (edge case handling)
- Test extremely high sensitivity factors (>10.0)

## Security Tests

**Dataset Access Control**
- Test unauthorized access to private datasets for anomaly detection
- Test cross-user dataset access prevention
- Test API authentication for all anomaly detection endpoints
- Test input validation for dataset IDs and parameters

**Input Validation**
- Test SQL injection prevention in dataset ID parameters
- Test parameter validation for sensitivity factors and numerical inputs
- Test handling of malformed JSON requests
- Test protection against excessively large datasets (DoS prevention)

## Error Handling Tests

**Mathematical Error Handling**
- Test graceful handling of singular matrix errors
- Test division by zero protection in statistical calculations
- Test overflow/underflow handling in distance calculations
- Test invalid coordinate data handling (non-numeric values)

**API Error Handling**  
- Test response handling when datasets are not found
- Test error messages when datasets are incompatible
- Test timeout handling for large dataset processing
- Test concurrent request handling and resource management

## Mock Data Structures

```go
// Mock datasets for testing
type MockDataset struct {
    ID          string
    UserID      string
    Coordinates []Point2D
    Name        string
}

// Known test data with expected results
var TestBaseline = MockDataset{
    ID: "test-baseline",
    Coordinates: []Point2D{
        {X: 0.0, Y: 0.0},
        {X: 1.0, Y: 1.0},
        {X: -1.0, Y: -1.0},
        {X: 0.5, Y: -0.5},
    },
}

var TestMonitoring = MockDataset{
    ID: "test-monitoring", 
    Coordinates: []Point2D{
        {X: 0.1, Y: 0.1},    // Normal point
        {X: 5.0, Y: 5.0},    // Anomaly point
        {X: 0.8, Y: 0.9},    // Normal point
    },
}

// Expected results for validation
type ExpectedResults struct {
    BaselineCentroid     Point2D
    CovarianceMatrix     [2][2]float64
    BaselineDistances    []float64
    MonitoringDistances  []float64
    AnomalyClassification []bool
    ThresholdValue       float64
    AnomalyPercentage    float64
}
```

## Integration Test Scenarios

1. **Streamlit Compatibility Test**: Load identical datasets as used in Streamlit dashboard, verify exact match of anomaly detection results
2. **Sensitivity Analysis Workflow**: Test complete sensitivity factor adjustment from 0.5 to 5.0, verify threshold changes and anomaly count variations
3. **Large Dataset Performance**: Test with 10k+ point datasets, verify acceptable performance and memory usage
4. **Multi-User Isolation**: Test concurrent anomaly detection by different users, verify no data leakage or interference
5. **Error Recovery**: Test system behavior when datasets are deleted during processing, verify graceful error handling