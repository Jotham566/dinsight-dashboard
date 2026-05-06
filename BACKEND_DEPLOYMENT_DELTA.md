# Backend Deployment Delta

This document captures the changes between:

- Deployed/original backend: `/Users/jothamwambi/Projects/Dinsight_API_Original`
- Enhanced/local backend: `/Users/jothamwambi/Projects/dinsight-dashboard/Dinsight_API`

It is intended to be shared with the backend/infrastructure team so they can deploy the correct backend version before dashboard cutover.

## Executive Summary

The enhanced local backend is not a small patch over the deployed original. It is a materially newer backend contract with:

- a new authentication, refresh-token, and session-management layer
- new user profile and live-monitor preference persistence
- a different upload and monitoring processing contract
- additional dataset discovery and metadata payloads required by the dashboard
- new streaming, deterioration, anomaly detection, and alerting APIs
- a significantly expanded database schema
- baseline and monitoring pipeline changes that affect algorithm behavior, memory usage, and runtime characteristics

### Version Comparison

- Deployed/original backend commit: `94d8c80a58768a80598ac46369951b60f14f4389`
  - Date: `2025-07-30 14:58:44 +0900`
  - Subject: `Added Swagger`
- Enhanced/local backend commit: `bf731d6518f9c8dfaf3dc276574310cfd69342b5`
  - Date: `2026-02-26 00:33:55 +0300`
  - Subject: `feat(api): merge user preference updates and expose dinsight id listing`

## Why The Original Backend Cannot Support The Current Dashboard

If the original backend remains deployed, the current dashboard will break in the following areas:

- login, refresh, logout, forgot-password, reset-password, user profile, session management
- baseline upload polling, because `/analyze/:id/status` does not exist there
- monitoring upload, because the dashboard now expects an async upload ID, while the original backend returns monitoring results directly
- dataset discovery, because `/dinsight` list and `file_upload_id` fallback lookup do not exist there
- live monitoring, because streaming status/reset endpoints do not exist there
- health insights, because deterioration and anomaly endpoints do not exist there
- persisted dashboard/user preferences, because live-monitor preference endpoints and storage do not exist there

## High-Level Change Inventory

### New Files Added In The Enhanced Backend

#### New command/utilities

- `cmd/backfill-point-metadata/main.go`
- `cmd/reset-db/main.go`

#### New handlers

- `internal/handler/auth.go`
- `internal/handler/user.go`
- `internal/handler/session.go`
- `internal/handler/live_monitor_preferences.go`
- `internal/handler/streaming.go`
- `internal/handler/deterioration.go`
- `internal/handler/anomaly.go`
- `internal/handler/alert.go`
- `internal/handler/dataset_metadata.go`
- `internal/handler/data_lineage.go`
- `internal/handler/data_validation.go`
- `internal/handler/dataset_compatibility.go`
- `internal/handler/example_dataset.go`

#### New middleware/services/support

- `internal/middleware/auth.go`
- `internal/service/deterioration/service.go`
- `internal/database/init_test_data.go`

### Core Files Modified

- `cmd/api/main.go`
- `internal/routes/routes.go`
- `internal/model/models.go`
- `internal/database/migrations.go`
- `internal/handler/upload.go`
- `internal/handler/dinsight.go`
- `internal/handler/feature.go`
- `internal/handler/monitor.go`
- `internal/processor/processor.go`
- `internal/processor/functions.go`
- `internal/dinsightmon/monitor.go`
- `internal/dinsightmon/funcLib/funcLib.go`
- `pkg/response/error.go`

## Detailed Change Log

### 1. Routing And API Surface

The deployed/original backend exposes only:

- `POST /api/v1/analyze`
- `POST /api/v1/config`
- `GET /api/v1/config`
- `GET /api/v1/dinsight/:id`
- `GET /api/v1/feature/:file_upload_id`
- `GET /api/v1/feature/:file_upload_id/range`
- `POST /api/v1/monitor/:dinsight_id`
- `GET /api/v1/monitor/:dinsight_id`
- `GET /api/v1/monitor/:dinsight_id/coordinates`
- `GET /health`

The enhanced/local backend adds or changes:

#### Public auth routes

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

#### Protected analysis/operations routes

- `GET /api/v1/analyze/:id/status`
- `GET /api/v1/dinsight`
- `GET /api/v1/monitor/available`
- `GET /api/v1/monitor/baseline/:baseline_id`
- `GET /api/v1/deterioration/:dinsight_id/metadata`
- `POST /api/v1/deterioration/:dinsight_id/analyze`
- `GET /api/v1/streaming/:baseline_id/status`
- `GET /api/v1/streaming/:baseline_id/latest`
- `PUT /api/v1/streaming/:baseline_id/config`
- `DELETE /api/v1/streaming/:baseline_id/reset`

#### JWT-authenticated user/data-management routes

- `GET /api/v1/users/profile`
- `PUT /api/v1/users/profile`
- `POST /api/v1/users/change-password`
- `GET /api/v1/users/sessions`
- `DELETE /api/v1/users/sessions/:sessionId`
- `DELETE /api/v1/users/sessions`
- `GET /api/v1/users/live-monitor-preferences`
- `PUT /api/v1/users/live-monitor-preferences`
- `POST /api/v1/anomaly/detect`
- `POST /api/v1/anomaly/detect-with-storage`
- `GET /api/v1/anomaly/threshold/:dataset_id`
- `POST /api/v1/alerts/rules`
- `GET /api/v1/alerts/rules`
- `PUT /api/v1/alerts/rules/:id`
- `DELETE /api/v1/alerts/rules/:id`
- `GET /api/v1/alerts`
- `POST /api/v1/alerts/:id/acknowledge`
- `POST /api/v1/alerts/:id/resolve`
- `POST /api/v1/datasets/metadata`
- `GET /api/v1/datasets/:dataset_id/metadata`
- `PUT /api/v1/datasets/:dataset_id/metadata`
- `GET /api/v1/datasets/metadata`
- `POST /api/v1/data-lineage`
- `GET /api/v1/datasets/:dataset_id/lineage`
- `GET /api/v1/datasets/:dataset_id/lineage/impact`
- `GET /api/v1/data-lineage`
- `POST /api/v1/data-validation/rules`
- `POST /api/v1/data-validation/validate`
- `GET /api/v1/data-validation/rules`
- `GET /api/v1/datasets/:dataset_id/validation-results`
- `POST /api/v1/datasets/compatibility/check`
- `GET /api/v1/datasets/:dataset_id/compatible`
- `GET /api/v1/example-datasets/types`
- `POST /api/v1/example-datasets/load`
- `GET /api/v1/example-datasets`

### 2. CORS And Request Handling

The original backend uses permissive wildcard CORS but only allows:

- `Access-Control-Allow-Origin: *`
- methods: `POST, GET, OPTIONS`
- headers: `Content-Type`

This is not sufficient for the current dashboard because browser requests now send `Authorization: Bearer ...`.

The enhanced backend changes CORS to:

- allow specific frontend origins
- allow `Authorization`
- allow credentials
- expose `Authorization`
- allow `PUT`, `DELETE`, and `OPTIONS`

Important deployment note:

- the enhanced backend currently only whitelists `http://localhost:3000` and `http://127.0.0.1:3000`
- production/staging frontend origins still need to be added before deployment

### 3. Authentication, Sessions, And User Management

The entire auth layer is new in the enhanced backend.

#### User registration

- email + password + full name registration
- email validation
- password strength validation
- bcrypt password hashing
- normalized lowercase email storage
- default user role assignment

#### Login

- returns:
  - `access_token`
  - `refresh_token`
  - `expires_in`
  - `user`
- updates `last_login`
- supports `remember_me`

#### Refresh tokens

- refresh tokens are generated separately from access tokens
- refresh tokens are stored as bcrypt hashes, not plaintext
- default refresh expiry is `7 days`
- `remember_me` refresh expiry is `30 days`

#### Logout

- logout invalidates all refresh tokens for the authenticated user

#### Forgot/reset password

- password reset tokens are stored in the database
- reset flow invalidates all refresh tokens after password change

#### User profile

- get current profile
- update email/full name
- reset `email_verified` when email changes
- change password with current-password verification

#### Session management

- session records are created on login
- session metadata includes device, browser, IP, location, last activity, expiry
- users can list sessions
- users can revoke a single session
- users can revoke all other sessions

#### Important auth caveats

- JWT secret is still hardcoded in code and must be externalized before serious production use
- forgot-password currently returns the reset token in the response for testing; that should be removed once email delivery is implemented
- refresh-token validation currently scans active hashed tokens and bcrypt-compares them; it is correct functionally but not ideal at large scale
- current-session detection is heuristic and uses the most recently created valid refresh token for the user

### 4. Upload Processing Contract Changes

The upload contract changed significantly.

#### Original behavior

- baseline upload returned an upload ID
- processing happened asynchronously
- but there was no public status route for the frontend to poll

#### Enhanced behavior

- added `GET /analyze/:id/status`
- `file_uploads` now carry:
  - `status`
  - `error_message`
  - `progress`
  - `status_message`

This enables the current dashboard workflow:

- upload baseline
- poll progress/status
- wait for completion
- fetch resolved DInsight coordinates

#### Size/runtime changes

- upload file size cap increased from `100MB` to `1GB`
- Gin multipart memory increased to `2.5GB`

### 5. Baseline Processing Pipeline Changes

The baseline processing code in `internal/processor/processor.go` was materially changed.

#### Functional/output changes

- baseline processing now stores `point_metadata` directly on `dinsight_data`
- baseline processing now stores `min_dij` and `max_dij` on `dinsight_data`
- feature metadata is now preserved from actual CSV metadata columns instead of only storing a simple `segID`
- `DinsightData` now carries enough information for later metadata-aware UI and monitoring normalization

#### Processing/runtime changes

- added phase-based progress updates:
  - distance matrix
  - normalization
  - optimization
  - final save
- added line counting for pre-allocation before CSV ingest
- added memory-release steps between major phases
- added explicit garbage collection for large jobs
- switched large `feature_data` inserts to batched writes to avoid PostgreSQL message-size issues

#### Algorithm/storage nuance

- the processor now persists the baseline distance scale (`min_dij`, `max_dij`) so the monitoring pipeline can reuse the same baseline reference scale later
- this is important because monitoring no longer needs to rely on a hardcoded or ad hoc normalization scale

### 6. DInsight Dataset Discovery And Payload Changes

#### New list endpoint

- `GET /dinsight` returns all available DInsight dataset IDs

#### `GET /dinsight/:id` changes

The enhanced handler can now resolve:

- a real `dinsight_data.id`
- the originating `file_upload_id`

It also returns:

- `dinsight_id`
- `dinsight_x`
- `dinsight_y`
- `point_metadata`

This is important because the current frontend uses the upload ID first and then resolves to the real DInsight dataset ID after processing.

### 7. Feature Endpoint Changes

The enhanced `GET /feature/:file_upload_id` now returns:

- `feature_values`
- `total_rows`
- `metadata`

Metadata is normalized so the frontend has stable labels even when source metadata is incomplete.

This is a compatibility improvement over the original backend, which returned feature values only.

### 8. Monitoring Upload Contract Changes

The monitoring flow changed from synchronous to asynchronous.

#### Original behavior

- `POST /monitor/:dinsight_id` processed immediately
- returned final monitoring data directly

#### Enhanced behavior

- `POST /monitor/:dinsight_id` creates a `file_uploads` record
- saves the monitoring file
- processes it asynchronously
- returns a monitoring upload ID
- monitoring progress is surfaced through the shared `/analyze/:id/status` endpoint

This aligns monitoring with the dashboard’s upload workflow and large-file UX.

### 9. Monitoring Algorithm And Runtime Changes

The monitoring pipeline in `internal/dinsightmon/monitor.go` and `internal/dinsightmon/funcLib/funcLib.go` has substantial behavior changes.

#### 9.1 Reference data loading changes

- fetches only needed fields from `monitor_data` and `feature_data`
- orders previous monitoring rows by `process_order`
- pre-allocates baseline/reference structures

#### 9.2 CSV parsing changes

- streaming CSV parsing instead of `ReadAll`
- `csv.Reader.ReuseRecord = true` to reduce allocations
- pre-allocated slices/maps for vectors, metadata, and duplicate detection
- duplicate-key generation optimized via `strings.Builder`

#### 9.3 Normalization and distance-scale changes

This is one of the most important algorithm changes.

##### Original monitoring normalization

- used a hardcoded `maxDij := 10.91`
- recomputed `minDij` dynamically from the current monitoring-to-reference distances
- normalized using:

`(distance - minDij) / (5*maxDij - minDij)`

##### Enhanced monitoring normalization

- first tries to reuse `dinsightData.MinDij` and `dinsightData.MaxDij` persisted during baseline processing
- if they are absent, falls back to a legacy dynamic mode and logs a warning
- normalizes using:

`(distance - localMinDij) / (localMaxDij - localMinDij)`

This is a real algorithm/behavior change, not just a performance refactor.

Implications:

- monitoring is now tied more consistently to the baseline’s stored distance scale
- the hardcoded `10.91` assumption is removed
- legacy baselines without stored `min_dij` and `max_dij` still work via fallback mode

#### 9.4 Reference-set growth changes

The original implementation effectively kept adding monitoring vectors into the reference set as processing continued.

The enhanced implementation changes this for large files:

- small/normal files: still update frequently
- larger files: only add every Nth monitoring vector to the reference set

Purpose:

- control memory growth
- avoid unbounded expansion of the reference set
- keep monitoring viable on large uploads

This does mean the convergence/reference-update behavior for large files is no longer exactly the same as the original implementation.

#### 9.5 Memory and batch-write changes

- reusable buffers introduced for repeated per-vector calculations
- periodic garbage collection during large monitoring runs
- deep cleanup via `debug.FreeOSMemory()` at intervals
- batch insertion of `monitor_data` instead of one raw SQL insert per record
- only the first `MonitorData` record is kept in-memory for API return purposes

#### 9.6 Metadata changes in monitoring results

Original monitoring metadata looked like:

- `{ "segID": ..., "meta": ... }`

Enhanced monitoring metadata now mirrors original CSV metadata columns as a flat JSON object when possible.

This improves downstream use for:

- deterioration analysis
- chart labels
- interval grouping
- operator-facing context

#### 9.7 Progress reporting

Monitoring now publishes phase-based progress and status messages across the whole run:

- loading baseline reference data
- parsing monitoring file
- processing vectors
- final completion

### 10. Streaming / Live Monitoring Layer

The enhanced backend adds a streaming support layer:

- `GET /streaming/:baseline_id/status`
- `GET /streaming/:baseline_id/latest`
- `PUT /streaming/:baseline_id/config`
- `DELETE /streaming/:baseline_id/reset`

Capabilities added:

- infer streaming state from monitoring data activity
- expose total points, streamed points, percent progress, baseline points
- persist streaming config:
  - `latest_glow_count`
  - `batch_size`
  - `delay_seconds`
- reset monitoring rows for a baseline for testing/replay

Important nuance:

- the streaming implementation is currently heuristic/polling-oriented
- it does not yet maintain a dedicated `streaming_sessions` table
- “active streaming” is inferred from recently written monitoring rows

### 11. Deterioration Analytics Layer

The enhanced backend adds a dedicated deterioration analysis service and handler.

New capabilities:

- list available metadata columns from baseline + monitoring data
- group coordinates by metadata-derived intervals
- support baseline-cluster selection:
  - explicit values
  - range-based selection
- optionally include monitoring data
- infer metadata value kind:
  - string
  - numeric
  - timestamp
- sort intervals chronologically/semantically
- compute:
  - baseline gravity center (`G0`)
  - per-interval centroids
  - distance-from-`G0`
  - distance-from-previous interval
  - summary stats

Important nuance:

- metadata column discovery only scans a limited monitoring subset for performance
- this layer depends heavily on the richer metadata now preserved in baseline and monitoring records

### 12. Anomaly Detection Layer

The enhanced backend adds a Mahalanobis-distance anomaly detection layer.

New capabilities:

- `POST /anomaly/detect`
- `POST /anomaly/detect-with-storage`
- `GET /anomaly/threshold/:dataset_id`

Algorithmic/behavioral details:

- uses Mahalanobis-distance-based anomaly detection
- fixed-seed internal RNG for reproducibility of internal randomized helper routines
- computes:
  - anomaly threshold
  - anomaly count and percentage
  - centroids
  - centroid separation
  - statistical summaries
- includes helper methods for:
  - empirical thresholds
  - covariance regularization
  - robust subset handling
  - adaptive contamination estimates
  - non-Gaussianity assessment

Important nuance:

- `/anomaly/detect` is oriented toward baseline-vs-monitoring analysis for a given baseline dataset
- `/anomaly/detect-with-storage` supports dataset-to-dataset analysis with persistence

### 13. Alerts Layer

The enhanced backend adds alerting on top of anomaly detection.

New capabilities:

- create/update/delete alert rules
- list alert rules
- list alerts
- acknowledge alerts
- resolve alerts
- optionally generate alerts from anomaly-classification results

Stored concepts added:

- alert rules
- active/resolved alerts
- severity mapping
- notification configuration
- acknowledgment/resolution timestamps and users

### 14. Dataset Governance And Support Modules

The enhanced backend also adds several platform/data-management modules not present in the original deployment.

#### Dataset metadata

- create/read/update metadata
- data quality metrics
- numeric summaries
- distribution info
- source-hash generation
- access tracking

#### Data lineage

- create lineage links
- query dataset lineage
- build upstream/downstream lineage trees
- impact analysis

#### Data validation

- validation rules
- validation execution
- validation results
- dataset validation status

#### Dataset compatibility

- compatibility checks between datasets
- quality/size/distribution/range/stage compatibility
- compatibility recommendations

#### Example datasets

- list example dataset types
- load generated example datasets
- generate normal/anomalous/mixed/time-series sample data

These modules are not required for the minimum dashboard login/upload flow, but they are part of the enhanced backend and must be considered part of the deployment delta.

### 15. Data Model And Migration Changes

#### Columns added to existing tables

##### `file_uploads`

- `progress`
- `status_message`

##### `dinsight_data`

- `point_metadata`
- `min_dij`
- `max_dij`

#### New tables

- `streaming_configs`
- `users`
- `analyses`
- `refresh_tokens`
- `password_reset_tokens`
- `user_sessions`
- `user_live_monitor_preferences`
- `anomaly_classifications`
- `alert_rules`
- `alerts`
- `dataset_metadata`
- `data_lineage`
- `data_validation_rules`
- `data_validation_results`

#### Model additions

New structs added:

- `StreamingConfig`
- `User`
- `Analysis`
- `RefreshToken`
- `UserSession`
- `UserLiveMonitorPreference`
- `PasswordResetToken`
- `AnomalyClassification`
- `Alert`
- `AlertRule`
- `DatasetMetadata`
- `DataLineage`
- `DataValidationRule`
- `DataValidationResult`

### 16. Response Shape Changes

The enhanced backend adds a standardized `response.Error(...)` helper that returns:

- `error.code`
- `error.message`
- optional `error.details`

This is now used across the auth and user-management surfaces and aligns better with the current frontend error handling.

### 17. Operational / CLI Changes

#### `cmd/api/main.go`

Changes:

- fixed server start on `:8080`
- no CLI port flag anymore
- multipart memory explicitly increased to `2.5GB`

Important nuance:

- the original backend registered a public `/health` route
- the enhanced route setup currently does not register that route, even though `internal/handler/health.go` still exists
- if infrastructure/load balancers rely on `/health`, this should be addressed during deployment

#### Backfill tool

`cmd/backfill-point-metadata/main.go` was added to populate `dinsight_data.point_metadata` for already-existing baselines using `feature_data`.

This is useful if:

- old datasets already exist in the target database
- you want new metadata-driven frontend behavior without reprocessing every baseline

#### Reset-db tool

`cmd/reset-db/main.go` was added for development resets:

- drops tables
- reruns migrations
- initializes test data
- initializes default config

#### Test data initializer

`internal/database/init_test_data.go` seeds:

- `admin@disum.com`
- password: `DInsight123!`

This is useful for development/testing but should not be treated as a production seed strategy.

## Known Caveats / Things To Be Aware Of

These are not reasons to avoid deployment, but the team should know them:

- CORS still needs production frontend origins configured
- JWT secret is still hardcoded
- forgot-password still returns the reset token in the response for testing
- `/health` is no longer publicly wired in routing
- analysis and monitoring routes remain license-protected but are not yet JWT-protected
- some legacy organization/machine references still appear in auxiliary code, request shapes, or reset tooling, even though the active auth model is now user-centric
- session tracking and current-session detection are functional but simplified
- streaming state is inferred heuristically from recent writes, not a dedicated streaming session model

## Deployment Requirements

The backend team should deploy the enhanced/local backend, not the original one.

### Required deployment actions

1. Deploy the code from:
   - `/Users/jothamwambi/Projects/dinsight-dashboard/Dinsight_API`

2. Run the enhanced migrations so the target database includes:
   - new auth/session tables
   - new streaming/dataset-governance tables
   - new `file_uploads` and `dinsight_data` columns

3. If existing baselines already exist in the target database:
   - run `cmd/backfill-point-metadata/main.go`

4. Update backend CORS to allow:
   - production dashboard domain
   - staging domain if applicable

5. Externalize and configure:
   - JWT secret
   - any production mail/reset settings once email is implemented

6. Decide what to do about `/health`:
   - restore it in routes, or
   - update infrastructure checks

7. Confirm the deployed environment supports:
   - larger multipart uploads
   - long-running processing
   - large CSV baselines/monitoring files

8. Seed or create at least one real test user for integration validation.

### Recommended validation after deployment

- register/login/refresh/logout
- get/update profile
- list/revoke sessions
- baseline upload and status polling
- monitoring upload and status polling
- `GET /dinsight`
- `GET /dinsight/:id`
- live-monitor preference save/load
- streaming status/reset
- deterioration metadata/analyze
- anomaly detect

## Bottom Line

The enhanced local backend is the backend the current dashboard was built against.

Deploying the original backend and trying to point the dashboard at it will lead to immediate integration failures. The correct path is to deploy the enhanced backend, run its migrations, and configure production-specific secrets/origins around that version.
