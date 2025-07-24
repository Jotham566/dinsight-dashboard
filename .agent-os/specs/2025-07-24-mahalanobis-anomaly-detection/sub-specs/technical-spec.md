# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-24-mahalanobis-anomaly-detection/spec.md

> Created: 2025-07-24  
> Version: 1.0.0

## Technical Requirements

- **Mahalanobis Distance Implementation**: Mathematical computation using reference dataset centroid and inverse covariance matrix with numerical stability checks
- **Covariance Matrix Processing**: Calculation of sample covariance with regularization (ε = 1e-6) to handle near-singular matrices
- **Adaptive Threshold Calculation**: Dynamic threshold = mean_baseline_distances + (sensitivity_factor × std_baseline_distances)
- **Statistical Classification**: Binary classification of monitoring points as normal/anomalous based on distance threshold comparison
- **Distance Distribution Analysis**: Histogram generation for baseline and monitoring distance distributions with overlay visualization
- **Numerical Stability Handling**: Matrix singularity detection, zero standard deviation protection, and graceful degradation

## Approach Options

**Option A: Pure Mathematical Implementation**
- Pros: Direct control over calculations, exact replication of Streamlit logic, no external dependencies
- Cons: More complex implementation, requires careful numerical handling

**Option B: Statistical Library Integration** 
- Pros: Proven numerical stability, optimized implementations, reduced development time
- Cons: External dependencies, potential deviation from original implementation

**Option C: Hybrid Approach** (Selected)
- Pros: Custom logic for business rules, proven math libraries for core calculations, maintains compatibility
- Cons: Mixed complexity, requires careful integration

**Rationale:** Option C allows us to maintain exact compatibility with the Streamlit implementation while leveraging proven mathematical libraries for numerical stability. This ensures we can replicate the exact behavior while improving robustness.

## External Dependencies

- **gonum/stat** - Statistical functions and matrix operations for Go
  - **Justification**: Provides numerically stable covariance matrix calculations and statistical utilities

- **gonum/mat** - Matrix operations and linear algebra
  - **Justification**: Required for inverse covariance matrix computation and vector operations

## Mathematical Implementation Details

### Mahalanobis Distance Formula
```
distance = sqrt((x - μ)ᵀ × Σ⁻¹ × (x - μ))

Where:
- x = monitoring data point (2D coordinate)
- μ = reference dataset centroid 
- Σ⁻¹ = inverse covariance matrix of reference dataset
```

### Threshold Calculation
```
threshold = mean(baseline_distances) + sensitivity_factor × std(baseline_distances)

Sensitivity Levels:
- High Sensitivity: ≤1.5x (detects subtle variations)
- Medium Sensitivity: 2.0-3.5x (balanced detection) 
- Low Sensitivity: ≥4.0x (focuses on significant deviations)
```

### Covariance Matrix Regularization
```go
// Add small epsilon to diagonal for numerical stability
for i := 0; i < n; i++ {
    cov.Set(i, i, cov.At(i, i) + 1e-6)
}
```

## Data Structures

```go
type AnomalyDetector struct {
    BaselineData     []Point2D
    BaselineCentroid Point2D
    CovarianceMatrix *mat.Dense
    InvCovMatrix     *mat.Dense
    BaselineDistances []float64
    ThresholdMean    float64
    ThresholdStd     float64
}

type Point2D struct {
    X float64 `json:"dinsight_x"`
    Y float64 `json:"dinsight_y"`
}

type AnomalyResult struct {
    Point             Point2D   `json:"point"`
    Distance          float64   `json:"mahalanobis_distance"`
    IsAnomaly         bool      `json:"is_anomaly"`
    Threshold         float64   `json:"threshold"`
    SensitivityFactor float64   `json:"sensitivity_factor"`
}

type AnomalyStats struct {
    TotalPoints       int     `json:"total_points"`
    AnomalyCount      int     `json:"anomaly_count"`
    AnomalyPercent    float64 `json:"anomaly_percent"`
    Threshold         float64 `json:"threshold"`
    SensitivityLevel  string  `json:"sensitivity_level"`
}
```

## Processing Pipeline

1. **Baseline Analysis Phase**:
   - Load baseline coordinate data (dinsight_x, dinsight_y)
   - Calculate dataset centroid (mean of x and y coordinates)
   - Compute 2x2 covariance matrix with regularization
   - Calculate inverse covariance matrix with singularity checks
   - Compute Mahalanobis distances for all baseline points
   - Calculate baseline distance statistics (mean, std deviation)

2. **Monitoring Analysis Phase**:
   - Load monitoring coordinate data
   - Apply baseline centroid and inverse covariance to monitoring points
   - Calculate Mahalanobis distance for each monitoring point
   - Apply adaptive threshold based on sensitivity factor
   - Classify points as normal/anomalous
   - Generate statistical summary and percentage reporting

3. **Visualization Data Generation**:
   - Create distance distribution histograms for both datasets
   - Generate anomaly overlay visualization data
   - Provide threshold markers and statistical annotations
   - Format data for frontend plotting libraries

## Error Handling

- **Singular Matrix Detection**: Check matrix determinant before inversion, apply regularization if needed
- **Numerical Instability**: Validate all distance calculations, handle NaN/Inf values gracefully  
- **Empty Dataset Handling**: Validate minimum dataset sizes (require >2 points for covariance calculation)
- **Threshold Validation**: Ensure sensitivity factors are within valid range (0.1-10.0)
- **Memory Management**: Optimize for large datasets (>10k points) with streaming calculations