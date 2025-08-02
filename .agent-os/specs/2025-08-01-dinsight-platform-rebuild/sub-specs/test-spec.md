# Test Specification

This is the test specification for the spec detailed in @.agent-os/specs/2025-08-01-dinsight-platform-rebuild/spec.md

> Created: 2025-08-01  
> Version: 1.0.0

## Testing Overview

This specification outlines the comprehensive testing strategy for the Dinsight platform rebuild, ensuring quality, reliability, and maintainability across both backend and frontend components.

### Testing Philosophy
- **Quality First**: Testing is integrated into the development process, not an afterthought
- **Pyramid Approach**: More unit tests, fewer integration tests, minimal E2E tests
- **Automated Testing**: Continuous integration runs all tests automatically
- **TDD/BDD Support**: Test-driven and behavior-driven development practices

### Testing Stack
- **Backend Testing**: Go testing framework, Testify, TestContainers
- **Frontend Testing**: Jest, React Testing Library, Playwright
- **API Testing**: Postman/Newman, REST Client
- **Performance Testing**: Artillery, k6
- **Security Testing**: OWASP ZAP, Snyk

## Test Strategy

### Testing Pyramid Distribution
```
        /\
       /  \
      / E2E \     10% - End-to-End Tests
     /______\
    /        \
   /Integration\ 20% - Integration Tests  
  /____________\
 /              \
/   Unit Tests   \  70% - Unit Tests
/________________\
```

### Test Categories

#### Unit Tests (70%)
- **Purpose**: Test individual functions, components, and classes in isolation
- **Scope**: Business logic, utility functions, component behavior
- **Tools**: Go testing framework, Jest, React Testing Library
- **Target**: 85%+ code coverage

#### Integration Tests (20%)
- **Purpose**: Test interactions between different modules/services
- **Scope**: API endpoints, database operations, external service integrations
- **Tools**: Testify, TestContainers, Jest with MSW
- **Target**: All critical user paths covered

#### End-to-End Tests (10%)
- **Purpose**: Test complete user workflows in production-like environment
- **Scope**: Critical business processes, user journeys
- **Tools**: Playwright, Cypress
- **Target**: All primary user workflows

## Backend Testing Strategy

### Unit Testing Framework
```go
// Example unit test structure
package service_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "dinsight-api/internal/service"
)

// Mock interfaces
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) CreateUser(user *model.User) error {
    args := m.Called(user)
    return args.Error(0)
}

// Test implementation
func TestUserService_CreateUser(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    userService := service.NewUserService(mockRepo)
    
    user := &model.User{
        Email:     "test@example.com",
        FirstName: "John",
        LastName:  "Doe",
    }
    
    mockRepo.On("CreateUser", user).Return(nil)
    
    // Act
    err := userService.CreateUser(user)
    
    // Assert
    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
}

func TestUserService_CreateUser_DuplicateEmail(t *testing.T) {
    // Test error scenarios
    mockRepo := new(MockUserRepository)
    userService := service.NewUserService(mockRepo)
    
    user := &model.User{Email: "duplicate@example.com"}
    
    mockRepo.On("CreateUser", user).Return(errors.New("email already exists"))
    
    err := userService.CreateUser(user)
    
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "email already exists")
}
```

### Integration Testing
```go
// Database integration test example
func TestUserRepository_Integration(t *testing.T) {
    // Setup test database using TestContainers
    ctx := context.Background()
    postgres, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image:        "postgres:14",
            ExposedPorts: []string{"5432/tcp"},
            Env: map[string]string{
                "POSTGRES_DB":       "testdb",
                "POSTGRES_PASSWORD": "password",
                "POSTGRES_USER":     "testuser",
            },
            WaitingFor: wait.ForLog("database system is ready to accept connections"),
        },
        Started: true,
    })
    require.NoError(t, err)
    defer postgres.Terminate(ctx)
    
    // Get database connection
    host, _ := postgres.Host(ctx)
    port, _ := postgres.MappedPort(ctx, "5432")
    
    dsn := fmt.Sprintf("host=%s port=%s user=testuser password=password dbname=testdb sslmode=disable", 
        host, port.Port())
    
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    require.NoError(t, err)
    
    // Run migrations
    err = db.AutoMigrate(&model.User{})
    require.NoError(t, err)
    
    // Test repository operations
    repo := repository.NewUserRepository(db)
    
    user := &model.User{
        Email:     "test@example.com",
        FirstName: "John",
        LastName:  "Doe",
    }
    
    // Test create
    err = repo.CreateUser(user)
    assert.NoError(t, err)
    assert.NotZero(t, user.ID)
    
    // Test find
    foundUser, err := repo.FindByEmail("test@example.com")
    assert.NoError(t, err)
    assert.Equal(t, user.Email, foundUser.Email)
}
```

### API Testing
```go
// HTTP handler testing
func TestAuthHandler_Login(t *testing.T) {
    // Setup
    gin.SetMode(gin.TestMode)
    router := gin.New()
    
    mockAuthService := new(MockAuthService)
    handler := handler.NewAuthHandler(mockAuthService)
    
    router.POST("/login", handler.Login)
    
    t.Run("successful login", func(t *testing.T) {
        // Arrange
        loginData := map[string]string{
            "email":    "test@example.com",
            "password": "password123",
        }
        
        expectedResponse := &auth.LoginResponse{
            User: &model.User{Email: "test@example.com"},
            Tokens: &auth.Tokens{
                AccessToken:  "access_token",
                RefreshToken: "refresh_token",
            },
        }
        
        mockAuthService.On("Login", "test@example.com", "password123").
            Return(expectedResponse, nil)
        
        // Act
        jsonData, _ := json.Marshal(loginData)
        req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
        req.Header.Set("Content-Type", "application/json")
        
        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)
        
        // Assert
        assert.Equal(t, http.StatusOK, w.Code)
        
        var response map[string]interface{}
        json.Unmarshal(w.Body.Bytes(), &response)
        
        assert.True(t, response["success"].(bool))
        assert.Contains(t, response, "data")
    })
    
    t.Run("invalid credentials", func(t *testing.T) {
        loginData := map[string]string{
            "email":    "test@example.com",
            "password": "wrongpassword",
        }
        
        mockAuthService.On("Login", "test@example.com", "wrongpassword").
            Return(nil, errors.New("invalid credentials"))
        
        jsonData, _ := json.Marshal(loginData)
        req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
        req.Header.Set("Content-Type", "application/json")
        
        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)
        
        assert.Equal(t, http.StatusUnauthorized, w.Code)
    })
}
```

### Performance Testing
```go
// Benchmark testing
func BenchmarkDataProcessor_ProcessLargeDataset(b *testing.B) {
    processor := processor.NewDataProcessor()
    
    // Create large test dataset
    data := make([][]float64, 10000)
    for i := range data {
        data[i] = make([]float64, 50)
        for j := range data[i] {
            data[i][j] = rand.Float64()
        }
    }
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        _, err := processor.ProcessData(data)
        if err != nil {
            b.Fatal(err)
        }
    }
}

func BenchmarkDatabaseOperations(b *testing.B) {
    db := setupTestDB()
    repo := repository.NewFileUploadRepository(db)
    
    b.Run("BulkInsert", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            files := generateTestFiles(1000)
            err := repo.BulkInsert(files)
            if err != nil {
                b.Fatal(err)
            }
        }
    })
    
    b.Run("ComplexQuery", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _, err := repo.FindWithFilters(repository.FileFilters{
                UserID:    1,
                Status:    "completed",
                ProjectName: "test-project",
                Limit:     100,
            })
            if err != nil {
                b.Fatal(err)
            }
        }
    })
}
```

## Frontend Testing Strategy

### Component Unit Testing
```typescript
// React component testing with React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/features/auth/LoginForm'

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders all form fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  it('displays loading state during submission', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />)
    
    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
```

### Hook Testing
```typescript
// Custom hook testing
import { renderHook, act } from '@testing-library/react'
import { useFileUpload } from '@/hooks/useFileUpload'
import * as filesApi from '@/lib/api/files'

jest.mock('@/lib/api/files')
const mockFilesApi = filesApi as jest.Mocked<typeof filesApi>

describe('useFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useFileUpload())
    
    expect(result.current.isUploading).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe(null)
    expect(result.current.uploadedFiles).toEqual([])
  })

  it('handles successful file upload', async () => {
    const mockFiles = [
      new File(['content'], 'test.csv', { type: 'text/csv' })
    ]
    
    const mockResponse = {
      data: {
        files: [{ id: 1, originalFileName: 'test.csv', status: 'uploaded' }]
      }
    }
    
    mockFilesApi.upload.mockResolvedValue(mockResponse)
    
    const { result } = renderHook(() => useFileUpload())
    
    await act(async () => {
      await result.current.uploadFiles(mockFiles)
    })
    
    expect(result.current.isUploading).toBe(false)
    expect(result.current.uploadedFiles).toHaveLength(1)
    expect(result.current.error).toBe(null)
  })

  it('handles upload error', async () => {
    const mockFiles = [new File(['content'], 'test.csv')]
    const errorMessage = 'Upload failed'
    
    mockFilesApi.upload.mockRejectedValue(new Error(errorMessage))
    
    const { result } = renderHook(() => useFileUpload())
    
    await act(async () => {
      try {
        await result.current.uploadFiles(mockFiles)
      } catch (error) {
        // Expected error
      }
    })
    
    expect(result.current.isUploading).toBe(false)
    expect(result.current.error).toBe(errorMessage)
  })
})
```

### Chart Component Testing
```typescript
// Chart component testing
import { render, screen } from '@testing-library/react'
import { ScatterPlot } from '@/components/features/charts/ScatterPlot'

const mockData = [
  { x: 1, y: 2, id: '1', isAnomaly: false },
  { x: 3, y: 4, id: '2', isAnomaly: true },
  { x: 5, y: 6, id: '3', isAnomaly: false }
]

describe('ScatterPlot', () => {
  it('renders chart with data points', () => {
    render(<ScatterPlot data={mockData} />)
    
    expect(screen.getByText('Data Scatter Plot')).toBeInTheDocument()
    expect(screen.getByText('Showing 3 of 3 points')).toBeInTheDocument()
  })

  it('displays anomaly legend when showAnomalies is true', () => {
    render(<ScatterPlot data={mockData} showAnomalies={true} />)
    
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('Anomaly')).toBeInTheDocument()
    expect(screen.getByText('Anomalies: 1')).toBeInTheDocument()
  })

  it('calls onPointClick when point is clicked', async () => {
    const mockOnPointClick = jest.fn()
    render(
      <ScatterPlot 
        data={mockData} 
        onPointClick={mockOnPointClick}
      />
    )
    
    // Simulate chart point click (would need to mock Recharts)
    // This test would require more sophisticated mocking of the chart library
  })
})
```

## Integration Testing

### API Integration Tests
```typescript
// Frontend API integration testing with MSW
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/lib/auth/providers'
import { Dashboard } from '@/app/dashboard/page'

const server = setupServer(
  rest.get('/api/v1/files', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        files: [
          { id: 1, originalFileName: 'test.csv', status: 'completed' }
        ],
        pagination: { page: 1, total: 1 }
      }
    }))
  }),
  
  rest.post('/api/v1/analysis/start', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: { jobId: 'job_123' }
    }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Dashboard Integration', () => {
  it('loads files and allows analysis', async () => {
    const user = userEvent.setup()
    
    render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    )
    
    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument()
    })
    
    // Select file and start analysis
    const fileSelect = screen.getByDisplayValue('Choose a file to analyze')
    await user.click(fileSelect)
    await user.click(screen.getByText('test.csv'))
    
    const analyzeButton = screen.getByText('Start Analysis')
    await user.click(analyzeButton)
    
    // Verify analysis started
    await waitFor(() => {
      expect(screen.getByText('Analyzing...')).toBeInTheDocument()
    })
  })
})
```

### Database Integration Tests
```typescript
// Database integration testing
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

describe('Database Integration', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    // Setup test database
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db'
    
    // Run migrations
    execSync('npx prisma migrate deploy', { 
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    })
    
    prisma = new PrismaClient()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean database before each test
    await prisma.$transaction([
      prisma.monitorData.deleteMany(),
      prisma.dinsightData.deleteMany(),
      prisma.fileUploads.deleteMany(),
      prisma.users.deleteMany()
    ])
  })

  it('creates user with file uploads', async () => {
    // Create user
    const user = await prisma.users.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe'
      }
    })

    // Create file upload
    const fileUpload = await prisma.fileUploads.create({
      data: {
        userId: user.id,
        originalFileName: 'test.csv',
        fileSize: 1024,
        status: 'completed'
      }
    })

    // Verify relationships
    const userWithFiles = await prisma.users.findUnique({
      where: { id: user.id },
      include: { fileUploads: true }
    })

    expect(userWithFiles?.fileUploads).toHaveLength(1)
    expect(userWithFiles?.fileUploads[0].originalFileName).toBe('test.csv')
  })
})
```

## End-to-End Testing

### User Journey Tests
```typescript
// Playwright E2E tests
import { test, expect } from '@playwright/test'

test.describe('Complete Analytics Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login before each test
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('user can upload file and perform analysis', async ({ page }) => {
    // Navigate to analytics page
    await page.click('[data-testid="nav-analytics"]')
    await expect(page).toHaveURL('/dashboard/analytics')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/sample-data.csv')

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
      timeout: 10000
    })

    // Select uploaded file
    await page.selectOption('[data-testid="file-select"]', { 
      label: 'sample-data.csv' 
    })

    // Start analysis
    await page.click('[data-testid="start-analysis-button"]')

    // Wait for analysis to complete
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({
      timeout: 30000
    })

    // Verify scatter plot is displayed
    await expect(page.locator('[data-testid="scatter-plot"]')).toBeVisible()

    // Test chart interactions
    await page.hover('[data-testid="chart-container"] circle:first-child')
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible()

    // Switch to data table view
    await page.click('[data-testid="tab-data"]')
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible()

    // Verify data in table
    const rows = page.locator('[data-testid="table-row"]')
    await expect(rows).toHaveCount.greaterThan(0)
  })

  test('user can perform monitoring workflow', async ({ page }) => {
    await page.goto('/dashboard/monitoring')

    // Upload baseline data
    await page.click('[data-testid="upload-baseline-button"]')
    const baselineInput = page.locator('[data-testid="baseline-file-input"]')
    await baselineInput.setInputFiles('tests/fixtures/baseline-data.csv')

    await expect(page.locator('[data-testid="baseline-upload-success"]')).toBeVisible()

    // Upload monitoring data
    await page.click('[data-testid="upload-monitoring-button"]')
    const monitoringInput = page.locator('[data-testid="monitoring-file-input"]')
    await monitoringInput.setInputFiles('tests/fixtures/monitoring-data.csv')

    await expect(page.locator('[data-testid="monitoring-upload-success"]')).toBeVisible()

    // Configure monitoring settings
    await page.fill('[data-testid="sensitivity-input"]', '0.8')
    await page.selectOption('[data-testid="alert-level-select"]', 'medium')

    // Start monitoring
    await page.click('[data-testid="start-monitoring-button"]')

    // Wait for monitoring results
    await expect(page.locator('[data-testid="monitoring-results"]')).toBeVisible({
      timeout: 30000
    })

    // Verify anomaly detection results
    const anomalyCount = page.locator('[data-testid="anomaly-count"]')
    await expect(anomalyCount).toContainText(/\d+/)

    // Check alerts
    await page.click('[data-testid="alerts-tab"]')
    const alertsList = page.locator('[data-testid="alerts-list"]')
    await expect(alertsList).toBeVisible()
  })

  test('handles errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/analytics')

    // Mock API error
    await page.route('**/api/v1/analysis/start', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { message: 'Invalid file format' }
        })
      })
    })

    // Try to start analysis
    await page.selectOption('[data-testid="file-select"]', { index: 0 })
    await page.click('[data-testid="start-analysis-button"]')

    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid file format'
    )

    // Verify user can recover
    await page.click('[data-testid="dismiss-error-button"]')
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
  })
})

test.describe('Authentication Flow', () => {
  test('user can register and verify email', async ({ page }) => {
    await page.goto('/register')

    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'SecurePass123!')
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!')
    await page.fill('[data-testid="first-name-input"]', 'John')
    await page.fill('[data-testid="last-name-input"]', 'Doe')

    // Submit registration
    await page.click('[data-testid="register-button"]')

    // Verify success message
    await expect(page.locator('[data-testid="registration-success"]')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('user can reset password', async ({ page }) => {
    await page.goto('/forgot-password')

    // Request password reset
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="reset-password-button"]')

    // Verify success message
    await expect(page.locator('[data-testid="reset-email-sent"]')).toBeVisible()
  })
})
```

### Performance Testing
```typescript
// Performance testing with Playwright
import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const metrics = {}
          
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              metrics[entry.name] = entry.duration
            }
          })
          
          resolve(metrics)
        }).observe({ entryTypes: ['measure'] })
      })
    })

    // Verify performance thresholds
    expect(metrics['loadTime']).toBeLessThan(2000) // 2 seconds
  })

  test('large dataset handling', async ({ page }) => {
    await page.goto('/dashboard/analytics')

    // Upload large file
    const largeFileInput = page.locator('input[type="file"]')
    await largeFileInput.setInputFiles('tests/fixtures/large-dataset.csv')

    // Measure upload time
    const startTime = Date.now()
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
      timeout: 60000 // 1 minute timeout for large files
    })
    const uploadTime = Date.now() - startTime

    // Verify reasonable upload time (adjust based on requirements)
    expect(uploadTime).toBeLessThan(30000) // 30 seconds

    // Start analysis and measure processing time
    await page.selectOption('[data-testid="file-select"]', { index: 0 })
    await page.click('[data-testid="start-analysis-button"]')

    const analysisStartTime = Date.now()
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({
      timeout: 120000 // 2 minutes for large dataset processing
    })
    const analysisTime = Date.now() - analysisStartTime

    // Verify analysis completes in reasonable time
    expect(analysisTime).toBeLessThan(60000) // 1 minute
  })
})
```

## Security Testing

### Authentication Security Tests
```go
// Security testing for authentication
func TestAuthSecurity(t *testing.T) {
    t.Run("prevents SQL injection in login", func(t *testing.T) {
        maliciousEmail := "admin@example.com'; DROP TABLE users; --"
        
        _, err := authService.Login(maliciousEmail, "password")
        
        // Should fail gracefully, not crash
        assert.Error(t, err)
        
        // Verify users table still exists
        var count int64
        db.Model(&model.User{}).Count(&count)
        assert.Greater(t, count, int64(0))
    })
    
    t.Run("rate limits login attempts", func(t *testing.T) {
        email := "test@example.com"
        wrongPassword := "wrongpassword"
        
        // Attempt multiple failed logins
        for i := 0; i < 6; i++ {
            _, err := authService.Login(email, wrongPassword)
            assert.Error(t, err)
        }
        
        // Next attempt should be rate limited
        _, err := authService.Login(email, "correctpassword")
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "rate limit")
    })
    
    t.Run("validates JWT tokens properly", func(t *testing.T) {
        // Test with invalid token
        invalidToken := "invalid.jwt.token"
        _, err := authService.ValidateToken(invalidToken)
        assert.Error(t, err)
        
        // Test with expired token
        expiredToken := generateExpiredToken()
        _, err = authService.ValidateToken(expiredToken)
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "expired")
    })
}
```

### Input Validation Tests
```typescript
// Frontend security testing
describe('Input Security', () => {
  it('sanitizes user input to prevent XSS', () => {
    const maliciousInput = '<script>alert("XSS")</script>'
    
    render(<UserProfile description={maliciousInput} />)
    
    // Script tag should be escaped or removed
    expect(screen.queryByText(maliciousInput)).not.toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })

  it('validates file uploads strictly', async () => {
    const user = userEvent.setup()
    const mockOnUpload = jest.fn()
    
    render(<FileUploadZone onUploadComplete={mockOnUpload} />)
    
    // Try to upload executable file
    const maliciousFile = new File(['malicious content'], 'virus.exe', {
      type: 'application/x-msdownload'
    })
    
    const input = screen.getByLabelText(/file upload/i)
    await user.upload(input, maliciousFile)
    
    // Should reject non-CSV files
    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
    expect(mockOnUpload).not.toHaveBeenCalled()
  })
})
```

## Test Data Management

### Test Fixtures
```typescript
// Test data generation
export const generateTestUser = (overrides = {}) => ({
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'analyst',
  emailVerified: true,
  ...overrides
})

export const generateTestFileUpload = (overrides = {}) => ({
  originalFileName: 'test-data.csv',
  fileSize: 1024000,
  status: 'completed',
  userId: 1,
  ...overrides
})

export const generateAnalyticsData = (count = 100) => {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * 10,
    y: Math.random() * 10,
    id: `point_${i}`,
    isAnomaly: Math.random() > 0.95 // 5% anomalies
  }))
}

// CSV test data generation
export const generateCSVData = (rows = 1000, columns = 10) => {
  const headers = Array.from({ length: columns }, (_, i) => `feature_${i}`)
  const data = [headers.join(',')]
  
  for (let i = 0; i < rows; i++) {
    const row = Array.from({ length: columns }, () => 
      (Math.random() * 100).toFixed(2)
    )
    data.push(row.join(','))
  }
  
  return data.join('\n')
}
```

### Database Seeding for Tests
```go
// Test database seeding
func SeedTestDatabase(db *gorm.DB) error {
    // Create test users
    users := []model.User{
        {Email: "admin@test.com", Role: "admin", EmailVerified: true},
        {Email: "analyst@test.com", Role: "analyst", EmailVerified: true},
        {Email: "viewer@test.com", Role: "viewer", EmailVerified: true},
    }
    
    for _, user := range users {
        user.PasswordHash = hashPassword("password123")
        if err := db.Create(&user).Error; err != nil {
            return err
        }
    }
    
    // Create test file uploads
    fileUploads := []model.FileUpload{
        {
            UserID: 1,
            OriginalFileName: "baseline-data.csv",
            FileSize: 50000,
            Status: "completed",
        },
        {
            UserID: 1,
            OriginalFileName: "monitoring-data.csv", 
            FileSize: 30000,
            Status: "completed",
        },
    }
    
    for _, upload := range fileUploads {
        if err := db.Create(&upload).Error; err != nil {
            return err
        }
    }
    
    return nil
}
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Go
      uses: actions/setup-go@v3
      with:
        go-version: 1.21
    
    - name: Install dependencies
      run: cd Dinsight_API && go mod download
    
    - name: Run unit tests
      run: cd Dinsight_API && go test -v ./... -coverprofile=coverage.out
    
    - name: Run integration tests
      run: cd Dinsight_API && go test -v ./... -tags=integration
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./Dinsight_API/coverage.out

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: cd frontend && npm ci
    
    - name: Run linting
      run: cd frontend && npm run lint
    
    - name: Run unit tests
      run: cd frontend && npm test -- --coverage --watchAll=false
    
    - name: Run build test
      run: cd frontend && npm run build

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Compose
      run: docker-compose -f docker-compose.test.yml up -d
    
    - name: Install Playwright
      run: cd frontend && npx playwright install
    
    - name: Run E2E tests
      run: cd frontend && npx playwright test
    
    - name: Upload test artifacts
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: frontend/playwright-report/

  security-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run security scan
      uses: securecodewarrior/github-action-add-sarif@v1
      with:
        sarif-file: security-scan-results.sarif
    
    - name: Run dependency audit
      run: |
        cd frontend && npm audit --audit-level high
        cd Dinsight_API && go list -json -m all | nancy sleuth
```

## Test Coverage Goals

### Coverage Targets
- **Backend Unit Tests**: 85% line coverage minimum
- **Frontend Components**: 80% line coverage minimum
- **Integration Tests**: 100% of critical paths
- **E2E Tests**: 100% of primary user workflows

### Coverage Reporting
```bash
# Backend coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# Frontend coverage
npm test -- --coverage --watchAll=false
open coverage/lcov-report/index.html

# Combined coverage reporting
codecov -f coverage.out
codecov -f frontend/coverage/lcov.info
```

## Test Execution

### Local Development
```bash
# Run all backend tests
cd Dinsight_API
go test ./...

# Run specific test suite
go test ./internal/service/... -v

# Run tests with coverage
go test -cover ./...

# Run frontend tests
cd frontend
npm test

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

### Continuous Integration
```bash
# Pre-commit hook
#!/bin/sh
cd frontend && npm run lint && npm test -- --watchAll=false
cd ../Dinsight_API && go test ./... && golangci-lint run
```

---

*This test specification provides comprehensive coverage of testing strategies, tools, and implementation details for the Dinsight platform rebuild, ensuring quality and reliability throughout the development process.*
