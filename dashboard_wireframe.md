# 🎨 Dashboard Wireframe & UI Specification

> **Complete UI/UX specification for the D'insight Dashboard**  
> **Framework**: Next.js 15.4.5 with TypeScript & Tailwind CSS  
> **Design System**: Modern, responsive, production-ready with glass morphism  
> **Status**: ✅ FULLY IMPLEMENTED - This document reflects the current frontend implementation

## 📋 Overview

The D'insight Dashboard is a comprehensive web application for predictive maintenance analytics, built with modern web technologies. The dashboard provides a complete workflow from data upload through anomaly detection, featuring real-time visualizations, comprehensive analytics capabilities, and a sophisticated user management system with dark mode support.

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
└─────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints
- **Mobile**: 320px - 768px (Sidebar overlay, mobile navigation)
- **Tablet**: 768px - 1024px (Collapsible sidebar)
- **Desktop**: 1024px+ (Full sidebar layout)

---

## 🔐 Authentication Pages

### Login Page (`/login`)
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐ │
│ │              Left Side - Form                       │ │
│ │                                                     │ │
│ │  ┌─────────────────────────────────────────────────┐ │ │
│ │  │                 Sign In                         │ │ │
│ │  │            [D] D'insight Logo                   │ │ │
│ │  │                                                 │ │ │
│ │  │  Email Address                                  │ │ │
│ │  │  [___________________________]                  │ │ │
│ │  │                                                 │ │ │
│ │  │  Password                                       │ │ │
│ │  │  [___________________________] [👁]           │ │ │
│ │  │                                                 │ │ │
│ │  │  [ ] Remember me      Forgot password?         │ │ │
│ │  │                                                 │ │ │
│ │  │            [Sign In]                            │ │ │
│ │  │                                                 │ │ │
│ │  │  Don't have an account? Sign up                │ │ │
│ │  └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │            Right Side - Feature Highlights         │ │
│ │                  (Hidden on mobile)                │ │
│ │                                                     │ │
│ │  D'insight Dashboard                                │ │
│ │  Advanced predictive maintenance analytics...       │ │
│ │                                                     │ │
│ │  1. Real-time Monitoring                            │ │
│ │  2. Anomaly Detection                               │ │
│ │  3. Predictive Insights                             │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Features:**
- Email/password validation with Zod schema validation
- Password visibility toggle with Eye/EyeOff icons
- "Remember me" checkbox functionality
- Loading states with Loader2 spinner
- Real-time form validation and error display
- Success message handling for registration flow
- Responsive design with feature highlights panel
- Forgot password link (UI only)
- Automatic redirect after successful login

### Registration Page (`/register`)
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐ │
│ │          Left Side - Feature Highlights             │ │
│ │              (Hidden on mobile)                     │ │
│ │                                                     │ │
│ │  Join D'insight                                     │ │
│ │  Start your journey to predictive maintenance...    │ │
│ │                                                     │ │
│ │  ✓ Free Trial                                       │ │
│ │  ✓ No Credit Card Required                          │ │
│ │  ✓ Expert Support                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │             Right Side - Registration Form          │ │
│ │                                                     │ │
│ │  ┌─────────────────────────────────────────────────┐ │ │
│ │  │               Create Account                    │ │ │
│ │  │            [D] D'insight Logo                   │ │ │
│ │  │                                                 │ │ │
│ │  │  Full Name                                      │ │ │
│ │  │  [___________________________]                  │ │ │
│ │  │                                                 │ │ │
│ │  │  Email Address                                  │ │ │
│ │  │  [___________________________]                  │ │ │
│ │  │                                                 │ │ │
│ │  │  Password                                       │ │ │
│ │  │  [___________________________] [👁]           │ │ │
│ │  │  ████████░░ Strong                              │ │ │
│ │  │  ✓ At least 8 characters                       │ │ │
│ │  │  ✓ One uppercase letter                        │ │ │
│ │  │  ✓ One lowercase letter                        │ │ │
│ │  │  ✓ One number                                   │ │ │
│ │  │                                                 │ │ │
│ │  │  [ ] I agree to Terms of Service               │ │ │
│ │  │                                                 │ │ │
│ │  │            [Create Account]                     │ │ │
│ │  │                                                 │ │ │
│ │  │  Already have an account? Sign in              │ │ │
│ │  └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Features:**
- Real-time password strength indicator with visual progress bar
- Password requirements checklist with check/X icons
- Complex password validation with regex patterns
- Terms of service acceptance checkbox with validation
- Full name and email validation
- Loading states and error handling
- Responsive layout with left-side feature highlights
- Password visibility toggle
- Link to terms and privacy policy pages

---

## 🏠 Dashboard Layout Components

### Header Bar
```
┌─────────────────────────────────────────────────────────┐
│ [☰] ✨ D'insight     [🔍 Search...]    [🌙] [🔔] [👤▼] │
│     Predictive Analytics                                │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Components:**
- **Hamburger menu** (mobile) - X icon for close, responsive behavior with backdrop blur
- **Logo and branding** - Sparkles icon with gradient background, "D'insight" with "Predictive Analytics" subtitle
- **Global search bar** - Hidden on mobile, intelligent search with placeholder text, ESC to clear
- **Theme toggle** - Light/Dark/Auto mode toggle with fixed browser compatibility (Safari, Chrome, Edge)
- **Notifications dropdown** - Bell icon with animated badge (3), comprehensive dropdown with color-coded notifications
- **User profile dropdown** - Avatar with initials, user name/role, profile/settings/logout options with proper navigation

### Sidebar Navigation
```
┌──────────────────────┐
│ ✨ D'insight         │
│    Analytics Platform│
│ ────────────────────  │
│ MAIN MENU            │
│ 🏠 Dashboard         │
│ 📤 Run Dinsight Anal│
│ 📈 Data Comparison   │
│ 🔬 Anomaly Detection │
│ 🧬 Feature Explorer  │
│ ────────────────────  │
│ QUICK ACTIONS        │
│ [📊 Upload] [🔬 Anal]│
│ ────────────────────  │
│ SYSTEM STATUS        │
│ API Status: ●Online  │
│ Processing: Ready    │
│ ────────────────────  │
│ ⚙️  Settings         │
│ ────────────────────  │
│ 👤 John Doe          │
│    User | ●          │
└──────────────────────┘
```

**✅ Implemented Features:**
- **Modern branding** - Sparkles logo with gradient effects and "Analytics Platform" subtitle
- **Organized sections** - "MAIN MENU", "QUICK ACTIONS", "SYSTEM STATUS" with proper typography
- **Active page highlighting** - Gradient background with border and chevron indicator for active links
- **Role-based menu items** - Permission-based navigation filtering with hasPermission function
- **Responsive behavior** - Mobile overlay with backdrop blur, smooth transitions
- **Quick action shortcuts** - Upload and Analyze buttons with emoji icons
- **System status widget** - Real-time API status with animated pulse indicators
- **User info panel** - Avatar with initials, name, role, and online status indicator
- **Mobile interactions** - Click-to-close overlay, proper touch targets

### Navigation Items (Actual Implementation):
1. **Dashboard** - `/dashboard` (Home icon) - Overview and getting started
2. **Run Dinsight Analysis** - `/dashboard/dinsight-analysis` (Upload icon) - Full workflow with configuration
3. **Data Comparison** - `/dashboard/visualization` (LineChart icon) - Interactive Plotly visualizations
4. **Anomaly Detection** - `/dashboard/analysis` (Microscope icon) - ML-powered anomaly detection
5. **Feature Explorer** - `/dashboard/features` (Dna icon) - Raw feature data exploration
6. **Settings** - `/dashboard/settings` (Settings icon) - User preferences and security

---

## 🏠 Dashboard Home (`/dashboard`)

### Modern Header with Welcome Message
```
┌─────────────────────────────────────────────────────────┐
│ 🏠 Welcome back, John!           [🔄 Refresh] [+ New]  │
│    Predictive maintenance dashboard                     │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Header:**
- **Personalized greeting** - "Welcome back, {firstName}!" with gradient text
- **Home icon** - Gradient background with shadow effects
- **Action buttons** - Refresh and "New Analysis" with glass morphism effects
- **Subtitle** - "Predictive maintenance dashboard" descriptive text
- **Responsive design** - Stacked layout on mobile devices

### System Status Cards
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│ │ ✅ ⚡   │ │ ⚙️ 📊    │ │ 📊 📈    │                    │
│ │ System  │ │Config-  │ │Recent   │                    │
│ │ Status  │ │uration  │ │Activity │                    │
│ │Operat'l │ │Config'd │ │No recent│                    │
│ └─────────┘ └─────────┘ └─────────┘                    │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Status Cards:**
- **System Status Card** - "Operational" with checkmark, gradient background
- **Configuration Card** - Shows "Configured"/"Default Settings" based on API config
- **Recent Activity Card** - Dynamic based on hasActivity from analysis config
- **Glass morphism design** - Backdrop blur, borders, shadows with hover effects
- **Real API Integration** - Uses api.analysis.getConfig() for live status
- **Loading States** - Skeleton animations during data fetch
- **Error Handling** - Graceful fallbacks for failed API calls

### Quick Actions Section
```
┌─────────────────────────────────────────────────────────┐
│ Quick Actions                                    ↗      │
│ Get started with your predictive maintenance analysis   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │📤 Upload    │ │📈 Compare   │ │🔬 Detect    │        │
│ │   Dataset   │ │   Data      │ │  Anomalies  │        │
│ │ Upload base │ │ Visualize   │ │ Run anomaly │        │
│ │ line/monit  │ │ dataset comp│ │ detection   │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
│ ┌─────────────┐                                        │
│ │🧬 Explore   │                                        │
│ │  Features   │                                        │
│ │ Examine raw │                                        │
│ │ feature data│                                        │
│ └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Quick Actions:**
1. **Upload Dataset** - Links to `/dashboard/dinsight-analysis`, primary blue gradient with shadow
2. **Compare Data** - Links to `/dashboard/visualization`, teal gradient with hover effects  
3. **Detect Anomalies** - Links to `/dashboard/analysis`, purple gradient with animations
4. **Explore Features** - Links to `/dashboard/features`, orange gradient with transform effects
- **Card animations** - Hover lift effect (-translate-y-1), scale transforms, shadow changes
- **Arrow indicators** - Animated arrow on hover (↗)
- **Glass morphism** - Backdrop blur effects, semi-transparent borders
- **Responsive grid** - 1-4 columns based on screen size

### Getting Started Guide (Conditional)
```
┌─────────────────────────────────────────────────────────┐
│ Getting Started with DInsight                           │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ 1 📤 Upload │ │ 2 📊 Add    │ │ 3 🔬 Detect │        │
│ │   Baseline  │ │  Monitoring │ │  Issues     │        │
│ │   Data      │ │   Data      │ │             │        │
│ │ Upload your │ │ Upload mon. │ │ Run anomaly │        │
│ │[Get Started]│ │[Compare...] │ │ [Analyze]   │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Getting Started:**
- **Conditional display** - Only shows when `!data.hasActivity` (no recent activity)
- **Step-by-step guide** - 3 numbered steps with gradient icons
- **Interactive buttons** - Each step links to appropriate workflow page
- **Visual progression** - Numbered badges (1, 2, 3) with color-coded backgrounds
- **Hover animations** - Scale transforms and shadow effects on icons
- **Responsive layout** - 1-3 columns based on screen size

### Current Configuration (Conditional)
```
┌─────────────────────────────────────────────────────────┐
│ Current Configuration                                   │
│ Analysis settings overview                              │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│ │Optimizer│ │ Alpha   │ │ Gamma0  │                    │
│ │  adam   │ │  0.1    │ │  1e-7   │                    │
│ └─────────┘ └─────────┘ └─────────┘                    │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Configuration Display:**
- **Conditional display** - Only shows when `data.config` exists
- **Color-coded cards** - Each parameter has unique gradient background
- **Real API data** - Shows actual configuration from api.analysis.getConfig()
- **Responsive grid** - 1-3 columns based on screen size
- **Glass morphism** - Semi-transparent backgrounds with borders and shadows

### Getting Started Guide
```
┌─────────────────────────────────────────────────────────┐
│ Getting Started with DInsight                           │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ 1 📁 Upload │ │ 2 📊 Add    │ │ 3 🔬 Detect │        │
│ │   Baseline  │ │  Monitoring │ │  Anomalies  │        │
│ │   Data      │ │   Data      │ │             │        │
│ │ Upload...   │ │ Upload...   │ │ Run anom... │        │
│ │[Upload Data]│ │[Compare...] │ │ [Analyze]   │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Guide:**
- **Step 1** - Upload Baseline Data with blue icon and button
- **Step 2** - Add Monitoring Data with green icon and button
- **Step 3** - Detect Anomalies with purple icon and button
- **Interactive Buttons** - Each step links to appropriate page
- **Visual Indicators** - Numbered badges and color-coded icons

---

## 📊 Run Dinsight Analysis Page (`/dashboard/dinsight-analysis`)

### Modern Header with Workflow Actions
```
┌─────────────────────────────────────────────────────────┐
│ 📤 Run DInsight Analysis     [🔄 Reset] [+ New Analysis]│
│    Configure settings and upload data for anomaly...   │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Header:**
- **Upload icon** - Gradient background with shadow effects
- **Action buttons** - Reset Workflow and direct link to new analysis
- **Descriptive subtitle** - Clear explanation of page purpose
- **Glass morphism design** - Backdrop blur with border effects

### Sidebar Workflow Tracker
```
┌─────────────────────────────────────────────────────────┐
│ ⚡ Workflow                                             │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐                                        │
│ │ ● 1 Baseline│ ← Current step                        │
│ │   In Progress│                                        │
│ └─────────────┘                                        │
│ ┌─────────────┐                                        │
│ │ ○ 2 Monitoring│                                       │
│ │   Pending    │                                        │
│ └─────────────┘                                        │
│ ┌─────────────┐                                        │
│ │ ○ ✓ Complete │                                        │
│ │   Pending    │                                        │
│ └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Workflow Sidebar:**
- **Visual step indicators** - Numbered badges with status colors
- **Dynamic state** - Active, completed, pending states with appropriate styling
- **Progress feedback** - "In Progress", "Processing...", "Completed", "Pending" labels
- **Configuration panel** - Compact view with edit functionality
- **Glass morphism** - Backdrop blur effects and hover animations

### Dual Upload Layout
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────┐ ┌─────────────┐                        │
│ │ 1 Baseline  │ │ 2 Monitoring│                        │
│ │   Upload    │ │   Upload    │                        │
│ │ ┌─────────┐ │ │ ┌─────────┐ │                        │
│ │ │📁 Drag &│ │ │ │📁 Drag &│ │                        │
│ │ │  Drop   │ │ │ │  Drop   │ │                        │
│ │ │CSV Files│ │ │ │CSV Files│ │                        │
│ │ │Max 100MB│ │ │ │Max 100MB│ │                        │
│ │ └─────────┘ │ │ └─────────┘ │                        │
│ │[Upload Data]│ │[Upload Data]│                        │
│ └─────────────┘ └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Upload System:**
- **Dual upload panels** - Side-by-side baseline and monitoring sections
- **State-based UI** - Active step highlighting with ring borders
- **Drag & Drop** - Full FileUpload component with validation
- **File constraints** - 100MB limit, CSV only, multiple files for baseline, single for monitoring
- **Upload progress** - Real-time status with Upload ID and Dinsight ID tracking
- **Error handling** - Comprehensive error states with retry functionality

### Configuration Panel
```
┌─────────────────────────────────────────────────────────┐
│ Processing Configuration                                │
├─────────────────────────────────────────────────────────┤
│ Optimizer: [Adam        ▼]  Alpha: [0.1     ]          │
│ Gamma0:    [1e-7       ]    Start: [f_0     ]          │
│ End Meta:  [participant ]   End:   [f_1023  ]          │
│                                                         │
│                        [Save Config] [Reset]           │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Configuration:**
- **Compact sidebar display** - Current settings overview with color-coded cards
- **Modal editor** - Full ConfigDialog with organized form fields
- **Parameter validation** - Input constraints (Alpha: 0.001-1.0, Gamma0: scientific notation)
- **Default restoration** - Factory reset with confirmation dialog
- **Real API Integration** - GET/POST to `/config` endpoint with proper error handling
- **Loading states** - Skeleton animations during config fetch

### Completion Status
```
┌─────────────────────────────────────────────────────────┐
│ 🎉 Analysis Complete!                                   │
│ Your data has been successfully processed and is ready  │
│ for analysis                                            │
├─────────────────────────────────────────────────────────┤
│ [📊 View Visualization] [🔬 Run Anomaly Detection]     │
│ [+ New Analysis]                                        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Completion:**
- **Success celebration** - Emoji and congratulatory message
- **Action buttons** - Direct links to visualization and analysis
- **New workflow option** - Reset button to start fresh
- **Glass morphism styling** - Gradient backgrounds with shadows

---

## 📊 Data Summary Analysis Page (`/dashboard/dinsight-analysis/data-summary`)

### Tabbed Navigation Interface
```
┌─────────────────────────────────────────────────────────┐
│ Run DInsight Analysis                                   │
│ Configure processing settings and upload data for...   │
├─────────────────────────────────────────────────────────┤
│ [1. Configuration] [2. Data Upload] [3. Statistics]    │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Tabs:**
- **Modern tab navigation** - Glass morphism design with gradient active states
- **Sequential workflow** - Configuration → Upload → Statistics flow
- **Active state styling** - Primary gradient with shadow effects for current tab
- **Responsive design** - Horizontal scroll on mobile devices
│ │    Estimated time: 30 seconds                      │ │
│ │    [Cancel]                                        │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Processing:**
- **Real-time Status Updates** - Polling for upload and processing status
- **Progress Indicators** - Progress bars and percentage completion
- **File Information** - Shows record count, features, file names
- **Status Icons** - Different icons for idle, uploading, processing, completed, error
- **Action Buttons** - View Results, Start Monitoring, Cancel operations
- **Error Handling** - Comprehensive error states with retry options

### Workflow Navigation
```
┌─────────────────────────────────────────────────────────┐
│ Workflow Progress                                       │
├─────────────────────────────────────────────────────────┤
│ ● Baseline ──→ ● Monitoring ──→ ○ Complete             │
│                                                         │
│ Next Steps:                                             │
│ [🔬 Run Anomaly Detection] [📊 View Comparison]        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Navigation:**
- **Step Indicators** - Visual progress through baseline → monitoring → complete
- **Next Actions** - Context-aware buttons for next steps
- **Workflow State Management** - Tracks current step and available actions
- **Navigation Links** - Direct links to analysis and visualization pages

---

## 📈 Data Comparison Page (`/dashboard/visualization`)

### Control Panel
```
┌─────────────────────────────────────────────────────────┐
│ Visualization Controls                                   │
├─────────────────────────────────────────────────────────┤
│ Dataset: [Baseline Analysis - ID 123    ▼]             │
│ Point Size: [6    ] [ ] Show Contours  [ ] Side-by-Side│
│                                                         │
│         [📷 Export PNG] [💾 Export Data] [🔄 Refresh]  │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Controls:**
- **Dataset Selection** - Dropdown populated from API (api.datasets.getDinsightDatasets())
- **Point Size Control** - Numeric input for plot point sizing
- **Toggle Options** - Show contours and side-by-side view checkboxes
- **Export Functions** - PNG export, data export, and refresh capabilities
- **Real Data Integration** - Uses actual dinsight datasets from backend

### Main Visualization Area
```
┌─────────────────────────────────────────────────────────┐
│ Interactive Plotly Visualization             [⛶ Fullscreen]│
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │     •  •    •                                       │ │
│ │   •      •      •  ← Baseline Points (Blue)        │ │
│ │      •  •   •                                       │ │
│ │   •    •    •     ✦ ← Monitoring Points (Red)      │ │
│ │     •     ✦   •                                     │ │
│ │        •    ✦                                       │ │
│ │     •    ✦    •                                     │ │
│ │                                                     │ │
│ │ [🔍+] [🔍-] [🏠] [↻] [📷] [💾]  Plotly Controls   │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Baseline: 1,000 points | Monitoring: 500 points        │
│ Selected: 0 points | Hover: x=1.45, y=2.33             │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Visualization:**
- **Plotly.js Integration** - Full interactive plots with React wrapper
- **Real Data Rendering** - Displays actual dinsight_x and dinsight_y coordinates
- **Interactive Features** - Zoom, pan, hover, selection tools
- **Dual Dataset Support** - Shows both baseline and monitoring data
- **Export Capabilities** - Built-in Plotly export functions
- **Status Information** - Point counts and interaction feedback

### Analysis Summary Panel
```
┌─────────────────────────────────────────────────────────┐
│ Dataset Information                                     │
├─────────────────────────────────────────────────────────┤
│ Selected Dataset: Baseline Analysis #123               │
│ Created: 2024-01-15 14:30                              │
│ Total Points: 1,000                                     │
│ Data Range: X: [0.12, 4.32] Y: [0.08, 3.89]           │
│                                                         │
│ Available Actions:                                      │
│ [🔬 Run Anomaly Detection] [📋 Export Summary]         │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Analysis:**
- **Dataset Metadata** - Shows creation date, point counts, data ranges
- **Action Buttons** - Links to anomaly detection and export functions
- **Real-time Updates** - Information updates when dataset selection changes
- **Data Insights** - Statistical information about selected dataset

---

## 🔬 Anomaly Detection Page (`/dashboard/analysis`)

### Dataset Selection Panel
```
┌─────────────────────────────────────────────────────────┐
│ Anomaly Detection Configuration                         │
├─────────────────────────────────────────────────────────┤
│ Baseline Dataset:   [Baseline Analysis #123 ▼]        │
│ Monitoring Dataset: [Auto-detected from baseline ▼]    │
│                                                         │
│ Detection Settings:                                     │
│ Threshold: [2.5        ] (Mahalanobis distance)       │
│                                                         │
│        [🔍 Run Anomaly Detection] [⚙️ Save Settings]   │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Configuration:**
- **Baseline Dataset Selection** - Dropdown with available dinsight datasets
- **Automatic Monitoring Detection** - Auto-detects monitoring data from selected baseline
- **Threshold Control** - Numeric input for Mahalanobis distance threshold
- **Real API Integration** - Uses api.datasets.getMonitoringDatasets() and api.analysis.runAnomalyDetection()

### Anomaly Results Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ Detection Results                                       │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │   500   │ │   23    │ │  4.6%   │ │ Medium  │       │
│ │ Points  │ │Anomalies│ │ Rate    │ │ Risk    │       │
│ │Analyzed │ │ Found   │ │         │ │ Level   │       │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Results:**
- **Statistics Cards** - Total points, anomaly count, rate, risk level
- **Real-time Calculation** - Results calculated from actual anomaly detection
- **Status Indicators** - Color-coded risk levels based on anomaly rates
- **Refresh Capability** - Re-run detection with different parameters

### Anomaly Visualization
```
┌─────────────────────────────────────────────────────────┐
│ Anomaly Detection Plot                     [📊 Options] │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │     •  •    •  ← Normal points (Blue)              │ │
│ │   •      •      •                                   │ │
│ │      •  •   •                                       │ │
│ │   •    •    🔴 ← High anomaly (Red)                │ │
│ │     •     🟡 •  ← Medium anomaly (Yellow)          │ │
│ │        •    •                                       │ │
│ │     •    •    •                                     │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 🔵 Normal  🟡 Medium Anomaly  🔴 High Anomaly           │
│ Threshold: 2.5 | Click points for details             │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Visualization:**
- **Plotly Integration** - Interactive anomaly plots with color coding
- **Point Classification** - Normal (blue), anomalous (red/yellow) based on threshold
- **Interactive Features** - Click points for detailed anomaly information
- **Legend and Controls** - Clear labeling and threshold display
- **Real Data** - Uses actual anomaly detection results from API

### Anomaly Details Panel
```
┌─────────────────────────────────────────────────────────┐
│ Anomaly Analysis Details                                │
├─────────────────────────────────────────────────────────┤
│ Selected Point Details:                                 │
│ • Index: 245                                            │
│ • Coordinates: X=2.34, Y=1.87                          │
│ • Mahalanobis Distance: 3.42                           │
│ • Classification: High Anomaly                         │
│                                                         │
│ [📋 Export Anomalies] [🔍 Investigate Further]        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Details:**
- **Point Information** - Shows index, coordinates, distance, classification
- **Interactive Selection** - Updates when points are clicked on plot
- **Export Functions** - Export anomaly results for further analysis
- **Real Calculations** - Uses actual Mahalanobis distance calculations

---

## 🧬 Feature Explorer Page (`/dashboard/features`)

### Feature Data Loading Panel
```
┌─────────────────────────────────────────────────────────┐
│ 🧬 Feature Explorer: Raw Feature Data Visualization    │
├─────────────────────────────────────────────────────────┤
│ ✅ Auto-Detected File Upload IDs                        │
│ Found 3 datasets from your current session.            │
│                                                         │
│ ID Selection Method:                                    │
│ ● Use Auto-Detected ID  ○ Enter Manual ID              │
│                                                         │
│ Select File Upload ID:                                  │
│ [Baseline Dataset - ID: 123 (1,000 samples) ▼]        │
│                                                         │
│ Dataset Info: 1,000 samples × 1,024 features          │
│ Metadata Available: ✅ Yes (segID, participant)        │
│                                                         │
│                    [🔍 Load Feature Data]              │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Loading:**
- **Auto-Detection** - Automatically finds available file upload IDs
- **Manual Override** - Option to manually enter specific IDs
- **Dataset Information** - Shows sample count, feature count, metadata availability
- **Real API Integration** - Uses api.features.getDatasets() and api.features.getFeatureData()
- **Loading States** - Progress indicators during data loading

### Sample Selection & Visualization
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Feature Value Plots                                 │
├─────────────────────────────────────────────────────────┤
│ Select Samples to Visualize:                           │
│ [Sample 0, Sample 5, Sample 12...        ▼] (max 20)  │
│ Sample labels include metadata for easier identification│
│                                                         │
│ Selected Samples:                                       │
│ • Sample 0: segID baseline_001, participant P001       │
│ • Sample 5: segID baseline_006, participant P001       │
│ • Sample 12: segID baseline_013, participant P002      │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Feature Values by Sample (File Upload ID: 123)     │ │
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
│ │           Feature Index (f_0 to f_1023)            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Legend: — Sample 0  — Sample 5  — Sample 12            │
│ Hover: Feature f_245, Value: 2.34                      │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Visualization:**
- **Multi-Sample Selection** - Select up to 20 samples for comparison
- **Metadata Integration** - Sample labels show meaningful metadata (segID, participant)
- **Interactive Plotly Charts** - Line plots showing feature values (f_0 to f_1023)
- **Sample Comparison** - Multiple colored lines for different samples
- **Hover Information** - Shows exact feature index and value
- **Real Feature Data** - Displays actual 1,024-feature vectors from database

### Metadata Display Panel
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Sample Metadata                        [🔽 Expand]   │
├─────────────────────────────────────────────────────────┤
│ Metadata for Selected Samples                          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │Sample│Label                  │segID        │participant│ │
│ │  0   │segID: baseline_001    │baseline_001 │P001       │ │
│ │  5   │segID: baseline_006    │baseline_006 │P001       │ │
│ │ 12   │participant: P002      │baseline_013 │P002       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Additional metadata fields detected:                    │
│ • segID, participant, timestamp, session_id            │ │
│ • Custom dataset-specific identifiers                  │ │
│                                                         │
│ [📊 Export Metadata] [🔍 Filter by Metadata]          │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Metadata:**
- **Comprehensive Display** - Shows all available metadata fields
- **Table Format** - Organized metadata table for selected samples
- **Dynamic Detection** - Automatically detects available metadata fields
- **Export Functions** - Export metadata for external analysis
- **Filtering Options** - Filter samples by metadata values

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

**✅ Implemented Statistics:**
- **Dataset Overview** - Sample count, feature count, metadata status
- **Statistical Summary** - Min, max, mean, std dev across all features
- **Data Quality Metrics** - Zero values, missing values percentages
- **Variation Analysis** - Identifies samples with highest/lowest variation
- **Export Capabilities** - CSV export of statistics and feature data

---

## ⚙️ Settings Page (`/dashboard/settings`)

### Profile Settings Tab
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
│ Email Address:                        ✅ Verified       │
│ [john.doe@acme.com____________]                         │
│                                                         │
│ Role: User (assigned by organization admin)             │
│ Organization: ACME Manufacturing                        │
│                                                         │
│ Preferences:                                            │
│ Theme: [● Auto] [ Light] [ Dark]                        │
│ Language: [English ▼]                                   │
│ Timezone: [UTC-8 Pacific ▼] (Auto-detected)           │
│ Items per page: [50 ▼]                                  │
│ [ ] Show advanced features                              │
│                                                         │
│                    [💾 Save Changes]                    │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Profile:**
- **Real User Data** - Populated from auth context (user.full_name, user.email)
- **Email Verification** - Shows verification status with checkmark
- **Theme Selection** - Auto, Light, Dark options (UI ready for dark mode)
- **Timezone Detection** - Auto-detects user timezone with multiple options
- **Form Validation** - Real-time change detection and validation
- **API Integration** - Saves changes via api.users.updateProfile()

### Notifications Tab
```
┌─────────────────────────────────────────────────────────┐
│ Notification Preferences                                │
├─────────────────────────────────────────────────────────┤
│ Communication:                                          │
│ ✅ Email notifications                                  │
│ ✅ Slack integration                                    │
│ ❌ SMS notifications (Pro feature)                      │
│                                                         │
│ Alert Types:                                            │
│ ✅ Anomaly detection alerts                             │
│ ❌ System updates                                       │
│ ✅ Weekly reports                                       │
│                                                         │
│ Notification preferences control how you receive        │
│ alerts and updates from the DInsight platform.         │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Notifications:**
- **Communication Channels** - Email, Slack, SMS (Pro feature labeled)
- **Alert Types** - Anomaly alerts, system updates, weekly reports
- **Toggle Controls** - Individual on/off switches for each notification type
- **Feature Gating** - Pro features clearly marked and disabled

### Security Tab
```
┌─────────────────────────────────────────────────────────┐
│ Security Settings                                       │
├─────────────────────────────────────────────────────────┤
│ [Change Password]                                       │
│                                                         │
│ Two-Factor Authentication:                              │
│ ⚠️ Status: Disabled                      [Enable 2FA]   │
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

**✅ Implemented Security:**
- **Password Change** - Modal dialog with current/new/confirm password fields
- **2FA Status** - Shows disabled status with enable button
- **Session Management** - Lists active sessions with device/browser info
- **Session Controls** - Individual revoke buttons and revoke all option
- **Visual Indicators** - Icons for different device types

---

## 🎨 UI Component Implementation Status

### Design System
**✅ Fully Implemented:**
- **Colors**: Primary Blue (#3B82F6), Secondary Gray, Success Green, Warning Yellow, Danger Red
- **Typography**: Inter font family with proper font weights
- **Spacing**: Consistent 4px, 8px, 16px, 24px, 32px scale
- **Border Radius**: 4px (small), 8px (medium), 12px (large)

### Status Indicators
**✅ Implemented Icons:**
```
🟢 Healthy/Normal    🟡 Warning/Medium    🔴 Critical/High
✅ Success/Complete  ⚙️ Processing/Load   ❌ Error/Failed
🔵 Info/Default      🟠 Alert/Attention  ⚪ Disabled/N/A
```

### Interactive Elements
**✅ Implemented Components:**
- **Buttons** - All variants (default, outline, ghost, secondary, destructive) with hover/active states
- **Form Fields** - Focus states, validation states, error handling
- **Cards** - Hover effects, shadows, proper spacing
- **Dropdowns** - Custom dropdown menus with proper keyboard navigation
- **Loading States** - Skeleton loaders, spinners, progress bars

### Component Library Status
**✅ Fully Implemented:**
- Button with all variants
- Card with header, content, footer
- Input with validation states
- Label with proper accessibility
- Select with dropdown functionality
- File Upload with drag & drop
- Progress bars and loading indicators
- Confirmation dialogs
- Navigation components (Header, Sidebar)

---

## 🚀 Technical Implementation

### State Management
**✅ Implemented:**
- **Authentication**: React Context for user state and auth actions
- **Server State**: React Query for API data caching and synchronization
- **Form State**: React Hook Form with Zod validation schemas
- **Component State**: useState for local UI state management

### API Integration
**✅ Implemented Endpoints:**
- **Authentication**: Login, register, logout, profile updates
- **Organizations**: List organizations
- **Datasets**: Get dinsight datasets, monitoring datasets, feature datasets
- **Analysis**: Save config, get config, run anomaly detection
- **Features**: Get feature data, sample metadata
- **File Upload**: Upload files, track processing status

### Performance Optimizations
**✅ Implemented:**
- **Code Splitting**: Dynamic imports for Plotly.js to avoid SSR issues
- **Loading States**: Skeleton loading for better perceived performance
- **Error Boundaries**: Graceful error handling throughout the app
- **React Query**: Intelligent caching and background refetching

### Accessibility
**✅ Implemented:**
- **ARIA Labels**: Screen reader support throughout
- **Keyboard Navigation**: Proper tab order and keyboard shortcuts
- **Form Validation**: Clear error messages and validation states
- **Focus Management**: Proper focus handling in modals and dropdowns

---

## 📊 Real Data Integration Status

### ✅ Pages Using Real API Data:
1. **Dashboard** - Organizations count, configuration status, real-time data
2. **Data Summary** - File upload, processing status, configuration saving
3. **Visualization** - Real dinsight datasets, actual coordinate plotting
4. **Analysis** - Real anomaly detection, monitoring data, threshold calculations
5. **Features** - Actual feature data (f_0 to f_1023), metadata display
6. **Settings** - User profile data, preference saving

### ✅ Removed Mock Data:
- All fake recent activity data
- Mock machine health data
- Placeholder organization information
- Sample notification data (kept for UI demonstration)

### ✅ API Endpoints Integrated:
- `api.organizations.list()` - Dashboard organization count
- `api.analysis.getConfig()` - Configuration status
- `api.analysis.saveConfig()` - Save analysis configuration
- `api.datasets.getDinsightDatasets()` - Visualization and analysis
- `api.datasets.getMonitoringDatasets()` - Anomaly detection
- `api.analysis.runAnomalyDetection()` - Anomaly detection results
- `api.features.getDatasets()` - Feature explorer
- `api.features.getFeatureData()` - Raw feature visualization
- `api.users.updateProfile()` - Settings profile updates

---

## 🎯 Completion Status

### ✅ Fully Implemented Pages:
- **Authentication** (Login, Register) - 100% complete
- **Dashboard Home** - 100% complete with real data
- **Data Summary/Upload** - 100% complete with full workflow
- **Visualization** - 100% complete with Plotly integration
- **Anomaly Detection** - 100% complete with real calculations
- **Feature Explorer** - 100% complete with raw data visualization
- **Settings** - 100% complete with profile management

### ✅ Component Library:
- All UI components implemented and styled
- Responsive design across all breakpoints
- Loading states and error handling
- Form validation and user feedback

---

## 👤 Profile Page (`/dashboard/profile`)

### Personal Information Section
```
┌─────────────────────────────────────────────────────────┐
│ 👤 Profile Information                                  │
│    Manage your personal information and preferences     │
├─────────────────────────────────────────────────────────┤
│ Personal Information                                    │
│ Full Name:     [John Doe                          ]    │
│ Email:         [john.doe@example.com              ]    │
│ Role:          [User           ▼]                      │
│ Organization:  ACME Manufacturing                       │
│                                                         │
│ Preferences                                            │
│ Theme:         [Auto           ▼] (Light/Dark/Auto)    │
│ Language:      [English        ▼]                      │
│ Timezone:      [America/New_York ▼]                    │
│ Items/Page:    [50             ▼]                      │
│ □ Show Advanced Features                               │
│                                                         │
│                [Update Profile] [Reset Changes]        │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Profile Page:**
- **Consistent with Settings** - Exactly matches Settings/Profile tab layout and functionality
- **Personal information** - Full name, email, role selection, organization display
- **User preferences** - Theme, language, timezone, items per page, advanced features toggle
- **Auto-detection** - Timezone detection with Intl.DateTimeFormat
- **Form validation** - Required field validation and proper data types
- **State management** - Local state with proper update handling
- **Visual consistency** - Same styling as Settings page with Tabs, Avatar, Alert components

---

## ⚙️ Settings Page (`/dashboard/settings`)

### Three-Tab Settings Interface
```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                             │
│    Manage your account preferences and configuration    │
├─────────────────────────────────────────────────────────┤
│ [Profile] [Notifications] [Security]                   │
├─────────────────────────────────────────────────────────┤
│ Profile Tab (Active):                                  │
│                                                         │
│ Personal Information                                    │
│ Full Name:     [John Doe                          ]    │
│ Email:         [john.doe@example.com] ✓ Verified      │
│ Role:          User (Assigned by organization admin)   │
│ Organization:  ACME Manufacturing                       │
│                                                         │
│ Preferences                                            │
│ Theme:         [Auto           ▼] (Light/Dark/Auto)    │
│ Language:      [English        ▼]                      │
│ Timezone:      [America/New_York ▼] (Auto-detected)    │
│ Items/Page:    [50             ▼]                      │
│ □ Show Advanced Features                               │
│                                                         │
│                [Save Changes] [No Changes]             │
└─────────────────────────────────────────────────────────┘
```

### Notifications Tab
```
┌─────────────────────────────────────────────────────────┐
│ Notification Preferences                                │
│ Choose how you want to receive notifications and alerts│
├─────────────────────────────────────────────────────────┤
│ Communication                                          │
│ ☑ Email notifications        ☐ SMS notifications      │
│                                                         │
│ Alert Types                                            │
│ ☑ Anomaly detection alerts   ☐ System updates         │
│ ☑ Weekly reports                                       │
└─────────────────────────────────────────────────────────┘
```

### Security Tab
```
┌─────────────────────────────────────────────────────────┐
│ 🛡️ Password & Security                                  │
│    Manage your password and security settings          │
├─────────────────────────────────────────────────────────┤
│ [Change Password]                                      │
│                                                         │
│ Two-Factor Authentication                              │
│ ⚠️ 2FA Disabled                          [Enable 2FA] │
│    Enable two-factor authentication for enhanced...    │
│                                                         │
│ Active Sessions                                        │
│ 🖥️ Current Session        |  Current                   │
│    Chrome on macOS        |                            │
│    Last active: Just now  |                            │
│                                                         │
│ 📱 Mobile Session         |  [Revoke]                  │
│    Safari on iPhone       |                            │
│    Last active: 2 hours   |                            │
│                                                         │
│                          [Revoke All Sessions]         │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Settings (Actual):**
- **Three-tab interface** - Profile, Notifications, Security only (NO Privacy tab)
- **Profile tab** - Personal info (full name, email with verification badge, read-only role/org), preferences (theme, language, timezone with auto-detection, items per page, advanced features checkbox)
- **Notifications tab** - Communication settings (email/SMS toggles), alert types (anomaly detection, system updates, weekly reports)
- **Security tab** - Password change dialog, 2FA status (currently disabled), active sessions management with revoke functionality
- **NO API Keys** - API key management is NOT implemented
- **NO Privacy tab** - Privacy settings are NOT implemented  
- **Form controls** - Controlled inputs with proper state management and change detection
- **Save functionality** - Dynamic save button that only enables when changes are detected
- **Glass morphism styling** - Consistent with dashboard design system

---

## 🔍 User Session Management

### Active Sessions Display
```
┌─────────────────────────────────────────────────────────┐
│ 🔒 Active Sessions                                      │
│    Monitor and manage your login sessions              │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🖥️ Current Session                                  │ │
│ │    Location: New York, US                           │ │
│ │    Device: Chrome on macOS                          │ │
│ │    Last Active: Just now                            │ │
│ │    IP: 192.168.1.100                                │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📱 Mobile Session                                   │ │
│ │    Location: New York, US                           │ │
│ │    Device: Safari on iPhone                         │ │
│ │    Last Active: 2 hours ago                         │ │
│ │    [Revoke Session]                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                      [Revoke All Sessions]             │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Session Management:**
- **Real-time session tracking** - Shows current and historical sessions with proper state
- **Session details** - Location, device, browser, last activity, IP address display
- **Security actions** - Individual session revocation and bulk revoke all functionality
- **Current session identification** - Highlights the active session with visual indicators
- **Auto-refresh** - Updates session information automatically via useQuery
- **Database integration** - Stores and retrieves session data from user_sessions table

---

## 📊 Data Visualization Pages

### Visualization Page (`/dashboard/visualization`)
```
┌─────────────────────────────────────────────────────────┐
│ 📈 Data Comparison & Visualization                      │
│    Interactive comparison between datasets              │
├─────────────────────────────────────────────────────────┤
│ Dataset Selection:                                      │
│ Dinsight ID: [Select Dataset ▼]                       │
│                                                         │
│ Visualization Options:                                  │
│ Point Size: [••••••○○○○] (6px)                        │
│ □ Show Contours  □ Side by Side View                  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │              Plotly.js Interactive Chart            │ │
│ │                                                     │ │
│ │    •  •    •      Baseline Data                    │ │
│ │  •      •     •   Monitoring Data                  │ │
│ │     •  •   •      Overlaid Visualization           │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [📷 Export PNG] [📊 Export SVG] [💾 Export Data]      │
└─────────────────────────────────────────────────────────┘
```

### Analysis Page (`/dashboard/analysis`)
```
┌─────────────────────────────────────────────────────────┐
│ 🔬 Anomaly Detection Analysis                           │
│    Detect anomalies using ML algorithms                │
├─────────────────────────────────────────────────────────┤
│ Dataset Selection:                                      │
│ Baseline:    [Select Dinsight Dataset ▼]              │
│ Monitoring:  [Select Monitoring Data ▼]               │
│                                                         │
│ Algorithm Settings:                                     │
│ Method: [Mahalanobis Distance ▼]                       │
│ Threshold: [Auto-detect ▼]                            │
│                                                         │
│              [🔬 Run Anomaly Detection]                │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Results: 15 anomalies detected out of 1,000 points │ │
│ │                                                     │ │
│ │ Anomaly Visualization:                              │ │
│ │   •   •     Normal Points                          │ │
│ │     🔴 🔴   Anomalies (red)                        │ │
│ │   •       • Interactive plot                       │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**✅ Implemented Visualization & Analysis:**
- **Interactive Plotly charts** - Real-time 2D scatter plots with zoom, pan, hover
- **Dynamic data loading** - Fetches dinsight data and monitoring data from APIs
- **Export functionality** - PNG, SVG, and raw data export capabilities
- **Customization options** - Point size, contours, side-by-side view modes
- **ML-powered analysis** - Mahalanobis distance anomaly detection with configurable thresholds
- **Real-time results** - Live anomaly detection with visual highlighting

---

## 🎨 Complete UI Design System

### Glass Morphism Implementation
```css
/* Core glass effect classes */
.glass-card {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.glass-sidebar {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.95);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}
```

### Color System
- **Primary gradients** - `from-primary-500 to-primary-600` (Blue)
- **Accent gradients** - Teal, purple, orange, pink for categorization
- **Status indicators** - Success (green), error (red), warning (yellow), info (blue)
- **Dark mode** - Complete theme with `dark:` prefixes and proper contrast

### Component Library
- **Cards** - Glass morphism with hover effects and proper shadows
- **Buttons** - Multiple variants (primary, outline, ghost) with animations
- **Forms** - Controlled inputs with validation states and error handling
- **Navigation** - Responsive sidebar and header with proper mobile interactions
- **Modals** - Backdrop blur with proper focus management
- **Notifications** - Toast-style with color coding and auto-dismiss

### Responsive Breakpoints
- **Mobile first** - Base styles for mobile (320px+)
- **Tablet** - `sm:` prefix (640px+)
- **Desktop** - `md:` prefix (768px+) and `lg:` prefix (1024px+)
- **Large screens** - `xl:` prefix (1280px+) and `2xl:` prefix (1536px+)

---

## ✅ Technical Foundation Update:
- **Next.js 15.4.5** with TypeScript and App Router
- **Tailwind CSS** with custom configuration and dark mode
- **Radix UI primitives** for accessible components (Avatar, Tabs, Select, etc.)
- **React Query (TanStack Query)** for data management and caching
- **React Hook Form** with Zod validation schemas
- **Plotly.js** for advanced interactive visualizations
- **Real API integration** throughout all pages and workflows
- **Authentication system** with session management and role-based access
- **Theme system** with Light/Dark/Auto modes and cross-browser compatibility

This wireframe document now comprehensively reflects the current state of the fully implemented D'insight Dashboard frontend application, showing a production-ready application with complete data analysis workflows, user management, and modern UI design patterns.