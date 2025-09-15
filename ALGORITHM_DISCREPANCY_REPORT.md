# 🔍 Algorithm Discrepancy Report

**Issue**: Baseline and Monitor Processing Use Different Normalization Algorithms  
**Impact**: Same data produces different visualizations between normal analysis and real-time streaming  
**Status**: ✅ **FIXED** - Algorithms now unified  
**Date**: September 1, 2025

---

## 📊 **Problem Summary**

The DInsight platform had **two different normalization algorithms** for processing the same type of sensor data:

1. **Baseline Processing** (`ProcessData` in `internal/processor/`) - Used for normal file uploads
2. **Monitor Processing** (`ProcessMonitoring` in `internal/dinsightmon/`) - Used for real-time streaming

This caused **identical datasets to produce different plot shapes and coordinates** when processed through different pathways.

---

## 🔬 **Technical Details**

### **Baseline Algorithm** (Original - Correct)
**File**: `internal/processor/functions.go` (Normalize function)
```go
// Data-driven normalization
for _, val := range theDmatrix {
    if val > maxDij {
        maxDij = val  // Calculate actual max from data
    }
    if val > 0 && val < minDij {
        minDij = val  // Calculate actual min from data
    }
}

// Standard normalization formula
normVal = (val - minDij) / (maxDij - minDij)
```

### **Monitor Algorithm** (Original - Problematic)
**File**: `internal/dinsightmon/monitor.go` (ProcessMonitoring function)
```go
// Hardcoded normalization
maxDij := 10.91  // ❌ HARDCODED VALUE
minDij := math.MaxFloat64

// Find minimum from data, but max is fixed
for _, val := range simMatInMultiDim {
    if val > 0 && val < minDij {
        minDij = val
    }
}

// Different normalization formula
normVal = (val - minDij) / (5*maxDij - minDij)  // ❌ DIFFERENT FORMULA
```

---

## 🎯 **Key Differences**

| Aspect | Baseline Algorithm | Monitor Algorithm (Original) |
|--------|-------------------|------------------------------|
| **Max Value** | Data-driven (`maxDij` calculated from actual data) | Hardcoded (`maxDij = 10.91`) |
| **Normalization Formula** | `(val - minDij) / (maxDij - minDij)` | `(val - minDij) / (5*maxDij - minDij)` |
| **Approach** | Statistical best practice | Unknown rationale |

---

## 💥 **Impact**

- **User Confusion**: Same CSV file produced different visualizations
- **Data Inconsistency**: Streaming analysis didn't match batch analysis
- **Algorithm Integrity**: Undermined confidence in results
- **Development Issues**: Made debugging and validation difficult

---

## ✅ **Solution Applied**

**Modified**: `internal/dinsightmon/monitor.go` (lines ~210-230)

```go
// NEW: Calculate actual maxDij from reference data (same as baseline)
maxDij := 0.0
minDij := math.MaxFloat64

// Find actual min/max from the distance data
for _, val := range simMatInMultiDim {
    if val > maxDij {
        maxDij = val
    }
    if val > 0 && val < minDij {
        minDij = val
    }
}

// NEW: Use same normalization as baseline
normDmatrix[j] = (val - minDij) / (maxDij - minDij)
```

---

## 🧪 **Verification**

**Test**: Process same CSV file through both pathways
- **Before Fix**: Different plot shapes and coordinates
- **After Fix**: ✅ Identical results - mathematical consistency restored

**Files Used for Testing**:
- `test-data/test-baseline.csv`
- `test-data/test-monitoring.csv`

---

## 📋 **Root Cause Analysis**

**Likely Causes**:
1. **Different Development Phases**: Monitor processing added later with different assumptions
2. **Hardcoded Constants**: `maxDij = 10.91` suggests copy-paste from specific dataset
3. **Formula Variation**: `5*maxDij` multiplier had no documented mathematical justification
4. **Lack of Cross-Validation**: No tests comparing both algorithms on same data

**Best Practice Violated**: Normalization should always be data-driven, not hardcoded

---

## 🔒 **Prevention Measures**

1. **✅ Unified Algorithm**: Both pathways now use identical normalization
2. **✅ Documentation**: This report provides clear reference

---

*This fix ensures the DInsight platform maintains mathematical integrity and provides consistent results regardless of processing pathway.*
