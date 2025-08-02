# Database Schema Specification

This is the database schema specification for the spec detailed in @.agent-os/specs/2025-08-01-dinsight-platform-rebuild/spec.md

> Created: 2025-08-01  
> Version: 1.0.0

## Database Overview

The Dinsight platform uses PostgreSQL as the primary database, leveraging its advanced features including JSONB support, array types, and full-text search capabilities.

### Database Configuration
- **Database Engine**: PostgreSQL 14+
- **Connection Pool**: GORM built-in pooling
- **Character Set**: UTF-8
- **Timezone**: UTC
- **Backup Strategy**: Daily automated backups with point-in-time recovery

## Core Schema Design

### User Management Schema

#### users table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'viewer')),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP,
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

#### user_sessions table
```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for session management
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_used_at ON user_sessions(last_used_at);

-- Cleanup expired sessions
CREATE INDEX idx_user_sessions_cleanup ON user_sessions(expires_at) WHERE expires_at < NOW();
```

### Multi-Machine Management Schema

#### organizations table
```sql
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100), -- 'manufacturing', 'automotive', 'aerospace', 'energy', etc.
    country VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    settings JSONB DEFAULT '{}', -- organization-wide settings
    contact_info JSONB DEFAULT '{}', -- address, phone, etc.
    subscription_tier VARCHAR(50) DEFAULT 'basic' CHECK (
        subscription_tier IN ('basic', 'professional', 'enterprise')
    ),
    max_machines INTEGER DEFAULT 10,
    max_users INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_industry ON organizations(industry);
CREATE INDEX idx_organizations_subscription_tier ON organizations(subscription_tier);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);
```

#### user_organization_memberships table
```sql
CREATE TABLE user_organization_memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (
        role IN ('owner', 'admin', 'manager', 'analyst', 'operator', 'viewer')
    ),
    permissions JSONB DEFAULT '{}', -- specific permissions within organization
    department VARCHAR(100), -- 'maintenance', 'operations', 'quality', etc.
    can_manage_machines BOOLEAN DEFAULT FALSE,
    can_view_all_machines BOOLEAN DEFAULT FALSE,
    machine_access_list INTEGER[], -- specific machine IDs this user can access
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_org_memberships_user_id ON user_organization_memberships(user_id);
CREATE INDEX idx_user_org_memberships_org_id ON user_organization_memberships(organization_id);
CREATE INDEX idx_user_org_memberships_role ON user_organization_memberships(role);
CREATE INDEX idx_user_org_memberships_department ON user_organization_memberships(department);
```

#### production_lines table
```sql
CREATE TABLE production_lines (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255), -- physical location/building/floor
    line_type VARCHAR(100), -- 'assembly', 'packaging', 'quality_control', 'testing', etc.
    capacity_per_hour INTEGER,
    operating_schedule JSONB DEFAULT '{}', -- shift schedules, operating hours
    maintenance_schedule JSONB DEFAULT '{}', -- planned maintenance windows
    efficiency_target DECIMAL(5,2) DEFAULT 85.0, -- target efficiency percentage
    current_efficiency DECIMAL(5,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'operational' CHECK (
        status IN ('operational', 'maintenance', 'shutdown', 'commissioning')
    ),
    supervisor_user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_production_lines_org_id ON production_lines(organization_id);
CREATE INDEX idx_production_lines_name ON production_lines(name);
CREATE INDEX idx_production_lines_type ON production_lines(line_type);
CREATE INDEX idx_production_lines_status ON production_lines(status);
CREATE INDEX idx_production_lines_supervisor ON production_lines(supervisor_user_id);
CREATE INDEX idx_production_lines_deleted_at ON production_lines(deleted_at);
```

#### machine_types table
```sql
CREATE TABLE machine_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'motor', 'pump', 'conveyor', 'robot', 'sensor', 'press', etc.
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    specifications JSONB DEFAULT '{}', -- technical specifications
    default_parameters JSONB DEFAULT '{}', -- default monitoring parameters
    maintenance_intervals JSONB DEFAULT '{}', -- recommended maintenance schedules
    common_failure_modes JSONB DEFAULT '{}', -- known failure patterns
    sensor_config JSONB DEFAULT '{}', -- typical sensor configurations
    documentation_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_machine_types_name ON machine_types(name);
CREATE INDEX idx_machine_types_category ON machine_types(category);
CREATE INDEX idx_machine_types_manufacturer ON machine_types(manufacturer);
CREATE INDEX idx_machine_types_model ON machine_types(model);
```

#### machines table
```sql
CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    production_line_id INTEGER REFERENCES production_lines(id) ON DELETE SET NULL,
    machine_type_id INTEGER REFERENCES machine_types(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    asset_tag VARCHAR(100) UNIQUE,
    serial_number VARCHAR(255),
    location VARCHAR(255), -- specific location within production line
    installation_date DATE,
    commissioning_date DATE,
    warranty_expiry DATE,
    purchase_cost DECIMAL(12,2),
    operating_hours DECIMAL(10,2) DEFAULT 0,
    maintenance_status VARCHAR(50) DEFAULT 'operational' CHECK (
        maintenance_status IN ('operational', 'scheduled_maintenance', 'unscheduled_maintenance', 
                              'repair', 'breakdown', 'offline', 'decommissioned')
    ),
    health_score DECIMAL(5,2) DEFAULT 100.0 CHECK (health_score >= 0 AND health_score <= 100),
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_hours DECIMAL(8,2) DEFAULT 0,
    criticality_level VARCHAR(20) DEFAULT 'medium' CHECK (
        criticality_level IN ('low', 'medium', 'high', 'critical')
    ),
    operating_temperature_range JSONB, -- min/max operating temperatures
    specifications JSONB DEFAULT '{}',
    monitoring_parameters JSONB DEFAULT '{}', -- current monitoring configuration
    alert_thresholds JSONB DEFAULT '{}', -- anomaly detection thresholds
    baseline_data_id INTEGER, -- reference to baseline analysis
    baseline_established_at TIMESTAMP,
    responsible_technician_id INTEGER REFERENCES users(id),
    notes TEXT,
    tags VARCHAR(255)[], -- searchable tags
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_machines_org_id ON machines(organization_id);
CREATE INDEX idx_machines_production_line_id ON machines(production_line_id);
CREATE INDEX idx_machines_machine_type_id ON machines(machine_type_id);
CREATE INDEX idx_machines_asset_tag ON machines(asset_tag);
CREATE INDEX idx_machines_maintenance_status ON machines(maintenance_status);
CREATE INDEX idx_machines_health_score ON machines(health_score);
CREATE INDEX idx_machines_criticality ON machines(criticality_level);
CREATE INDEX idx_machines_responsible_technician ON machines(responsible_technician_id);
CREATE INDEX idx_machines_next_maintenance ON machines(next_maintenance_date);
CREATE INDEX idx_machines_tags ON machines USING gin(tags);
CREATE INDEX idx_machines_deleted_at ON machines(deleted_at);
```

#### machine_health_history table
```sql
CREATE TABLE machine_health_history (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    health_score DECIMAL(5,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    operating_hours DECIMAL(10,2),
    temperature DECIMAL(8,2),
    vibration DECIMAL(8,4),
    pressure DECIMAL(8,2),
    rpm DECIMAL(8,2),
    current_draw DECIMAL(8,3),
    efficiency DECIMAL(5,2),
    additional_metrics JSONB DEFAULT '{}',
    anomaly_detected BOOLEAN DEFAULT FALSE,
    anomaly_score DECIMAL(10,6),
    anomaly_details JSONB,
    maintenance_required BOOLEAN DEFAULT FALSE,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT NOW(),
    data_source VARCHAR(50) DEFAULT 'manual' CHECK (
        data_source IN ('manual', 'sensor', 'api', 'scheduled')
    )
);

CREATE INDEX idx_machine_health_machine_id ON machine_health_history(machine_id);
CREATE INDEX idx_machine_health_recorded_at ON machine_health_history(recorded_at);
CREATE INDEX idx_machine_health_status ON machine_health_history(status);
CREATE INDEX idx_machine_health_anomaly ON machine_health_history(anomaly_detected);
CREATE INDEX idx_machine_health_maintenance ON machine_health_history(maintenance_required);
CREATE INDEX idx_machine_health_score ON machine_health_history(health_score);

-- Partitioning for large datasets (optional)
-- PARTITION BY RANGE (recorded_at);
```

#### machine_maintenance_logs table
```sql
CREATE TABLE machine_maintenance_logs (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL CHECK (
        maintenance_type IN ('preventive', 'corrective', 'predictive', 'emergency', 'inspection')
    ),
    scheduled_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    duration_hours DECIMAL(6,2),
    technician_id INTEGER REFERENCES users(id),
    description TEXT NOT NULL,
    parts_replaced JSONB DEFAULT '{}',
    cost DECIMAL(10,2),
    work_order_number VARCHAR(100),
    completion_status VARCHAR(50) DEFAULT 'completed' CHECK (
        completion_status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'deferred')
    ),
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    before_health_score DECIMAL(5,2),
    after_health_score DECIMAL(5,2),
    notes TEXT,
    attachments JSONB DEFAULT '{}', -- file references
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_machine_maintenance_machine_id ON machine_maintenance_logs(machine_id);
CREATE INDEX idx_machine_maintenance_type ON machine_maintenance_logs(maintenance_type);
CREATE INDEX idx_machine_maintenance_technician ON machine_maintenance_logs(technician_id);
CREATE INDEX idx_machine_maintenance_status ON machine_maintenance_logs(completion_status);
CREATE INDEX idx_machine_maintenance_scheduled_date ON machine_maintenance_logs(scheduled_date);
CREATE INDEX idx_machine_maintenance_work_order ON machine_maintenance_logs(work_order_number);
```

### Enhanced File Management Schema

#### file_uploads table (enhanced)
```sql
-- Extend existing table with new columns
ALTER TABLE file_uploads 
ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
ADD COLUMN project_name VARCHAR(255),
ADD COLUMN description TEXT,
ADD COLUMN file_hash VARCHAR(64),
ADD COLUMN content_type VARCHAR(100),
ADD COLUMN metadata JSONB,
ADD COLUMN processing_status VARCHAR(50) DEFAULT 'uploaded' CHECK (
    processing_status IN ('uploaded', 'validating', 'processing', 'completed', 'failed')
),
ADD COLUMN validation_errors JSONB,
ADD COLUMN file_path VARCHAR(500),
ADD COLUMN preview_data JSONB,
ADD COLUMN data_type VARCHAR(50) DEFAULT 'sensor_data' CHECK (
    data_type IN ('sensor_data', 'maintenance_log', 'performance_data', 'quality_data', 'baseline', 'monitoring')
),
ADD COLUMN sampling_rate DECIMAL(8,2), -- data sampling rate in Hz
ADD COLUMN duration_seconds DECIMAL(10,2), -- duration of data collection
ADD COLUMN sensor_config JSONB DEFAULT '{}'; -- sensor configuration used

-- Update existing columns with better constraints
ALTER TABLE file_uploads 
ALTER COLUMN status SET DEFAULT 'uploaded',
ADD CONSTRAINT chk_status CHECK (status IN ('uploaded', 'processing', 'completed', 'failed'));

-- New indexes for enhanced functionality including machine association
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_organization_id ON file_uploads(organization_id);
CREATE INDEX idx_file_uploads_machine_id ON file_uploads(machine_id);
CREATE INDEX idx_file_uploads_project_name ON file_uploads(project_name);
CREATE INDEX idx_file_uploads_file_hash ON file_uploads(file_hash);
CREATE INDEX idx_file_uploads_processing_status ON file_uploads(processing_status);
CREATE INDEX idx_file_uploads_data_type ON file_uploads(data_type);
CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);
CREATE INDEX idx_file_uploads_content_type ON file_uploads(content_type);

-- Full-text search on file names and descriptions
CREATE INDEX idx_file_uploads_search ON file_uploads USING gin(
    to_tsvector('english', coalesce(original_file_name, '') || ' ' || coalesce(description, ''))
);

-- Machine-specific file organization
CREATE INDEX idx_file_uploads_machine_type ON file_uploads(machine_id, data_type, created_at);
```

#### processing_jobs table
```sql
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_upload_id INTEGER REFERENCES file_uploads(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('analysis', 'monitoring', 'export', 'validation')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
    ),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    config_data JSONB,
    result JSONB,
    error_message TEXT,
    error_details JSONB,
    estimated_duration INTEGER, -- seconds
    actual_duration INTEGER,    -- seconds
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for job processing
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_file_upload_id ON processing_jobs(file_upload_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_job_type ON processing_jobs(job_type);
CREATE INDEX idx_processing_jobs_priority ON processing_jobs(priority);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at);
CREATE INDEX idx_processing_jobs_running ON processing_jobs(status, created_at) WHERE status = 'running';
CREATE INDEX idx_processing_jobs_pending ON processing_jobs(priority, created_at) WHERE status = 'pending';
```

### Enhanced Data Analysis Schema

#### dinsight_data table (enhanced)
```sql
-- Extend existing table
ALTER TABLE dinsight_data 
ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
ADD COLUMN job_id UUID REFERENCES processing_jobs(id),
ADD COLUMN analysis_config JSONB,
ADD COLUMN quality_metrics JSONB,
ADD COLUMN processing_metadata JSONB,
ADD COLUMN coordinate_count INTEGER,
ADD COLUMN data_version INTEGER DEFAULT 1,
ADD COLUMN analysis_type VARCHAR(50) DEFAULT 'baseline' CHECK (
    analysis_type IN ('baseline', 'monitoring', 'comparison', 'trend_analysis')
),
ADD COLUMN baseline_reference_id INTEGER REFERENCES dinsight_data(id), -- for monitoring analyses
ADD COLUMN mahalanobis_threshold DECIMAL(10,6),
ADD COLUMN anomaly_count INTEGER DEFAULT 0;

-- New indexes including machine-specific access
CREATE INDEX idx_dinsight_data_user_id ON dinsight_data(user_id);
CREATE INDEX idx_dinsight_data_organization_id ON dinsight_data(organization_id);
CREATE INDEX idx_dinsight_data_machine_id ON dinsight_data(machine_id);
CREATE INDEX idx_dinsight_data_job_id ON dinsight_data(job_id);
CREATE INDEX idx_dinsight_data_file_upload_config ON dinsight_data(file_upload_id, config_id);
CREATE INDEX idx_dinsight_data_analysis_type ON dinsight_data(analysis_type);
CREATE INDEX idx_dinsight_data_baseline_ref ON dinsight_data(baseline_reference_id);
CREATE INDEX idx_dinsight_data_created_at ON dinsight_data(created_at);
CREATE INDEX idx_dinsight_data_machine_type ON dinsight_data(machine_id, analysis_type, created_at);
```

#### feature_data table (enhanced)
```sql
-- Extend existing table
ALTER TABLE feature_data 
ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
ADD COLUMN feature_statistics JSONB,
ADD COLUMN data_quality_score DECIMAL(3,2),
ADD COLUMN outlier_indices INTEGER[],
ADD COLUMN processing_notes TEXT,
ADD COLUMN feature_importance JSONB, -- feature ranking/importance scores
ADD COLUMN correlation_matrix JSONB; -- feature correlation data

-- New indexes
CREATE INDEX idx_feature_data_user_id ON feature_data(user_id);
CREATE INDEX idx_feature_data_organization_id ON feature_data(organization_id);
CREATE INDEX idx_feature_data_machine_id ON feature_data(machine_id);
CREATE INDEX idx_feature_data_quality_score ON feature_data(data_quality_score);
CREATE INDEX idx_feature_data_source_file ON feature_data(source_file_name);
CREATE INDEX idx_feature_data_machine_source ON feature_data(machine_id, source_file_name);
```

#### monitor_data table (enhanced)
```sql
-- Extend existing table
ALTER TABLE monitor_data 
ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
ADD COLUMN monitoring_session_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN anomaly_score DECIMAL(10,6),
ADD COLUMN is_anomaly BOOLEAN DEFAULT FALSE,
ADD COLUMN anomaly_type VARCHAR(50), -- 'statistical', 'threshold', 'pattern', 'drift'
ADD COLUMN confidence_score DECIMAL(3,2),
ADD COLUMN threshold_used DECIMAL(10,6),
ADD COLUMN baseline_dinsight_id INTEGER REFERENCES dinsight_data(id),
ADD COLUMN monitoring_timestamp TIMESTAMP DEFAULT NOW(),
ADD COLUMN alert_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN alert_acknowledged BOOLEAN DEFAULT FALSE,
ADD COLUMN acknowledged_by INTEGER REFERENCES users(id),
ADD COLUMN acknowledged_at TIMESTAMP,
ADD COLUMN notes TEXT;
ADD COLUMN alert_triggered BOOLEAN DEFAULT FALSE,
ADD COLUMN alert_acknowledged BOOLEAN DEFAULT FALSE,
ADD COLUMN alert_acknowledged_by INTEGER REFERENCES users(id),
ADD COLUMN alert_acknowledged_at TIMESTAMP;

-- New indexes for monitoring
CREATE INDEX idx_monitor_data_user_id ON monitor_data(user_id);
CREATE INDEX idx_monitor_data_session_id ON monitor_data(monitoring_session_id);
CREATE INDEX idx_monitor_data_anomaly ON monitor_data(is_anomaly, anomaly_score);
CREATE INDEX idx_monitor_data_alerts ON monitor_data(alert_triggered, alert_acknowledged);
CREATE INDEX idx_monitor_data_process_order ON monitor_data(dinsight_data_id, process_order);
```

### Configuration Management Schema

#### user_configs table (enhanced)
```sql
-- Replace existing config_data table with user-specific configs
CREATE TABLE user_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    parent_config_id INTEGER REFERENCES user_configs(id),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_default UNIQUE(user_id) WHERE is_default = TRUE
);

-- Indexes for configuration management
CREATE INDEX idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX idx_user_configs_public ON user_configs(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_user_configs_default ON user_configs(user_id, is_default);
CREATE INDEX idx_user_configs_usage ON user_configs(usage_count DESC);
CREATE INDEX idx_user_configs_search ON user_configs USING gin(
    to_tsvector('english', name || ' ' || coalesce(description, ''))
);

-- Keep original config_data table for backward compatibility, mark as deprecated
ALTER TABLE config_data ADD COLUMN deprecated BOOLEAN DEFAULT TRUE;
```

### Project and Organization Schema

#### projects table
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    file_count INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_project_name UNIQUE(user_id, name)
);

-- Indexes for project management
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_last_activity ON projects(last_activity_at);
```

#### project_files table
```sql
CREATE TABLE project_files (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    file_upload_id INTEGER REFERENCES file_uploads(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    added_by INTEGER REFERENCES users(id),
    CONSTRAINT unique_project_file UNIQUE(project_id, file_upload_id)
);

-- Indexes for project file associations
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_file_upload_id ON project_files(file_upload_id);
```

### Monitoring and Alerting Schema

#### monitoring_sessions table
```sql
CREATE TABLE monitoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    baseline_dinsight_id INTEGER REFERENCES dinsight_data(id),
    monitoring_file_id INTEGER REFERENCES file_uploads(id),
    session_name VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
    thresholds JSONB NOT NULL,
    alert_settings JSONB,
    total_records INTEGER DEFAULT 0,
    anomaly_count INTEGER DEFAULT 0,
    last_anomaly_at TIMESTAMP,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for monitoring sessions
CREATE INDEX idx_monitoring_sessions_user_id ON monitoring_sessions(user_id);
CREATE INDEX idx_monitoring_sessions_baseline ON monitoring_sessions(baseline_dinsight_id);
CREATE INDEX idx_monitoring_sessions_status ON monitoring_sessions(status);
CREATE INDEX idx_monitoring_sessions_active ON monitoring_sessions(user_id, status) WHERE status = 'active';
```

#### alerts table
```sql
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    monitoring_session_id UUID REFERENCES monitoring_sessions(id) ON DELETE CASCADE,
    monitor_data_id INTEGER REFERENCES monitor_data(id),
    alert_type VARCHAR(50) NOT NULL CHECK (
        alert_type IN ('anomaly_detected', 'high_anomaly_rate', 'system_error', 'threshold_exceeded')
    ),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for alert management
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_session_id ON alerts(monitoring_session_id);
CREATE INDEX idx_alerts_type_severity ON alerts(alert_type, severity);
CREATE INDEX idx_alerts_unacknowledged ON alerts(user_id, acknowledged, created_at) WHERE acknowledged = FALSE;
CREATE INDEX idx_alerts_unresolved ON alerts(user_id, resolved, created_at) WHERE resolved = FALSE;
```

### Audit and Logging Schema

#### audit_logs table
```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit logging
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Partition by month for performance
CREATE TABLE audit_logs_y2025m08 PARTITION OF audit_logs 
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
```

#### system_logs table
```sql
CREATE TABLE system_logs (
    id BIGSERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
    message TEXT NOT NULL,
    component VARCHAR(100),
    metadata JSONB,
    trace_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for system logging
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_component ON system_logs(component);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_trace_id ON system_logs(trace_id);

-- Full-text search on log messages
CREATE INDEX idx_system_logs_message ON system_logs USING gin(to_tsvector('english', message));
```

## Database Triggers and Functions

### Automatic Timestamp Updates
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_configs_updated_at BEFORE UPDATE ON user_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_sessions_updated_at BEFORE UPDATE ON monitoring_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Project Statistics Updates
```sql
-- Function to update project statistics
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects 
    SET 
        file_count = (
            SELECT COUNT(*) 
            FROM project_files pf 
            JOIN file_uploads fu ON pf.file_upload_id = fu.id 
            WHERE pf.project_id = projects.id AND fu.deleted_at IS NULL
        ),
        total_size = (
            SELECT COALESCE(SUM(fu.file_size), 0)
            FROM project_files pf 
            JOIN file_uploads fu ON pf.file_upload_id = fu.id 
            WHERE pf.project_id = projects.id AND fu.deleted_at IS NULL
        ),
        last_activity_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_stats_on_file_change 
    AFTER INSERT OR UPDATE OR DELETE ON project_files
    FOR EACH ROW EXECUTE FUNCTION update_project_stats();
```

### Session Cleanup
```sql
-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-sessions', '0 */6 * * *', 'SELECT cleanup_expired_sessions();');
```

## Data Retention Policies

### Soft Delete Implementation
```sql
-- Add soft delete to tables that don't have it
ALTER TABLE processing_jobs ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE monitoring_sessions ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE alerts ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create indexes for soft delete
CREATE INDEX idx_processing_jobs_deleted_at ON processing_jobs(deleted_at);
CREATE INDEX idx_monitoring_sessions_deleted_at ON monitoring_sessions(deleted_at);
CREATE INDEX idx_alerts_deleted_at ON alerts(deleted_at);
```

### Archival Strategy
```sql
-- Archive old completed jobs (older than 1 year)
CREATE TABLE processing_jobs_archive (LIKE processing_jobs INCLUDING ALL);

-- Archive old audit logs (older than 2 years)
CREATE TABLE audit_logs_archive (LIKE audit_logs INCLUDING ALL);

-- Archive old system logs (older than 6 months)
CREATE TABLE system_logs_archive (LIKE system_logs INCLUDING ALL);
```

## Performance Optimization

### Materialized Views for Analytics
```sql
-- User activity summary
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT 
    u.id,
    u.email,
    COUNT(DISTINCT fu.id) as total_files,
    COUNT(DISTINCT pj.id) as total_jobs,
    COUNT(DISTINCT ms.id) as total_monitoring_sessions,
    MAX(fu.created_at) as last_file_upload,
    MAX(pj.created_at) as last_job_created,
    u.last_login_at,
    u.created_at as user_created_at
FROM users u
LEFT JOIN file_uploads fu ON u.id = fu.user_id AND fu.deleted_at IS NULL
LEFT JOIN processing_jobs pj ON u.id = pj.user_id AND pj.deleted_at IS NULL
LEFT JOIN monitoring_sessions ms ON u.id = ms.user_id AND ms.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.last_login_at, u.created_at;

CREATE UNIQUE INDEX idx_user_activity_summary_id ON user_activity_summary(id);
```

### Partitioning Strategy
```sql
-- Partition audit_logs by month
ALTER TABLE audit_logs PARTITION BY RANGE (created_at);

-- Create partitions for current and next few months
CREATE TABLE audit_logs_y2025m08 PARTITION OF audit_logs 
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE audit_logs_y2025m09 PARTITION OF audit_logs 
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Partition system_logs by month
ALTER TABLE system_logs PARTITION BY RANGE (created_at);

CREATE TABLE system_logs_y2025m08 PARTITION OF system_logs 
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
```

## Security Considerations

### Row Level Security (RLS)
```sql
-- Enable RLS on user-owned tables
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for user data access
CREATE POLICY user_file_uploads_policy ON file_uploads 
    FOR ALL TO application_role 
    USING (user_id = current_setting('app.current_user_id')::INTEGER);

CREATE POLICY user_processing_jobs_policy ON processing_jobs 
    FOR ALL TO application_role 
    USING (user_id = current_setting('app.current_user_id')::INTEGER);

CREATE POLICY user_configs_policy ON user_configs 
    FOR ALL TO application_role 
    USING (user_id = current_setting('app.current_user_id')::INTEGER OR is_public = TRUE);

-- Admin access policy
CREATE POLICY admin_full_access ON file_uploads 
    FOR ALL TO admin_role 
    USING (TRUE);
```

### Database Roles and Permissions
```sql
-- Create application roles
CREATE ROLE application_role;
CREATE ROLE admin_role;
CREATE ROLE readonly_role;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
```

## Migration Strategy

### Schema Migration Scripts
```sql
-- Migration script for existing data
-- 1. Add new columns with default values
-- 2. Populate new columns from existing data
-- 3. Add constraints and indexes
-- 4. Update application code
-- 5. Remove deprecated columns/tables

-- Example migration for user_id in file_uploads
BEGIN;

-- Add user_id column (nullable initially)
ALTER TABLE file_uploads ADD COLUMN user_id INTEGER;

-- Create a default user for existing data (or assign to admin)
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
VALUES ('system@dinsight.com', 'placeholder', 'System', 'User', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Update existing file_uploads with system user
UPDATE file_uploads 
SET user_id = (SELECT id FROM users WHERE email = 'system@dinsight.com')
WHERE user_id IS NULL;

-- Make user_id NOT NULL and add foreign key
ALTER TABLE file_uploads 
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT fk_file_uploads_user_id FOREIGN KEY (user_id) REFERENCES users(id);

-- Add index
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);

COMMIT;
```

## Backup and Recovery

### Backup Strategy
```sql
-- Full backup command (to be run from shell)
-- pg_dump -h localhost -U postgres -d dinsight_prod -f dinsight_backup_$(date +%Y%m%d_%H%M%S).sql

-- Point-in-time recovery setup
-- Enable WAL archiving in postgresql.conf:
-- wal_level = replica
-- archive_mode = on
-- archive_command = 'cp %p /backup/wal_archive/%f'

-- Backup verification query
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Recovery Procedures
```sql
-- Check database integrity
SELECT pg_database_size('dinsight_prod');
VACUUM ANALYZE;

-- Rebuild indexes if needed
REINDEX DATABASE dinsight_prod;

-- Update statistics
ANALYZE;
```

---

*This database schema specification provides a comprehensive foundation for the Dinsight platform, ensuring scalability, security, and maintainability while supporting all required features.*
