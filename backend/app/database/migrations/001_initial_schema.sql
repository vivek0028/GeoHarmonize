-- ====================================================================
-- GeoHarmonize PostgreSQL + PostGIS Schema Migration
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'GIS_ANALYST', -- ADMIN, GIS_ANALYST, VIEWER
    department VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Datasets Table
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- cadastral, survey, buildings, points
    file_path TEXT NOT NULL,
    file_format VARCHAR(50) NOT NULL, -- GeoJSON, Shapefile, CSV, GeoTIFF
    crs VARCHAR(50) DEFAULT 'EPSG:4326',
    feature_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ready', -- uploaded, validating, processed, error
    uploaded_by INT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Parcels Table (PostGIS Geometry)
CREATE TABLE IF NOT EXISTS parcels (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(100) NOT NULL,
    geometry GEOMETRY(Polygon, 4326),
    area NUMERIC(10, 2),
    land_use VARCHAR(100),
    owner_name VARCHAR(255),
    source_dataset_id INT REFERENCES datasets(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    confidence_score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_parcels_geom ON parcels USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_parcels_pid ON parcels(parcel_id);

-- 4. Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    building_id VARCHAR(100) NOT NULL,
    geometry GEOMETRY(Polygon, 4326),
    area NUMERIC(10, 2),
    building_type VARCHAR(100),
    parcel_ref VARCHAR(100),
    source_dataset_id INT REFERENCES datasets(id) ON DELETE CASCADE,
    confidence_score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_buildings_geom ON buildings USING GIST(geometry);

-- 5. Survey Points Table
CREATE TABLE IF NOT EXISTS survey_points (
    id SERIAL PRIMARY KEY,
    point_code VARCHAR(100) NOT NULL,
    geometry GEOMETRY(Point, 4326),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy NUMERIC(6, 3), -- in meters e.g. 0.015m
    source VARCHAR(255),
    survey_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_survey_points_geom ON survey_points USING GIST(geometry);

-- 6. Feature Matches Table (AI Spatial Conflation)
CREATE TABLE IF NOT EXISTS feature_matches (
    id SERIAL PRIMARY KEY,
    source_feature_id VARCHAR(100) NOT NULL,
    target_feature_id VARCHAR(100) NOT NULL,
    source_dataset_id INT REFERENCES datasets(id),
    target_dataset_id INT REFERENCES datasets(id),
    spatial_similarity NUMERIC(5, 2) NOT NULL, -- e.g. 94.00%
    area_similarity NUMERIC(5, 2) NOT NULL,    -- e.g. 91.00%
    shape_similarity NUMERIC(5, 2) NOT NULL,   -- e.g. 96.00%
    match_score NUMERIC(5, 2) NOT NULL,        -- e.g. 94.00%
    status VARCHAR(50) DEFAULT 'matched',      -- matched, review_needed, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Conflicts Table
CREATE TABLE IF NOT EXISTS conflicts (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL, -- AREA_MISMATCH, BOUNDARY_MISMATCH, LAND_USE_MISMATCH, TOPOLOGY_ERROR, SOURCE_CONFLICT
    attribute VARCHAR(100) NOT NULL,
    source_a VARCHAR(255) NOT NULL,
    value_a TEXT NOT NULL,
    source_b VARCHAR(255) NOT NULL,
    value_b TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, RESOLVED, DEFERRED
    resolution TEXT,
    resolved_by INT REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conflicts_pid ON conflicts(parcel_id);

-- 8. Integrated Records (Harmonized Truth)
CREATE TABLE IF NOT EXISTS integrated_records (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(100) UNIQUE NOT NULL,
    geometry GEOMETRY(Polygon, 4326),
    area NUMERIC(10, 2) NOT NULL,
    land_use VARCHAR(100) NOT NULL,
    owner_name VARCHAR(255),
    building_count INT DEFAULT 0,
    survey_status VARCHAR(50) DEFAULT 'reconciled',
    confidence_score NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'APPROVED', -- PENDING_REVIEW, REVIEWED, APPROVED
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_integrated_geom ON integrated_records USING GIST(geometry);

-- 9. Processing Jobs Table
CREATE TABLE IF NOT EXISTS processing_jobs (
    id SERIAL PRIMARY KEY,
    dataset_id INT REFERENCES datasets(id),
    job_type VARCHAR(100) NOT NULL, -- VALIDATION, HARMONIZATION, MATCHING, TOPOLOGY, CONFIDENCE, CHANGE_DETECTION
    status VARCHAR(50) DEFAULT 'completed', -- queued, running, completed, failed
    progress INT DEFAULT 100,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
