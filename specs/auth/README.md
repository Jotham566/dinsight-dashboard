# 🔐 Authentication & Authorization Specification

> **Version**: 1.0.0  
> **Status**: To Be Implemented  
> **Security Standard**: OWASP 2023

## 📋 Overview

Comprehensive authentication and authorization system for the DInsight platform using JWT tokens, role-based access control (RBAC), and organization-based multi-tenancy.

## 🏗️ Architecture

### Authentication Flow
```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌──────────┐
│ Client  │─────►│   API    │─────►│  Auth   │─────►│ Database │
│ (React) │◄─────│ Gateway  │◄─────│ Service │◄─────│   (PG)   │
└─────────┘      └──────────┘      └─────────┘      └──────────┘
     │                                    │
     │            ┌──────────┐           │
     └───────────►│   JWT    │◄──────────┘
                  │ Tokens   │
                  └──────────┘
```

### Token Strategy
- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: Long-lived (7 days)
- **Storage**: httpOnly cookies (secure)
- **Algorithm**: RS256 (asymmetric)

## 🔑 Authentication Endpoints

### User Registration

**Endpoint**: `POST /api/v1/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "organization_code": "ACME-2024" // optional
}
```

**Validation Rules**:
- Email: Valid format, unique
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Full name: Min 2 chars, max 255 chars

**Response**:
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user_id": "uuid"
}
```

**Process**:
1. Validate input data
2. Check email uniqueness
3. Hash password (bcrypt, cost 12)
4. Create user record
5. Send verification email
6. Create audit log entry

### Email Verification

**Endpoint**: `POST /api/v1/auth/verify-email`

**Request Body**:
```json
{
  "token": "verification_token_from_email"
}
```

**Process**:
1. Validate token (expires in 24 hours)
2. Mark user as verified
3. Send welcome email
4. Auto-login if within 5 minutes

### User Login

**Endpoint**: `POST /api/v1/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "remember_me": true
}
```

**Response**:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "organizations": [
      {
        "id": "uuid",
        "name": "ACME Corp",
        "role": "admin"
      }
    ]
  }
}
```

**Security Measures**:
- Rate limiting: 5 attempts per 15 minutes
- Account lockout after 10 failed attempts
- CAPTCHA after 3 failed attempts
- Log all login attempts

### Token Refresh

**Endpoint**: `POST /api/v1/auth/refresh`

**Request Headers**:
```
Cookie: refresh_token=eyJhbGc...
```

**Response**:
```json
{
  "access_token": "eyJhbGc...",
  "expires_in": 900
}
```

**Process**:
1. Validate refresh token
2. Check token hasn't been revoked
3. Issue new access token
4. Optionally rotate refresh token

### Logout

**Endpoint**: `POST /api/v1/auth/logout`

**Request Headers**:
```
Authorization: Bearer eyJhbGc...
Cookie: refresh_token=eyJhbGc...
```

**Process**:
1. Revoke refresh token
2. Clear cookies
3. Create audit log entry

### Password Reset Request

**Endpoint**: `POST /api/v1/auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Process**:
1. Validate email exists
2. Generate reset token (expires in 1 hour)
3. Send reset email
4. Same response regardless of email existence (security)

### Password Reset Confirmation

**Endpoint**: `POST /api/v1/auth/reset-password`

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

**Process**:
1. Validate reset token
2. Validate new password
3. Hash and update password
4. Revoke all refresh tokens
5. Send confirmation email

## 🛡️ Authorization System

### Role Hierarchy

```
Super Admin
    │
    ├── Organization Owner
    │       │
    │       ├── Organization Admin
    │       │       │
    │       │       ├── Organization Member
    │       │       │
    │       │       └── Organization Viewer
    │       │
    │       └── Machine Operator
    │
    └── System Admin
```

### Permission Matrix

| Resource | Viewer | Member | Operator | Admin | Owner | Super Admin |
|----------|--------|--------|----------|-------|-------|-------------|
| View Dashboards | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Upload Data | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Run Analysis | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Machines | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Manage Alerts | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Manage Users | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Manage Organization | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| System Administration | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Resource-Based Permissions

```go
type Permission struct {
    Resource string   // "machine", "analysis", "alert"
    Action   string   // "create", "read", "update", "delete"
    Scope    string   // "own", "organization", "all"
}
```

### Middleware Implementation

```go
// RequireAuth - Validates JWT token
func RequireAuth() gin.HandlerFunc

// RequireRole - Checks user has minimum role
func RequireRole(minRole string) gin.HandlerFunc

// RequirePermission - Checks specific permission
func RequirePermission(resource, action string) gin.HandlerFunc

// RequireOwnership - Checks resource ownership
func RequireOwnership(resourceType string) gin.HandlerFunc
```

## 🔒 Security Measures

### Password Security
- Hashing: bcrypt with cost factor 12
- Minimum requirements enforced
- Password history (prevent reuse of last 5)
- Expiry: 90 days for sensitive environments

### Token Security
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry (30 days with remember_me)
- Token rotation on refresh
- Revocation list for compromised tokens

### Session Management
- Concurrent session limit: 5 devices
- Session timeout: 30 minutes of inactivity
- Force logout on password change
- Device tracking and management

### Rate Limiting
```yaml
Endpoints:
  /auth/login: 5 per 15 minutes per IP
  /auth/register: 3 per hour per IP
  /auth/forgot-password: 3 per hour per IP
  /api/*: 100 per minute per user
  File uploads: 10 per hour per user
```

### Multi-Factor Authentication (MFA)
- TOTP (Time-based One-Time Password)
- Backup codes (10 single-use codes)
- Optional SMS (not recommended)
- Mandatory for admin roles

### API Key Authentication
For machine-to-machine communication:
```
Authorization: ApiKey sk_live_abc123...
```

- Scoped permissions
- IP whitelist optional
- Expiry dates
- Usage tracking

## 🌍 OAuth2 Integration (Future)

### Supported Providers
- Google
- Microsoft/Azure AD
- GitHub
- SAML 2.0 for enterprise

### OAuth Flow
1. Redirect to provider
2. Handle callback
3. Create/link user account
4. Issue JWT tokens

## 📊 Audit & Compliance

### Audit Events
- User registration
- Login attempts (success/failure)
- Password changes
- Permission changes
- Data access
- Configuration changes

### Compliance Features
- GDPR: Data export, right to deletion
- SOC 2: Audit trails, encryption
- HIPAA: Additional encryption, access logs
- ISO 27001: Security policies, risk assessment

### Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

## 🚨 Incident Response

### Account Compromise
1. Immediate token revocation
2. Force password reset
3. Email notification
4. Audit log review
5. Optional: Freeze account

### Breach Detection
- Unusual login patterns
- Impossible travel detection
- Multiple failed attempts
- Privilege escalation attempts
- API key abuse

## 🧪 Testing Strategy

### Security Testing
- OWASP ZAP scanning
- Penetration testing
- JWT token manipulation tests
- SQL injection tests
- XSS prevention tests

### Unit Tests
- Password hashing
- Token generation/validation
- Permission checks
- Rate limiting

### Integration Tests
- Full auth flows
- Token refresh cycles
- Multi-org access
- Role transitions