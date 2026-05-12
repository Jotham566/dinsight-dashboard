-- Database Reset Script for D'insight Dashboard
-- This script resets all data and restarts auto-increment sequences from 1

-- WARNING: This will delete ALL data in the database!
-- Make sure you have backups if needed.

-- Drop tables in reverse dependency order to avoid foreign key constraints
DROP TABLE IF EXISTS data_validation_results CASCADE;
DROP TABLE IF EXISTS data_validation_rules CASCADE;
DROP TABLE IF EXISTS data_lineage CASCADE;
DROP TABLE IF EXISTS dataset_metadata CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS anomaly_classifications CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS analyses CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS user_organizations CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS monitor_data CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS feature_data CASCADE;
DROP TABLE IF EXISTS dinsight_data CASCADE;
DROP TABLE IF EXISTS config_data CASCADE;
DROP TABLE IF EXISTS file_uploads CASCADE;

-- Re-run migrations to recreate all tables
-- This will be handled by the Go application when it starts up