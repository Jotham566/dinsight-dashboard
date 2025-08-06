# 🎨 Dashboard Wireframe & UI Specification

> **Complete UI/UX specification for the D'insight Dashboard**  
> **Framework**: Next.js 14+ with TypeScript & Tailwind CSS  
> **Design System**: Modern, responsive, production-ready

## 📋 Overview

The D'insight Dashboard is a comprehensive web application for predictive maintenance analytics, replacing the legacy Streamlit implementation with a modern, scalable, and user-friendly interface. The dashboard follows the original Streamlit app's structure while enhancing it with the backend's full capabilities.

## 🏗️ Architecture & Layout

### Root Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header (Global Navigation)                              │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────┐ │
│ │             │ │                                     │ │
│ │   Sidebar   │ │        Main Content Area            │ │
│ │ Navigation  │ │                                     │ │
│ │             │ │                                     │ │
│ │             │ │                                     │ │
│ └─────────────┘ └─────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Footer (Status, Version, Copyright)                     │
└─────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints
- **Mobile**: 320px - 768px (Stacked layout, hamburger menu)
- **Tablet**: 768px - 1024px (Collapsible sidebar)
- **Desktop**: 1024px+ (Full sidebar layout)

---

## 🔐 Authentication Pages

### Login Page (`/login`)
```
┌─────────────────────────────────────────────────────────┐
│                    D'insight Logo                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 Sign In                         │   │
│  │                                                 │   │
│  │  Email Address                                  │   │
│  │  [___________________________]                  │   │
│  │                                                 │   │
│  │  Password                                       │   │
│  │  [___________________________] [👁]           │   │
│  │                                                 │   │
│  │  [ ] Remember me      Forgot password?         │   │
│  │                                                 │   │
│  │            [Sign In]                            │   │
│  │                                                 │   │
│  │  Don't have an account? Sign up                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Email/password validation with real-time feedback
- Password visibility toggle
- "Remember me" checkbox
- Forgot password link
- Loading states and error handling
- Social login integration (future)

### Registration Page (`/register`)
```
┌─────────────────────────────────────────────────────────┐
│                    D'insight Logo                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │               Create Account                    │   │
│  │                                                 │   │
│  │  Full Name                                      │   │
│  │  [___________________________]                  │   │
│  │                                                 │   │
│  │  Email Address                                  │   │
│  │  [___________________________]                  │   │
│  │                                                 │   │
│  │  Password                                       │   │
│  │  [___________________________] [👁]           │   │
│  │  ████████░░ Strong                              │   │
│  │                                                 │   │
│  │  Organization Code (Optional)                   │   │
│  │  [___________________________]                  │   │
│  │                                                 │   │
│  │  [ ] I agree to Terms of Service               │   │
│  │                                                 │   │
│  │            [Create Account]                     │   │
│  │                                                 │   │
│  │  Already have an account? Sign in              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Real-time password strength indicator
- Email validation and availability check
- Optional organization code input
- Terms of service acceptance
- Account verification flow

---

## 🏠 Dashboard Layout Components

### Header Bar
```
┌─────────────────────────────────────────────────────────┐
│ [☰] D'insight Dashboard    [🔍 Search...]    [🔔] [👤▼] │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- Hamburger menu (mobile)
- Logo and title
- Global search bar
- Notifications bell with badge
- User profile dropdown

### Sidebar Navigation
```
┌─────────────────┐
│ 🏠 Dashboard    │
│ 📊 Data Summary │
│ 📈 Visualization│
│ 🔬 Analysis     │
│ 🧬 Features     │
│ 🏭 Machines     │
│ 🏢 Organization │
│ ⚙️  Settings    │
└─────────────────┘
```

**Features:**
- Active page highlighting
- Collapsible on tablet/mobile  
- Role-based menu items
- Quick action buttons

### User Profile Dropdown
```
┌─────────────────────────┐
│ 👤 John Doe             │
│    john@acme.com        │
├─────────────────────────┤
│ 👤 Profile              │
│ 🏢 Switch Organization  │
│ ⚙️  Settings            │
│ 🔐 Change Password      │
├─────────────────────────┤
│ 🚪 Sign Out             │
└─────────────────────────┘
```

---

## 🏠 Dashboard Home (`/dashboard`)

### Overview Cards Section
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │   24    │ │   15    │ │  98.5%  │ │    3    │       │
│ │Analyses │ │Machines │ │ Uptime  │ │ Alerts  │       │
│ │ 📊      │ │ 🏭      │ │ ✅      │ │ 🚨      │       │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Recent Activity Section
```
┌─────────────────────────────────────────────────────────┐
│ Recent Analyses                               [View All] │
├─────────────────────────────────────────────────────────┤
│ 🔬 CNC Machine #1 - Baseline Analysis    2 hours ago    │
│ 👁  View Results | 📊 Visualize | 📋 Report            │
├─────────────────────────────────────────────────────────┤
│ 🔍 Mill #3 - Monitoring Update           4 hours ago    │
│ 👁  View Results | 📊 Visualize | 📋 Report            │
├─────────────────────────────────────────────────────────┤
│ 🔬 Press #2 - Anomaly Detection          6 hours ago    │
│ 👁  View Results | 📊 Visualize | 📋 Report            │
└─────────────────────────────────────────────────────────┘
```

### Active Alerts Section
```
┌─────────────────────────────────────────────────────────┐
│ Active Alerts                              [Manage All] │
├─────────────────────────────────────────────────────────┤
│ 🔴 HIGH: CNC Machine #1 - Anomaly 18.5%   [Acknowledge]│
│ 🟡 MED:  Mill #3 - Drift detected         [Acknowledge]│
│ 🟠 LOW:  Press #2 - Maintenance due       [Acknowledge]│
└─────────────────────────────────────────────────────────┘
```

### Machine Health Grid
```
┌─────────────────────────────────────────────────────────┐
│ Machine Overview                           [Add Machine] │
├─────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│ │ CNC Mach#1 │ │   Mill #3  │ │  Press #2  │          │
│ │     🟢     │ │     🟡     │ │     🔴     │          │
│ │   Healthy  │ │  Warning   │ │  Critical  │          │
│ │ ──────────── │ │ ──────────── │ │ ──────────── │          │
│ │Last: 2hr ago│ │Last: 4hr ago│ │Last: 6hr ago│          │
│ └────────────┘ └────────────┘ └────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Summary Page (`/dashboard/data-summary`)

### File Upload Section
```
┌─────────────────────────────────────────────────────────┐
│ Data Upload & Management                                │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │        📁 Drag & Drop CSV Files Here               │ │
│ │                                                     │ │
│ │        Or click to browse files                     │ │
│ │                                                     │ │
│ │        Maximum file size: 100MB                     │ │
│ │        Supported formats: CSV                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [ ] Baseline Data  [ ] Monitoring Data  [Upload Files] │
└─────────────────────────────────────────────────────────┘
```

### Configuration Panel
```
┌─────────────────────────────────────────────────────────┐
│ Processing Configuration                   [Load Preset]│
├─────────────────────────────────────────────────────────┤
│ Optimizer: [Adam        ▼]  Alpha: [0.1    ]           │
│ Gamma0:    [1e-7       ]    Start: [f_0    ]           │
│ End Meta:  [participant ]    End:   [f_1023 ]          │
│                                                         │
│                               [Save Config] [Reset]    │
└─────────────────────────────────────────────────────────┘
```

### Uploaded Files List
```
┌─────────────────────────────────────────────────────────┐
│ Uploaded Files                                [Clear All]│
├─────────────────────────────────────────────────────────┤
│ 📄 baseline_data_week1.csv                              │
│    📊 1,000 records | 1,024 features | ✅ Processed    │
│    🏷️  baseline • production • week1                   │
│    [👁 Preview] [📊 Analyze] [📋 Metadata] [🗑 Delete] │
├─────────────────────────────────────────────────────────┤
│ 📄 monitoring_data_day1.csv                             │
│    📊 500 records | 1,024 features | ⚙️  Processing... │
│    🏷️  monitoring • day1                               │
│    [⏸ Cancel] [📋 Metadata]                            │
└─────────────────────────────────────────────────────────┘
```

### Dataset Statistics
```
┌─────────────────────────────────────────────────────────┐
│ Dataset Statistics                        [Export Stats]│
├─────────────────────────────────────────────────────────┤
│ Total Records: 1,500    Features: 1,024                │
│ Missing Values: 0.2%    Duplicates: 0                  │
│ Data Quality Score: 98.5%                               │
│                                                         │
│ Feature Value Ranges:                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ f_0:    Min: 0.12  Max: 4.32  Mean: 1.45  Std: 0.67│ │
│ │ f_1:    Min: 0.08  Max: 3.89  Mean: 1.32  Std: 0.71│ │
│ │ f_2:    Min: 0.15  Max: 4.01  Mean: 1.67  Std: 0.58│ │
│ │ ... [Show All]                                      │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 Visualization Page (`/dashboard/visualization`)

### Control Panel
```
┌─────────────────────────────────────────────────────────┐
│ Visualization Controls                                   │
├─────────────────────────────────────────────────────────┤
│ Dataset: [Baseline Week 1    ▼] vs [Monitoring Day 1 ▼]│
│ Plot Type: [● Scatter] [ Line] [ Density] [ Heatmap]    │
│ Color Scheme: [Default ▼]  Point Size: [6    ]         │
│ [ ] Show Contours  [ ] Side-by-Side  [🔄 Sync Zoom]    │
│                                                         │
│           [🖼️ Export PNG] [📊 Export SVG] [💾 Save]   │
└─────────────────────────────────────────────────────────┘
```

### Main Visualization Area
```
┌─────────────────────────────────────────────────────────┐
│ Interactive Plot                           [⛶ Fullscreen]│
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │     •  •    •                                       │ │
│ │   •      •      •  ← Baseline Data (Blue)          │ │
│ │      •  •   •                                       │ │
│ │   •    •    •     ✦ ← Monitoring Data (Red)        │ │
│ │     •     ✦   •                                     │ │
│ │        •    ✦                                       │ │
│ │     •    ✦    •                                     │ │
│ │                                                     │ │
│ │ [🔍+] [🔍-] [🏠] [↻] [⚙️] [💾]                    │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Legend: 🔵 Baseline (1,000 pts) 🔴 Monitoring (500 pts)│
│ Selected: 2 points | Hover: x=1.45, y=2.33             │
└─────────────────────────────────────────────────────────┘
```

### Analysis Summary Panel
```
┌─────────────────────────────────────────────────────────┐
│ Plot Analysis                               [📋 Report] │
├─────────────────────────────────────────────────────────┤
│ Data Distribution:                                      │
│ • Baseline: Normal distribution, mean=1.45, std=0.67   │
│ • Monitoring: Slight drift detected, mean=1.52         │
│                                                         │
│ Correlation Coefficient: 0.89 (Strong positive)        │
│ Distance from Centroid: 0.23 units                     │
│                                                         │
│ Outliers Detected: 3 points (0.6% of monitoring data)  │
│ [👁 Highlight Outliers] [📊 Show in Table]            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔬 Advanced Analysis Page (`/dashboard/analysis`)

### Anomaly Detection Control Panel
```
┌─────────────────────────────────────────────────────────┐
│ Anomaly Detection Settings                              │
├─────────────────────────────────────────────────────────┤
│ Baseline Dataset:   [Baseline Week 1        ▼]        │
│ Monitoring Dataset: [Monitoring Day 1       ▼]        │
│                                                         │
│ Detection Method:   [● Mahalanobis] [ Isolation Forest]│
│                                                         │
│ Sensitivity: [████████░░] 80%                          │
│ Threshold:   [██████░░░░] 2.5                          │
│                                                         │
│ [ ] Auto-adjust threshold  [ ] Real-time monitoring    │
│                                                         │
│        [🔍 Run Detection] [💾 Save Settings]           │
└─────────────────────────────────────────────────────────┘
```

### Results Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ Detection Results                          [📋 Generate Report]│
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │  1,000  │ │   47    │ │  4.7%   │ │ Medium  │       │
│ │ Points  │ │Anomalies│ │ Rate    │ │Severity │       │
│ │ Analyzed│ │ Found   │ │         │ │ Level   │       │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────┤
│ Anomaly Distribution:                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ High (>3.0):     ████ 12 points                    │ │
│ │ Medium (2.0-3.0): ████████ 23 points               │ │
│ │ Low (1.5-2.0):   ████████████ 12 points            │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Anomaly Visualization
```
┌─────────────────────────────────────────────────────────┐
│ Anomaly Plot                              [🎨 View Options]│
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │     •  •    •  ← Normal points                     │ │
│ │   •      •      •                                   │ │
│ │      •  •   •                                       │ │
│ │   •    •    ⚠️  ← Medium anomaly                    │ │
│ │     •     🚨  •  ← High anomaly                     │ │
│ │        •    •                                       │ │
│ │     •    •    •                                     │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 🔵 Normal  ⚠️ Medium Anomaly  🚨 High Anomaly           │
│ Click points for details | Brush to select region      │
└─────────────────────────────────────────────────────────┘
```

### Feature Importance Panel
```
┌─────────────────────────────────────────────────────────┐
│ Feature Importance Analysis               [📊 Export CSV]│
├─────────────────────────────────────────────────────────┤
│ Most Contributing Features to Anomalies:               │
│                                                         │
│ f_245: ████████████████████████ 87.3%                  │
│ f_156: ██████████████████ 73.1%                        │
│ f_789: ████████████████ 65.8%                          │
│ f_023: █████████████ 58.2%                             │
│ f_512: ███████████ 47.9%                               │
│                                                         │
│ [📈 Trend Analysis] [🔍 Deep Dive] [⚙️ Adjust Weights]│
└─────────────────────────────────────────────────────────┘
```

---

## 🧬 Feature Analysis Page (`/dashboard/features`)

**Based on Streamlit Implementation**: Visualizes raw feature data (f_0 to f_1023) from uploaded datasets, allowing detailed exploration of individual feature values across samples.

### Feature Data Loading Panel
```
┌─────────────────────────────────────────────────────────┐
│ 🧬 Feature Analysis: Database Feature Data             │
├─────────────────────────────────────────────────────────┤
│ ✅ Auto-Detected File Upload IDs                        │
│ Found 2 IDs from your current session.                 │
│                                                         │
│ ID Selection Method:                                    │
│ ● Use Auto-Detected ID  ○ Enter Manual ID              │
│                                                         │
│ Select Auto-Detected File Upload ID:                   │
│ [Baseline Analysis (ID: 123)           ▼]              │
│                                                         │
│ File Upload ID: 123  Samples: 1,000                    │
│ Features per Sample: 1,024  Metadata: ✅ Yes           │
│                                                         │
│                    [🔍 Load Feature Data]              │
└─────────────────────────────────────────────────────────┘
```

### Sample Selection & Visualization
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Feature Value Plots                                 │
├─────────────────────────────────────────────────────────┤
│ Select Samples to Visualize:                           │
│ [Select samples...               ▼] (up to 20 samples) │
│ Sample labels include metadata for easier identification│
│                                                         │
│ Selected: Sample 0 | segID: baseline_001               │
│          Sample 5 | segID: baseline_006               │
│          Sample 12 | participant: P001                │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Feature Values by Sample (ID: 123)                 │ │
│ │                                                     │ │
│ │ 4.0 ┤                                               │ │
│ │     │     ╭─╮                                       │ │
│ │ 3.0 ┤   ╭─╯ ╰─╮     ╭─╮                             │ │
│ │     │ ╭─╯     ╰─╮ ╭─╯ ╰─╮                           │ │
│ │ 2.0 ┤╱         ╰─╯     ╰─╮                         │ │
│ │     │                   ╰─╮                         │ │
│ │ 1.0 ┤                     ╰──────╮                  │ │
│ │     │                           ╰─────              │ │
│ │ 0.0 ┼─────────────────────────────────────────────  │ │
│ │     0   200   400   600   800  1000                │ │
│ │           Feature Index                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Legend: — Sample 0  — Sample 5  — Sample 12            │
│ Hover: Feature 245, Value: 2.34                        │
└─────────────────────────────────────────────────────────┘
```

### Metadata Display Panel
```
┌─────────────────────────────────────────────────────────┐
│ 📋 View Sample Metadata                   [🔽 Expand]   │
├─────────────────────────────────────────────────────────┤
│ Metadata for Selected Samples                          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │Sample│Label              │segID        │participant  │ │
│ │  0   │segID: baseline_001│baseline_001 │P001         │ │
│ │  5   │segID: baseline_006│baseline_006 │P001         │ │
│ │ 12   │participant: P001  │baseline_013 │P001         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Additional metadata fields may include:                 │
│ • Timestamp, Session, Trial, Condition                 │
│ • Quality scores, Processing flags                      │
│ • Custom dataset-specific identifiers                  │
└─────────────────────────────────────────────────────────┘
```

### Feature Statistics Overview
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Dataset Feature Statistics            [📋 Export CSV]│
├─────────────────────────────────────────────────────────┤
│ File Upload ID: 123                                     │
│ Total Samples: 1,000    Features per Sample: 1,024     │
│ Metadata Available: ✅ Yes (segID, participant, etc.)   │
│                                                         │
│ Feature Value Summary:                                  │
│ • Min Value: 0.0001    • Max Value: 4.9876             │
│ • Mean Range: 1.45     • Std Dev Range: 0.67           │
│ • Zero Values: 0.02%   • Missing Values: 0%            │
│                                                         │
│ Sample with Most Variation: Sample 247                  │
│ Sample with Least Variation: Sample 089                 │
│                                                         │
│ [🔄 Refresh Stats] [📊 Advanced Analysis]              │
└─────────────────────────────────────────────────────────┘
```

### Key Features of Feature Analysis
**Raw Feature Data Visualization:**
- **Multi-sample Comparison**: Plot feature values (f_0 to f_1023) for multiple selected samples
- **Interactive Line Charts**: Each sample shows as a different colored line across all feature indices  
- **Metadata Integration**: Sample labels automatically use meaningful metadata (segID, participant, timestamp)
- **Flexible Selection**: Choose up to 20 samples for detailed comparison

**Smart ID Detection:**
- **Auto-Detection**: Automatically finds File Upload IDs from recent baseline/monitoring analyses
- **Manual Override**: Option to manually enter specific File Upload IDs
- **Session Tracking**: Remembers and suggests IDs from current user session

**Data Quality Insights:**
- **Metadata Validation**: Checks for meaningful metadata and displays availability
- **Sample Statistics**: Shows total samples, features per sample, data quality metrics
- **Feature Range Analysis**: Overall statistics across all features in the dataset

**Interactive Exploration:**
- **Hover Details**: Show exact feature index and value on chart hover
- **Sample Navigation**: Easy selection and comparison of different samples
- **Export Capabilities**: Export feature data and metadata for external analysis
- **Responsive Design**: Charts adapt to container width and display well on all devices

---

## 🏭 Machine Management Page (`/dashboard/machines`)

### Machine Grid View
```
┌─────────────────────────────────────────────────────────┐
│ Machine Management                    [+ Add Machine]   │
├─────────────────────────────────────────────────────────┤
│ View: [● Grid] [ List]  Status: [All ▼]  Location: [All ▼]│
│ Search: [🔍 Search machines...]                         │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ CNC Machine │ │   Mill #3   │ │  Press #2   │        │
│ │     #1      │ │             │ │             │        │
│ │ ─────────── │ │ ─────────── │ │ ─────────── │        │
│ │    🟢      │ │    🟡      │ │    🔴      │        │
│ │  Healthy   │ │  Warning   │ │  Critical  │        │
│ │ ─────────── │ │ ─────────── │ │ ─────────── │        │
│ │Floor: A-2   │ │Floor: B-1   │ │Floor: C-3   │        │
│ │Last: 2hr ago│ │Last: 4hr ago│ │Last: 6hr ago│        │
│ │ ─────────── │ │ ─────────── │ │ ─────────── │        │
│ │[👁][📊][⚙️]│ │[👁][📊][⚙️]│ │[👁][📊][⚙️]│        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Machine Detail View
```
┌─────────────────────────────────────────────────────────┐
│ CNC Machine #1                          [✏️ Edit] [🗑️ Delete]│
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌─────────────────────────────────┐ │
│ │ Machine Info     │ │ Health Status                   │ │
│ │ ──────────────── │ │ ─────────────────────────────── │ │
│ │ Model: DMG MORI  │ │         🟢 Healthy             │ │
│ │ Serial: SN123456 │ │                                 │ │
│ │ Location: A-2    │ │ • Temperature: Normal           │ │
│ │ Status: Active   │ │ • Vibration: Normal             │ │
│ │ Installed: Jan 15│ │ • Performance: Good             │ │
│ │ Hours: 2,400     │ │ • Last Check: 2 hours ago       │ │
│ └──────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Recent Analyses                          [View All]      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✅ Baseline Analysis      Jan 15 14:30  [Results]   │ │
│ │ ✅ Monitoring Update      Jan 15 16:30  [Results]   │ │
│ │ 🔄 Anomaly Detection      Jan 15 18:30  [View]      │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Alert Configuration                      [🔔 Manage]     │
│ • High anomaly threshold: 15%                           │
│ • Maintenance interval: Monthly                         │
│ • Notification: Email, Slack                            │
└─────────────────────────────────────────────────────────┘
```

### Add/Edit Machine Modal
```
┌─────────────────────────────────────────────────────────┐
│ Add New Machine                               [✕]       │
├─────────────────────────────────────────────────────────┤
│ Machine Name:                                           │
│ [____________________________]                         │
│                                                         │
│ Model & Serial:                                         │
│ [Model_______________] [Serial Number_______]           │
│                                                         │
│ Location:                                               │
│ [Plant A - Floor 2______________]                       │
│                                                         │
│ Status:                                                 │
│ [● Active] [ Maintenance] [ Inactive]                   │
│                                                         │
│ Additional Information:                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Installation Date: [Jan 15, 2023]                   │ │
│ │ Maintenance Interval: [Monthly ▼]                   │ │
│ │ Operating Hours: [2400]                             │ │
│ │ Capacity: [High ▼]                                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                    [Cancel] [Save Machine]             │
└─────────────────────────────────────────────────────────┘
```

---

## 🏢 Organization Management Page (`/dashboard/organization`)

### Organization Overview
```
┌─────────────────────────────────────────────────────────┐
│ ACME Manufacturing Corp                    [✏️ Edit Info]│
├─────────────────────────────────────────────────────────┤
│ 📈 Analytics Dashboard | 👥 Members | ⚙️ Settings        │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌─────────────────────────────────┐ │
│ │ Organization     │ │ Quick Stats                     │ │
│ │ ──────────────── │ │ ─────────────────────────────── │ │
│ │ Industry: Mfg    │ │ 👥 Members: 12                  │ │
│ │ Founded: 2020    │ │ 🏭 Machines: 15                 │ │
│ │ Plan: Pro        │ │ 📊 Analyses: 247                │ │
│ │ Status: Active   │ │ 🚨 Active Alerts: 3             │ │
│ └──────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Team Members                              [👥 Invite]    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 John Doe        Admin      john@acme.com    [⚙️]  │ │
│ │ 👤 Jane Smith      Member     jane@acme.com    [⚙️]  │ │
│ │ 👤 Bob Johnson     Viewer     bob@acme.com     [⚙️]  │ │
│ │ 👤 Alice Brown     Member     alice@acme.com   [⚙️]  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Organization Settings
```
┌─────────────────────────────────────────────────────────┐
│ Organization Settings                                   │
├─────────────────────────────────────────────────────────┤
│ 🏢 General | 🔔 Notifications | 🔐 Security | 💳 Billing │
├─────────────────────────────────────────────────────────┤
│ Organization Name:                                      │
│ [ACME Manufacturing Corp_______________]                │
│                                                         │
│ Industry:                                               │
│ [Manufacturing ▼]                                       │
│                                                         │
│ Default Alert Settings:                                 │
│ Anomaly Threshold: [████████░░] 2.5                     │
│ [ ] Auto-resolve alerts after 24h                      │
│ [ ] Require acknowledgment for critical alerts         │
│                                                         │
│ Notification Preferences:                               │
│ [✅] Email notifications                                │
│ [✅] Slack integration                                  │
│ [ ] SMS notifications (Pro feature)                    │
│                                                         │
│ Data Retention:                                         │
│ Raw Data: [1 Year ▼]  Analysis Results: [2 Years ▼]    │
│                                                         │
│                         [Save Changes] [Cancel]        │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Settings Page (`/dashboard/settings`)

### User Profile Settings
```
┌─────────────────────────────────────────────────────────┐
│ Settings                                                │
├─────────────────────────────────────────────────────────┤
│ 👤 Profile | 🔔 Notifications | 🔐 Security | 🔑 API     │
├─────────────────────────────────────────────────────────┤
│ Personal Information:                                   │
│                                                         │
│ Full Name:                                              │
│ [John Doe_____________________]                         │
│                                                         │
│ Email Address:                                          │
│ [john.doe@acme.com____________] [✅ Verified]           │
│                                                         │
│ Role: User (assigned by organization admin)             │
│                                                         │
│ Preferences:                                            │
│ Theme: [● Auto] [ Light] [ Dark]                        │
│ Language: [English ▼]                                   │
│ Timezone: [UTC-8 Pacific ▼]                            │
│                                                         │
│ Dashboard Defaults:                                     │
│ Default Organization: [ACME Manufacturing ▼]           │
│ Items per page: [50 ▼]                                  │
│ [ ] Show advanced features                              │
│                                                         │
│                    [Save Changes] [Cancel]              │
└─────────────────────────────────────────────────────────┘
```

### Security Settings
```
┌─────────────────────────────────────────────────────────┐
│ Security Settings                                       │
├─────────────────────────────────────────────────────────┤
│ Password:                                               │
│ Current Password:                                       │
│ [________________________] [👁]                       │
│                                                         │
│ New Password:                                           │
│ [________________________] [👁]                       │
│ ████████░░ Strong                                       │
│                                                         │
│ Confirm New Password:                                   │
│ [________________________] [👁]                       │
│                                                         │
│                          [Change Password]             │
│                                                         │
│ ────────────────────────────────────────────────────────│
│                                                         │
│ Two-Factor Authentication:                              │
│ Status: ❌ Disabled                      [Enable 2FA]   │
│                                                         │
│ Active Sessions:                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🖥️  Current Session      Chrome, MacOS   [Current]  │ │
│ │ 📱  Mobile App          iOS Safari       [Revoke]   │ │
│ │ 💻  Office Computer     Firefox, Windows [Revoke]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                              [Revoke All Sessions]     │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Component Specifications

### Design System
- **Colors**: 
  - Primary: Blue (#3B82F6)
  - Secondary: Gray (#6B7280)  
  - Success: Green (#10B981)
  - Warning: Yellow (#F59E0B)
  - Danger: Red (#EF4444)
- **Typography**: Inter font family
- **Spacing**: 4px, 8px, 16px, 24px, 32px scale
- **Border Radius**: 4px (small), 8px (medium), 12px (large)

### Status Indicators
```
🟢 Healthy/Normal    🟡 Warning/Medium    🔴 Critical/High
✅ Success/Complete  ⚙️ Processing/Load   ❌ Error/Failed
🔵 Info/Default      🟠 Alert/Attention  ⚪ Disabled/N/A
```

### Interactive Elements
- **Buttons**: Hover states with 2px border, active states with inset shadow
- **Form Fields**: Focus states with blue outline, validation states
- **Cards**: Subtle shadow, hover elevation
- **Tables**: Zebra striping, sortable headers, row selection

### Responsive Behavior
- **Mobile**: Stack components vertically, hamburger navigation
- **Tablet**: Collapsible sidebar, touch-friendly controls
- **Desktop**: Full sidebar, keyboard shortcuts, multi-panel layouts

### Loading States
- **Skeleton Loading**: Gray placeholder blocks for content
- **Spinners**: For async operations and data fetching
- **Progress Bars**: For file uploads and long-running processes

### Error Handling
- **Toast Notifications**: Success/error messages
- **Inline Validation**: Real-time form feedback
- **Error Boundaries**: Graceful failure handling
- **Retry Mechanisms**: For failed API calls

---

## 🚀 Technical Implementation Notes

### State Management
- **Global State**: Zustand store for user, organization, theme
- **Server State**: React Query for API data caching
- **Form State**: React Hook Form for complex forms
- **Component State**: useState for local UI state

### Performance Optimizations
- **Code Splitting**: Route-based lazy loading
- **Virtual Scrolling**: For large data tables
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Regular bundle size monitoring

### Accessibility
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Tab order and shortcuts
- **Color Contrast**: WCAG AA compliance
- **Focus Management**: Proper focus handling

### Progressive Enhancement
- **Offline Support**: Service worker for core functionality
- **PWA Features**: Installation prompt, app manifest
- **Network Awareness**: Graceful degradation on slow connections

This comprehensive wireframe provides the complete blueprint for implementing a modern, professional, and highly functional D'insight Dashboard that enhances the original Streamlit application while leveraging all the advanced backend capabilities.
