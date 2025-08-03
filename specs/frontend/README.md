# 🎨 Frontend Specification

> **Version**: 1.0.0  
> **Framework**: Next.js 14+ with TypeScript  
> **Status**: Planning

## 📋 Overview

Modern, responsive web application for predictive maintenance analytics. Replacing the legacy Streamlit dashboard with a production-ready Next.js application.

## 🛠️ Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **UI Components**: Shadcn/ui + Radix UI
- **Charts**: Plotly.js (for consistency with legacy)
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Authentication**: NextAuth.js
- **API Client**: Axios with interceptors
- **Testing**: Jest + React Testing Library
- **Build Tool**: Turbopack

## 🗂️ Project Structure

```
frontend/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Auth group routes
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/         # Dashboard group routes
│   │   ├── layout.tsx       # Dashboard layout
│   │   ├── page.tsx         # Dashboard home
│   │   ├── data-summary/
│   │   ├── visualization/
│   │   ├── analysis/
│   │   ├── features/
│   │   ├── machines/
│   │   └── settings/
│   ├── api/                 # API routes (if needed)
│   ├── layout.tsx           # Root layout
│   └── globals.css
├── components/
│   ├── ui/                  # Shadcn components
│   ├── charts/              # Chart components
│   ├── forms/               # Form components
│   └── layouts/             # Layout components
├── lib/
│   ├── api/                 # API client setup
│   ├── auth/                # Auth utilities
│   ├── hooks/               # Custom hooks
│   └── utils/               # Utility functions
├── types/                   # TypeScript types
├── public/                  # Static assets
└── tests/                   # Test files
```

## 📱 Pages & Features

### 1. Authentication Pages

#### Login Page (`/login`)
- Email/password form
- Remember me option
- Forgot password link
- Social login (future)
- Error handling with toast notifications

#### Registration Page (`/register`)
- Full name, email, password fields
- Password strength indicator
- Terms acceptance
- Optional organization code
- Email verification flow

#### Password Reset (`/forgot-password`)
- Email input for reset link
- Token validation page
- New password form

### 2. Dashboard Home (`/dashboard`)
- Overview statistics cards
- Recent analyses list
- Active alerts summary
- Quick actions panel
- Machine health status grid

### 3. Data Summary Page (`/dashboard/data-summary`)

**Features from Streamlit:**
- File upload area (drag & drop)
- Uploaded files list with metadata
- Dataset statistics display
- Data validation results
- Quick preview tables

**New Features:**
- Multi-file upload progress
- File version tracking
- Dataset comparison tool
- Export functionality

### 4. Visualization Page (`/dashboard/visualization`)

**Core Visualizations:**
- **Scatter Plot**: Interactive 2D/3D plots with Plotly
- **Distribution Charts**: Histograms and density plots
- **Time Series**: Trending data over time
- **Heatmaps**: Feature correlation matrices

**Controls:**
- Dataset selection dropdown
- Plot type switcher
- Axis variable selectors
- Color scheme picker
- Export options (PNG, SVG, CSV)

**Advanced Features:**
- Side-by-side comparison mode
- Annotation tools
- Zoom/pan controls
- Fullscreen mode

### 5. Advanced Analysis Page (`/dashboard/analysis`)

**Anomaly Detection Section:**
- Mahalanobis Distance calculator
- Threshold configuration slider
- Sensitivity controls
- Real-time detection status
- Anomaly visualization overlay

**Configuration Panel:**
- Algorithm parameters
- Optimizer selection
- Learning rate adjustment
- Dimension settings
- Save/load configurations

**Results Display:**
- Anomaly count badges
- Severity distribution
- Feature importance chart
- Export analysis report

### 6. Feature Analysis Page (`/dashboard/features`)

**Feature Explorer:**
- Feature list with search
- Value distribution charts
- Statistical summaries
- Correlation matrix
- Feature importance ranking

**Sample Navigator:**
- Sample selection grid
- Feature values table
- Metadata display
- Comparison tools

### 7. Machine Management (`/dashboard/machines`)

**Machine List View:**
- Grid/list toggle
- Status indicators
- Last analysis timestamp
- Quick actions menu
- Search and filters

**Machine Detail View:**
- Information card
- Analysis history
- Health metrics
- Alert configuration
- Maintenance schedule

### 8. Settings Page (`/dashboard/settings`)

**User Settings:**
- Profile information
- Password change
- Notification preferences
- API key management

**Organization Settings:**
- Organization details
- User management
- Billing information
- Usage statistics

## 🎨 UI Components

### Core Components

#### FileUpload
```typescript
interface FileUploadProps {
  accept: string
  multiple: boolean
  maxSize: number
  onUpload: (files: File[]) => void
  onProgress: (progress: number) => void
}
```

#### DataTable
```typescript
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  pagination: boolean
  sorting: boolean
  filtering: boolean
  onRowClick?: (row: T) => void
}
```

#### Chart
```typescript
interface ChartProps {
  type: 'scatter' | 'line' | 'bar' | 'heatmap'
  data: PlotlyData[]
  layout: Partial<Layout>
  config?: Partial<Config>
  onExport?: (format: string) => void
}
```

#### AlertDialog
```typescript
interface AlertDialogProps {
  severity: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  onAcknowledge?: () => void
}
```

### Layout Components

#### DashboardLayout
- Responsive sidebar navigation
- Header with user menu
- Breadcrumb navigation
- Mobile-friendly drawer

#### PageHeader
- Title and description
- Action buttons
- Filter/search bar
- View toggle buttons

## 🔄 State Management

### Global State (Zustand)
```typescript
interface AppState {
  user: User | null
  organization: Organization | null
  machines: Machine[]
  activeDataset: Dataset | null
  theme: 'light' | 'dark' | 'system'
}
```

### Server State (React Query)
- Automatic caching
- Background refetching
- Optimistic updates
- Infinite queries for lists

## 🔒 Authentication Flow

1. **JWT Storage**: Secure httpOnly cookies
2. **Token Refresh**: Automatic refresh before expiry
3. **Protected Routes**: Middleware-based protection
4. **Role-Based Access**: Component-level permissions

## 🎯 Performance Requirements

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse Score**: > 90
- **Bundle Size**: < 200KB initial

## 📱 Responsive Design

### Breakpoints
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

### Mobile Optimizations
- Touch-friendly controls
- Swipe gestures for charts
- Collapsible panels
- Bottom sheet modals

## ♿ Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

## 🌍 Internationalization

- English (primary)
- Spanish (planned)
- German (planned)
- Date/time localization
- Number formatting

## 🧪 Testing Strategy

### Unit Tests
- Component logic
- Custom hooks
- Utility functions
- API client methods

### Integration Tests
- Page flows
- API interactions
- State management
- Form submissions

### E2E Tests
- Critical user journeys
- Authentication flow
- File upload process
- Chart interactions

## 🚀 Deployment

### Environment Variables
```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

### Build Process
1. Type checking
2. Linting
3. Unit tests
4. Build optimization
5. Bundle analysis

### Hosting
- Vercel (recommended)
- AWS Amplify
- Netlify
- Self-hosted Node.js